import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { handleLocalAiAgentChatStream } from '@/lib/ai-agent/local-handler';

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
        const message = err instanceof Error ? err.message : 'خطای نامشخص';
        write('error', { code: 'AGENT_ERROR', message });
      }
      controller.close();
    },
  });
}

function createLocalSseResponse(userId: string, dto: AiChatDto): Response {
  return new Response(createLocalSseStream(userId, dto), { headers: SSE_HEADERS });
}

export async function handleAiChatPost(request: NextRequest): Promise<Response> {
  const user = await getAuthUser(request);
  if (!user) {
    return Response.json({ error: 'ابتدا وارد شوید' }, { status: 401 });
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

  return createLocalSseResponse(user.id, dto);
}
