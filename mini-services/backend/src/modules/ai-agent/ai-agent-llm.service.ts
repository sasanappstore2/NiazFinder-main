import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { AI_AGENT_TOOLS } from './ai-agent-tools.schema';
import { Gemma4AgentClient } from './gemma4-agent.client';
import type { LlmChatMessage, LlmCompletionResult, LlmToolCall } from './ai-agent.types';

export type LlmStreamEvent =
  | { kind: 'token'; delta: string }
  | { kind: 'complete'; result: LlmCompletionResult };

@Injectable()
export class AiAgentLlmService {
  private readonly logger = new Logger(AiAgentLlmService.name);

  constructor(private readonly gemma4: Gemma4AgentClient) {}

  isEnabled(): boolean {
    return process.env.AI_AGENT_ENABLED === 'true';
  }

  private isLocalLlmOnly(): boolean {
    return process.env.LOCAL_LLM_ONLY !== 'false';
  }

  private useMock(): boolean {
    if (this.isLocalLlmOnly()) return false;
    if (this.gemma4.isGemma4Provider()) return false;
    return !process.env.AGENT_LLM_API_KEY?.trim();
  }

  private baseUrl(): string {
    return (process.env.AGENT_LLM_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  private model(): string {
    return process.env.AGENT_LLM_MODEL ?? 'gpt-4o-mini';
  }

  private maxTokens(): number {
    return Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800);
  }

  private timeoutMs(): number {
    return Number(process.env.AI_REQUEST_TIMEOUT_MS ?? 45000);
  }

  async *chatRoundStream(messages: LlmChatMessage[]): AsyncGenerator<LlmStreamEvent> {
    if (this.isLocalLlmOnly() || this.gemma4.isGemma4Provider()) {
      const system = messages.find((m) => m.role === 'system')?.content ?? '';
      const rest = messages.filter((m) => m.role !== 'system');
      const result = await this.gemma4.chatRound(system, rest);
      for await (const evt of this.gemma4.streamText(result.text)) {
        yield evt;
      }
      yield { kind: 'complete', result };
      return;
    }

    if (this.useMock()) {
      yield* this.mockStream(messages);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());

    try {
      const res = await fetch(`${this.baseUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AGENT_LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.model(),
          messages,
          tools: AI_AGENT_TOOLS,
          tool_choice: 'auto',
          stream: true,
          max_tokens: this.maxTokens(),
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        this.logger.error(`LLM HTTP ${res.status}: ${errText.slice(0, 300)}`);
        throw new ServiceUnavailableException('AI service unavailable');
      }

      if (!res.body) {
        throw new ServiceUnavailableException('AI stream unavailable');
      }

      yield* this.parseOpenAiStreamGen(res.body);
    } finally {
      clearTimeout(timer);
    }
  }

  private async *mockStream(messages: LlmChatMessage[]): AsyncGenerator<LlmStreamEvent> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const userText = lastUser?.content ?? '';
    const reply =
      userText.includes('???') || userText.includes('wallet')
        ? '???? ?????? ?????? ??? ??? ?? ??????? ?????. ?? ??? ?????? ?????????? ????.'
        : '????! ?? ?????? ?????? ?????????? ????. ???? ???????? ?? ??? ???? ?? ??????? ?? ?????? ?????? ????';

    for (const ch of reply) {
      yield { kind: 'token', delta: ch };
      await new Promise((r) => setTimeout(r, 8));
    }
    yield { kind: 'complete', result: { text: reply, toolCalls: [] } };
  }

  private async *parseOpenAiStreamGen(
    body: ReadableStream<Uint8Array>,
  ): AsyncGenerator<LlmStreamEvent> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          text += delta.content;
          yield { kind: 'token', delta: delta.content };
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap.has(idx)) {
              toolCallsMap.set(idx, {
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              });
            } else {
              const existing = toolCallsMap.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            }
          }
        }
      }
    }

    const toolCalls: LlmToolCall[] = [...toolCallsMap.values()]
      .filter((tc) => tc.name)
      .map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = tc.arguments ? JSON.parse(tc.arguments) : {};
        } catch {
          args = {};
        }
        return { id: tc.id || `call_${tc.name}`, name: tc.name, arguments: args };
      });

    yield { kind: 'complete', result: { text: text.trim(), toolCalls } };
  }

  /** Non-streaming fallback for tests */
  async chatRound(messages: LlmChatMessage[]): Promise<LlmCompletionResult> {
    let result: LlmCompletionResult = { text: '', toolCalls: [] };
    for await (const event of this.chatRoundStream(messages)) {
      if (event.kind === 'complete') result = event.result;
    }
    return result;
  }

  private async parseOpenAiStream(
    body: ReadableStream<Uint8Array>,
    onToken: (delta: string) => void,
  ): Promise<LlmCompletionResult> {
    let result: LlmCompletionResult = { text: '', toolCalls: [] };
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }
        const delta = json.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.content) {
          text += delta.content;
          onToken(delta.content);
        }
        if (Array.isArray(delta.tool_calls)) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap.has(idx)) {
              toolCallsMap.set(idx, {
                id: tc.id ?? '',
                name: tc.function?.name ?? '',
                arguments: tc.function?.arguments ?? '',
              });
            } else {
              const existing = toolCallsMap.get(idx)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.name = tc.function.name;
              if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            }
          }
        }
      }
    }

    const toolCalls: LlmToolCall[] = [...toolCallsMap.values()]
      .filter((tc) => tc.name)
      .map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = tc.arguments ? JSON.parse(tc.arguments) : {};
        } catch {
          args = {};
        }
        return { id: tc.id || `call_${tc.name}`, name: tc.name, arguments: args };
      });

    result = { text: text.trim(), toolCalls };
    return result;
  }
}
