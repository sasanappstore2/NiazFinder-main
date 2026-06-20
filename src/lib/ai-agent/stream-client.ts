export type AiAgentStreamEventType =
  | 'fee_deducted'
  | 'token'
  | 'tool_start'
  | 'done'
  | 'error';

export interface AiAgentStreamEvent {
  type: AiAgentStreamEventType;
  data: Record<string, unknown>;
}

export async function* parseSseStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AiAgentStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventType: AiAgentStreamEventType | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const block of parts) {
      const lines = block.split('\n');
      eventType = null;
      let dataLine = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim() as AiAgentStreamEventType;
        } else if (line.startsWith('data:')) {
          dataLine = line.slice(5).trim();
        }
      }

      if (eventType && dataLine) {
        try {
          yield { type: eventType, data: JSON.parse(dataLine) as Record<string, unknown> };
        } catch {
          yield { type: 'error', data: { code: 'PARSE_ERROR', message: dataLine } };
        }
      }
    }
  }
}

export async function streamAiAgentChat(params: {
  conversationId: string;
  content: string;
  clientTempId: string;
  replyToId?: string;
  authToken: string;
  onEvent: (event: AiAgentStreamEvent) => void;
}): Promise<void> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${params.authToken}`,
    },
    body: JSON.stringify({
      conversationId: params.conversationId,
      content: params.content,
      clientTempId: params.clientTempId,
      replyToId: params.replyToId,
    }),
  });

  const contentType = res.headers.get('content-type') ?? '';

  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const body = await res.json().catch(() => ({}));
      params.onEvent({
        type: 'error',
        data: {
          code: body.code ?? 'HTTP_ERROR',
          message: body.error ?? body.message ?? `HTTP ${res.status}`,
        },
      });
      return;
    }

    if (contentType.includes('text/event-stream') && res.body) {
      for await (const event of parseSseStream(res.body)) {
        params.onEvent(event);
      }
      return;
    }

    const text = await res.text().catch(() => '');
    params.onEvent({
      type: 'error',
      data: {
        code: 'HTTP_ERROR',
        message: text.trim().slice(0, 200) || `???? ???? (${res.status})`,
      },
    });
    return;
  }

  if (!res.body) {
    params.onEvent({ type: 'error', data: { code: 'NO_BODY', message: '????? ?????? ???' } });
    return;
  }

  for await (const event of parseSseStream(res.body)) {
    params.onEvent(event);
  }
}
