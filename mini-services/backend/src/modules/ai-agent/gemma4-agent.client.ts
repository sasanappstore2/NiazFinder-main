import { Injectable, Logger } from '@nestjs/common';
import type { LlmChatMessage, LlmCompletionResult, LlmToolCall } from './ai-agent.types';

const TOOL_PROTOCOL = `
For data access respond with ONLY JSON (no markdown):
{"action":"tool","name":"TOOL_NAME","arguments":{}}
For final answer:
{"action":"answer","content":"Persian text"}
Tools: check_user_account_status, search_needs_agent, get_site_categories, search_site_categories, search_site_cities
`.trim();

@Injectable()
export class Gemma4AgentClient {
  private readonly logger = new Logger(Gemma4AgentClient.name);

  isGemma4Provider(): boolean {
    if (process.env.LOCAL_LLM_ONLY !== 'false') return true;
    const provider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();
    if (provider === 'openai') return false;
    if (provider === 'gemma4' || provider === 'local' || provider === 'local-llm' || provider === 'lmstudio') {
      return true;
    }
    if (provider === 'ollama') return false;
    if (provider) return false;
    const base = process.env.AGENT_LLM_BASE_URL ?? process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:1234';
    return (
      base.includes(':1234') ||
      base.includes(':8100') ||
      base.includes('gemma4') ||
      base.includes('lmstudio')
    );
  }

  private baseUrl(): string {
    const raw =
      process.env.AGENT_LLM_BASE_URL ??
      process.env.NEED_INTAKE_LLM_URL ??
      'http://127.0.0.1:1234';
    return raw.replace(/\/v1$/, '').replace(/\/$/, '');
  }

  private model(): string {
    return process.env.AGENT_LLM_MODEL ?? process.env.NEED_INTAKE_LLM_MODEL ?? 'gemma-4-E2B_q4_0-it.gguf';
  }

  private timeoutMs(): number {
    return Number(process.env.AGENT_LLM_TIMEOUT_MS ?? process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? 120_000);
  }

  async chatRound(systemPrompt: string, messages: LlmChatMessage[]): Promise<LlmCompletionResult> {
    const chatMessages = [
      { role: 'system', content: `${systemPrompt}\n\n${TOOL_PROTOCOL}` },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((m) => {
          if (m.role === 'tool') {
            return { role: 'assistant' as const, content: `[tool] ${m.content ?? ''}` };
          }
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content ?? '',
          };
        }),
    ];

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs());

    try {
      const res = await fetch(`${this.baseUrl()}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model(),
          messages: chatMessages,
          max_tokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        this.logger.error(`GEMMA4 HTTP ${res.status}: ${err.slice(0, 200)}`);
        return { text: 'سرویس هوش مصنوعی موقتاً در دسترس نیست.', toolCalls: [] };
      }

      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = body.choices?.[0]?.message?.content?.trim() ?? '';
      return this.parseAgentJson(content);
    } finally {
      clearTimeout(timer);
    }
  }

  private parseAgentJson(content: string): LlmCompletionResult {
    let parsed: { action?: string; name?: string; arguments?: Record<string, unknown>; content?: string } | null =
      null;
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch {
      parsed = null;
    }

    if (parsed?.action === 'tool' && parsed.name) {
      const toolCalls: LlmToolCall[] = [
        {
          id: `tool_${Date.now()}`,
          name: parsed.name,
          arguments: parsed.arguments ?? {},
        },
      ];
      return { text: '', toolCalls };
    }

    if (parsed?.action === 'answer' && parsed.content) {
      return { text: parsed.content, toolCalls: [] };
    }

    return { text: content, toolCalls: [] };
  }

  async *streamText(text: string): AsyncGenerator<{ kind: 'token'; delta: string }> {
    for (const ch of text) {
      yield { kind: 'token', delta: ch };
      await new Promise((r) => setTimeout(r, 6));
    }
  }
}
