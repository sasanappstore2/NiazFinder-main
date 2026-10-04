import { parseAiJsonPayload } from '@/ai/schema/extractionSchema';
import { getLocalLlmParallelSlots } from '@/lib/local-llm/config';
import {
  getLocalModelConfig,
  localModelChatUrl,
  localModelModelsUrl,
  type LocalModelConfig,
} from '@/lib/need-intake/local-model-config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  raw: unknown;
  latencyMs: number;
}

/** Gemma/LM Studio may put the answer only in reasoning_content when max_tokens is tight. */
export function extractAnswerFromReasoning(reasoning: string | undefined | null): string {
  const text = reasoning?.trim();
  if (!text) return '';

  // Prefer agent tool/answer JSON if the model hid it inside reasoning
  const toolMatch = text.match(/\{\s*"action"\s*:\s*"tool"[\s\S]*\}/);
  if (toolMatch?.[0]) {
    const start = toolMatch.index ?? 0;
    const sliced = text.slice(start);
    const end = findMatchingBrace(sliced);
    if (end > 0) return sliced.slice(0, end).trim();
  }

  const answerMatch = text.match(/\{\s*"action"\s*:\s*"answer"[\s\S]*\}/);
  if (answerMatch?.[0]) {
    const start = answerMatch.index ?? 0;
    const sliced = text.slice(start);
    const end = findMatchingBrace(sliced);
    if (end > 0) return sliced.slice(0, end).trim();
  }

  const jsonMatch = text.match(/\{[\s\S]*"action"\s*:\s*"(?:answer|tool)"[\s\S]*\}/);
  if (jsonMatch?.[0]) return jsonMatch[0].trim();

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  // Last non-empty line that looks like a user-facing reply (not English "Thinking").
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!;
    if (/^(thinking|analysis|step|reason)\b/i.test(line)) continue;
    if (/^[\d.*\-#]/.test(line)) continue;
    if (/[\u0600-\u06FF]/.test(line) || line.length > 12) return line;
  }
  return '';
}

function findMatchingBrace(s: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\') {
        escape = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

class AsyncSemaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  constructor(private readonly maxSlots: number) {}

  async acquire(): Promise<void> {
    if (this.active < this.maxSlots) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

let llmSemaphore: AsyncSemaphore | null = null;

function getLlmSemaphore(): AsyncSemaphore {
  if (!llmSemaphore) {
    llmSemaphore = new AsyncSemaphore(getLocalLlmParallelSlots());
  }
  return llmSemaphore;
}

/** Reset semaphore after env changes (tests). */
export function resetLocalLlmSemaphoreForTests(): void {
  llmSemaphore = null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function localChatCompletionsInner(
  messages: ChatMessage[],
  opts?: {
    config?: LocalModelConfig;
    maxTokens?: number;
    temperature?: number;
    /** Fixed sampling seed — set only by deterministic replay execution (Replay Determinism
     *  Audit §6, D-narrow item 2); production callers leave it unset on purpose. */
    seed?: number;
    maxRetries?: number;
  }
): Promise<ChatCompletionResult | null> {
  const config = opts?.config ?? getLocalModelConfig();
  const maxRetries = opts?.maxRetries ?? config.maxRetries;
  const started = performance.now();
  const url = localModelChatUrl(config);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.model,
            messages,
            max_tokens: opts?.maxTokens ?? 512,
            temperature: opts?.temperature ?? 0.1,
            ...(opts?.seed !== undefined ? { seed: opts.seed } : {}),
            stream: false,
          }),
        },
        config.timeoutMs
      );

      if (!res.ok) {
        if (attempt < maxRetries && res.status >= 500) continue;
        return null;
      }

      const body = (await res.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
            reasoning?: string;
            reasoning_content?: string;
          };
          finish_reason?: string;
        }>;
      };
      const message = body.choices?.[0]?.message;
      const content =
        message?.content?.trim() ||
        extractAnswerFromReasoning(message?.reasoning_content) ||
        message?.reasoning?.trim() ||
        '';
      if (!content) {
        if (attempt < maxRetries) continue;
        return null;
      }

      return {
        content,
        raw: body,
        latencyMs: Math.round(performance.now() - started),
      };
    } catch {
      if (attempt === maxRetries) return null;
    }
  }

  return null;
}

/** POST /v1/chat/completions on local OpenAI-compatible server (queued parallel slots). */
export async function localChatCompletions(
  messages: ChatMessage[],
  opts?: {
    config?: LocalModelConfig;
    maxTokens?: number;
    temperature?: number;
    /** See localChatCompletionsInner — deterministic replay execution only. */
    seed?: number;
    maxRetries?: number;
  }
): Promise<ChatCompletionResult | null> {
  return getLlmSemaphore().run(() => localChatCompletionsInner(messages, opts));
}

export interface LocalChatStreamDelta {
  content?: string;
  reasoning?: string;
}

/**
 * Streaming POST /v1/chat/completions (OpenAI-compatible SSE).
 * Holds one semaphore slot for the entire stream lifetime.
 */
export async function* localChatCompletionsStream(
  messages: ChatMessage[],
  opts?: {
    config?: LocalModelConfig;
    maxTokens?: number;
    temperature?: number;
  }
): AsyncGenerator<LocalChatStreamDelta> {
  const config = opts?.config ?? getLocalModelConfig();
  const url = localModelChatUrl(config);
  await getLlmSemaphore().acquire();
  try {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages,
          max_tokens: opts?.maxTokens ?? 512,
          temperature: opts?.temperature ?? 0.1,
          stream: true,
        }),
      },
      config.timeoutMs
    );

    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;

        try {
          const json = JSON.parse(payload) as {
            choices?: Array<{
              delta?: {
                content?: string | null;
                reasoning?: string | null;
                reasoning_content?: string | null;
              };
            }>;
          };
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          const content = delta.content ?? undefined;
          const reasoning =
            delta.reasoning_content ?? delta.reasoning ?? undefined;
          if (content || reasoning) {
            yield {
              ...(content ? { content } : {}),
              ...(reasoning ? { reasoning } : {}),
            };
          }
        } catch {
          // ignore malformed SSE chunks
        }
      }
    }
  } finally {
    getLlmSemaphore().release();
  }
}

export function extractJsonFromChatContent(content: string): unknown {
  return parseAiJsonPayload(content);
}

export async function checkLocalModelHealth(): Promise<{
  ok: boolean;
  modelId?: string;
  models?: string[];
  loadError?: string | null;
}> {
  const config = getLocalModelConfig();
  try {
    const res = await fetch(localModelModelsUrl(config), {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { ok: false, loadError: `HTTP ${res.status}` };
    const data = (await res.json()) as {
      data?: Array<{ id?: string }>;
      models?: Array<{ id?: string; name?: string; model?: string }>;
    };
    const fromData = (data.data ?? []).map((m) => m.id).filter(Boolean) as string[];
    const fromModels = (data.models ?? [])
      .map((m) => m.id || m.model || m.name)
      .filter(Boolean) as string[];
    const models = fromData.length ? fromData : fromModels;
    const modelId = models.includes(config.model) ? config.model : models[0];
    return { ok: models.length > 0, modelId, models, loadError: null };
  } catch (e) {
    return {
      ok: false,
      loadError: e instanceof Error ? e.message : 'unreachable',
    };
  }
}
