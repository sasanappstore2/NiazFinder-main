import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getNestAiChatUrl } from '@/lib/ai-agent/env';
import { handleLocalAiAgentChatStream } from '@/lib/ai-agent/local-handler';
import { isLocalLlmOnly } from '@/lib/local-llm/config';

type AiChatDto = {
  conversationId: string;
  content: string;
  clientTempId: string;
  replyToId?: string;
};

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
} as const;

function sseErrorStream(code: string, message: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const payload = `event: error\ndata: ${JSON.stringify({ code, message })}\n\n`;
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    },
  });
}

function sseErrorResponse(code: string, message: string, status = 200): Response {
  return new Response(sseErrorStream(code, message), { status, headers: SSE_HEADERS });
}

function createLocalSseStream(userId: string, dto: AiChatDto): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const write = (type: string, data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const event of handleLocalAiAgentChatStream(userId, dto)) {
          write(event.type, event.data);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '???? ????';
        write('error', { code: 'AGENT_ERROR', message });
      }
      controller.close();
    },
  });
}

function createLocalSseResponse(userId: string, dto: AiChatDto): Response {
  return new Response(createLocalSseStream(userId, dto), { headers: SSE_HEADERS });
}

function nestFallbackEnabled(): boolean {
  return process.env.AI_AGENT_NEST_FALLBACK !== 'false';
}

async function proxyNestChat(
  nestUrl: string,
  auth: string,
  bodyText: string,
): Promise<Response | null> {
  const timeoutMs = Number(process.env.NEST_PROXY_TIMEOUT_MS ?? 8000);
  const nestRes = await fetch(nestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: auth,
    },
    body: bodyText,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const contentType = nestRes.headers.get('content-type') ?? '';

  if (nestRes.ok && nestRes.body) {
    return new Response(nestRes.body, {
      status: nestRes.status,
      headers: SSE_HEADERS,
    });
  }

  if (contentType.includes('application/json')) {
    const errBody = (await nestRes.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
      message?: string;
    };
    return sseErrorResponse(
      errBody.code ?? 'NEST_ERROR',
      errBody.message ?? errBody.error ?? `???? ???? (${nestRes.status})`,
    );
  }

  if (contentType.includes('text/event-stream') && nestRes.body) {
    return new Response(nestRes.body, { status: nestRes.status, headers: SSE_HEADERS });
  }

  return null;
}

export async function handleAiChatPost(request: NextRequest): Promise<Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: '????? ???? ????' }, { status: 401 });
  }

  const bodyText = await request.text();
  let dto: AiChatDto;
  try {
    dto = JSON.parse(bodyText) as AiChatDto;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!dto.conversationId?.trim() || !dto.clientTempId?.trim()) {
    return Response.json({ error: 'conversationId and clientTempId are required' }, { status: 400 });
  }

  const nestUrl = getNestAiChatUrl();
  // Local-only mode: never wait on legacy Nest (:4000) — go straight to LM Studio / local agent.
  if (!nestUrl || isLocalLlmOnly() || process.env.AI_AGENT_SKIP_NEST === 'true') {
    return createLocalSseResponse(user.id, dto);
  }

  const auth = request.headers.get('authorization') ?? '';
  try {
    const proxied = await proxyNestChat(nestUrl, auth, bodyText);
    if (proxied) return proxied;
  } catch (err) {
    if (!nestFallbackEnabled()) {
      const message =
        err instanceof Error ? err.message : '????? ?????? ?? ????? ????';
      return sseErrorResponse('NEST_UNREACHABLE', message);
    }
    console.warn('[ai/chat] Nest unreachable, using local handler:', err);
  }

  if (nestFallbackEnabled()) {
    console.warn('[ai/chat] Nest returned an error, falling back to local handler');
    return createLocalSseResponse(user.id, dto);
  }

  return sseErrorResponse('NEST_ERROR', '????? ?????? ?? ????? ????');
}
