import {
  extractAnswerFromReasoning,
  localChatCompletions,
  localChatCompletionsStream,
  type ChatMessage,
} from '@/lib/need-intake/local-chat-client';
import { getLocalModelConfig } from '@/lib/need-intake/local-model-config';
import { AI_AGENT_USER_MESSAGES } from '@/lib/ai-agent/errors';
import { getAgentLlmBaseUrl, getAgentLlmModel } from '@/lib/ai-agent/env';
import { isLocalLlmOnly } from '@/lib/local-llm/config';
import { geminiChatCompletions } from '@/lib/gemini/chat-completions';
import { isGeminiConfigured, isGeminiFallbackEnabled } from '@/lib/gemini/config';
import {
  ThinkTagStreamParser,
  composePersistedThinkContent,
  looksLikeAgentToolJson,
  parseThinkContent,
  stripThinkTags,
} from '@/lib/ai-agent/think-tag-parser';
import { parseToolCallsFromContent } from '@/lib/ai-agent/tool-call-parser';
import {
  sanitizeAgentStreamChunk,
  sanitizeAgentVisibleText,
  sanitizePersistedAgentContent,
} from '@/lib/ai-agent/output-sanitizer';

export type GemmaAgentMessage = ChatMessage | { role: 'tool'; content: string; name?: string };

export interface GemmaAgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface GemmaAgentRoundResult {
  text: string;
  toolCalls: GemmaAgentToolCall[];
  /** Raw thinking text (without tags) when present. */
  thinking?: string;
  /** Full persisted content: optional <think>…</think> + answer. */
  persistedContent?: string;
}

export const AGENT_TOOL_NAMES = [
  'check_user_account_status',
  'search_needs_agent',
  'search_businesses_agent',
  'get_public_business_profile',
  'search_site_knowledge',
  'get_site_categories',
  'search_site_categories',
  'search_site_cities',
  'search_site_neighborhoods',
  'explain_need_fields',
  'get_site_help',
  'get_user_memory',
  'update_user_memory',
] as const;

const TOOL_PROTOCOL = `برای فراخوانی ابزار فقط یکی از این JSONها را برگردان (بدون markdown و بدون تگ tool_call):
{"action":"tool","name":"TOOL_NAME","arguments":{}}
هرگز متن call: یا <|tool_call|> را در پاسخ کاربر ننویس.
برای پاسخ نهایی به کاربر:
ابتدا استدلال کوتاه فارسی را داخل <think>…</think> بنویس، سپس فقط متن فارسی پاسخ (بدون JSON و بدون ابزار).
ابزارها: ${AGENT_TOOL_NAMES.join(', ')}`.trim();

export function isGemma4AgentProvider(): boolean {
  if (isLocalLlmOnly()) return true;
  const provider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();
  if (provider === 'gemini') return false;
  if (provider === 'openai') return false;
  if (provider === 'gemma4' || provider === 'local' || provider === 'local-llm' || provider === 'lmstudio') {
    return true;
  }
  if (provider === 'ollama') return false;
  if (provider) return false;
  const base =
    process.env.AGENT_LLM_BASE_URL ??
    process.env.NEED_INTAKE_LLM_URL ??
    'http://127.0.0.1:1234';
  return (
    base.includes(':1234') ||
    base.includes(':8100') ||
    base.includes('gemma4') ||
    base.includes('lmstudio')
  );
}

export function parseAgentJson(content: string): GemmaAgentRoundResult {
  const { thinking, answer } = parseThinkContent(content);
  const stripped = (answer || stripThinkTags(content)).trim();
  const { toolCalls, residualText } = parseToolCallsFromContent(stripped);

  if (toolCalls.length > 0) {
    return {
      text: '',
      toolCalls: toolCalls.map((t) => ({
        id: t.id,
        name: t.name,
        arguments: t.arguments,
      })),
    };
  }

  // Legacy JSON answer wrapper
  try {
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(stripped.slice(start, end + 1)) as {
        action?: string;
        content?: string;
      };
      if (parsed.action === 'answer' && parsed.content) {
        const text = sanitizeAgentVisibleText(parsed.content);
        return {
          text,
          toolCalls: [],
          thinking: thinking || undefined,
          persistedContent: sanitizePersistedAgentContent(
            composePersistedThinkContent(thinking, text),
          ),
        };
      }
    }
  } catch {
    /* ignore */
  }

  const text = sanitizeAgentVisibleText(residualText || stripped);
  return {
    text,
    toolCalls: [],
    thinking: thinking ? sanitizeAgentVisibleText(thinking) : undefined,
    persistedContent: sanitizePersistedAgentContent(
      composePersistedThinkContent(thinking, text),
    ),
  };
}

function toChatMessages(messages: GemmaAgentMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'assistant', content: `[tool:${m.name ?? 'result'}] ${m.content}` };
    }
    return { role: m.role, content: m.content };
  });
}

function agentChatMessages(
  systemPrompt: string,
  messages: GemmaAgentMessage[],
  opts?: { allowTools?: boolean },
): ChatMessage[] {
  const allowTools = opts?.allowTools !== false;
  const system = allowTools ? `${systemPrompt}\n\n${TOOL_PROTOCOL}` : systemPrompt;
  return [{ role: 'system', content: system }, ...toChatMessages(messages)];
}

function agentLocalConfig() {
  const config = getLocalModelConfig();
  const agentBase = getAgentLlmBaseUrl().replace(/\/$/, '').replace(/\/v1$/, '');
  return {
    ...config,
    baseUrl: agentBase || config.baseUrl,
    model: getAgentLlmModel() || config.model,
    timeoutMs: Number(process.env.AGENT_LLM_TIMEOUT_MS ?? config.timeoutMs ?? 120_000),
  };
}

export async function runGemma4AgentRound(
  systemPrompt: string,
  messages: GemmaAgentMessage[],
  opts?: { allowTools?: boolean },
): Promise<GemmaAgentRoundResult> {
  const agentProvider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();
  const chatMessages = agentChatMessages(systemPrompt, messages, opts);

  if (agentProvider === 'gemini' || (!isGemma4AgentProvider() && isGeminiConfigured())) {
    const res = await geminiChatCompletions(chatMessages, {
      maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
      temperature: 0.2,
    });
    if (!res?.content) {
      return { text: AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE, toolCalls: [] };
    }
    return parseAgentJson(res.content);
  }

  const mergedConfig = agentLocalConfig();
  const res = await localChatCompletions(chatMessages, {
    config: mergedConfig,
    maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
    temperature: 0.2,
    maxRetries: 0,
  });

  if (!res?.content && !isLocalLlmOnly() && isGeminiFallbackEnabled()) {
    const geminiRes = await geminiChatCompletions(chatMessages, {
      maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
      temperature: 0.2,
    });
    if (geminiRes?.content) {
      return parseAgentJson(geminiRes.content);
    }
  }

  if (!res?.content) {
    console.warn('[ai-agent] local LLM returned empty content', {
      baseUrl: mergedConfig.baseUrl,
      model: mergedConfig.model,
    });
    return { text: AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE, toolCalls: [] };
  }

  const parsed = parseAgentJson(res.content);
  // Answer-only rounds must never surface tool calls
  if (opts?.allowTools === false && parsed.toolCalls.length > 0) {
    return {
      text: 'الان نتوانستم ابزار را کامل کنم؛ لطفاً سوال را ساده‌تر بپرسید یا کمی بعد دوباره تلاش کنید.',
      toolCalls: [],
      persistedContent: 'الان نتوانستم ابزار را کامل کنم؛ لطفاً سوال را ساده‌تر بپرسید یا کمی بعد دوباره تلاش کنید.',
    };
  }
  return parsed;
}

export type GemmaAgentStreamEvent =
  | { type: 'thinking'; delta: string }
  | { type: 'token'; delta: string }
  | { type: 'complete'; result: GemmaAgentRoundResult };

/**
 * Stream one agent round from the local LLM.
 * Emits thinking/token live for answers; suppresses tool-call JSON from the client.
 *
 * Native model `reasoning_content` is kept internally (for fallback) but NOT dumped
 * into the UI — only explicit `<think>…</think>` Persian blocks are streamed as thinking.
 */
export async function* streamGemma4AgentRound(
  systemPrompt: string,
  messages: GemmaAgentMessage[],
  opts?: { allowTools?: boolean },
): AsyncGenerator<GemmaAgentStreamEvent> {
  const agentProvider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();
  const chatMessages = agentChatMessages(systemPrompt, messages, opts);

  // Non-local providers: complete then fake-stream via caller using result text
  if (agentProvider === 'gemini' || (!isGemma4AgentProvider() && isGeminiConfigured())) {
    const result = await runGemma4AgentRound(systemPrompt, messages, opts);
    yield { type: 'complete', result };
    return;
  }

  if (!isGemma4AgentProvider()) {
    const result = await runGemma4AgentRound(systemPrompt, messages, opts);
    yield { type: 'complete', result };
    return;
  }

  const mergedConfig = agentLocalConfig();
  const parser = new ThinkTagStreamParser();
  let rawContent = '';
  let reasoningAcc = '';
  let tagThinkingAcc = '';
  let answerAcc = '';
  /** Hold answer deltas while stripped content still looks like it might be JSON. */
  let pendingAnswer = '';
  let jsonMode: 'unknown' | 'tool' | 'answer' = 'unknown';
  let sawAnyDelta = false;
  let emittedThinkingPulse = false;

  const flushPendingAnswer = function* (): Generator<GemmaAgentStreamEvent> {
    if (!pendingAnswer) return;
    const clean = sanitizeAgentStreamChunk(pendingAnswer);
    pendingAnswer = '';
    if (!clean) return;
    answerAcc += clean;
    yield { type: 'token', delta: clean };
  };

  try {
    for await (const delta of localChatCompletionsStream(chatMessages, {
      config: mergedConfig,
      maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
      temperature: 0.2,
    })) {
      sawAnyDelta = true;

      if (delta.reasoning) {
        reasoningAcc += delta.reasoning;
        // Pulse once so UI shows «در حال فکر کردن» without English CoT dump
        if (!emittedThinkingPulse && jsonMode !== 'tool') {
          emittedThinkingPulse = true;
          yield { type: 'thinking', delta: '…' };
        }
      }

      if (!delta.content) continue;
      rawContent += delta.content;

      if (jsonMode === 'unknown' && looksLikeAgentToolJson(rawContent)) {
        jsonMode = 'tool';
        pendingAnswer = '';
      }

      const parts = parser.push(delta.content);
      for (const part of parts) {
        if (part.kind === 'thinking') {
          tagThinkingAcc += part.delta;
          if (jsonMode !== 'tool') yield { type: 'thinking', delta: part.delta };
          continue;
        }

        if (jsonMode === 'tool') continue;

        const strippedSoFar = stripThinkTags(rawContent).trim();
        if (jsonMode === 'unknown' && strippedSoFar.startsWith('{')) {
          pendingAnswer += part.delta;
          if (looksLikeAgentToolJson(rawContent)) {
            jsonMode = 'tool';
            pendingAnswer = '';
          }
          continue;
        }

        jsonMode = 'answer';
        yield* flushPendingAnswer();
        const clean = sanitizeAgentStreamChunk(part.delta);
        if (!clean) continue;
        answerAcc += clean;
        yield { type: 'token', delta: clean };
      }
    }

    for (const part of parser.flush()) {
      if (part.kind === 'thinking') {
        tagThinkingAcc += part.delta;
        if (jsonMode !== 'tool') yield { type: 'thinking', delta: part.delta };
        continue;
      }
      if (jsonMode === 'tool') continue;
      if (jsonMode === 'unknown' && stripThinkTags(rawContent).trim().startsWith('{')) {
        pendingAnswer += part.delta;
        continue;
      }
      jsonMode = 'answer';
      yield* flushPendingAnswer();
      const clean = sanitizeAgentStreamChunk(part.delta);
      if (!clean) continue;
      answerAcc += clean;
      yield { type: 'token', delta: clean };
    }

    if (jsonMode !== 'tool' && pendingAnswer) {
      jsonMode = 'answer';
      yield* flushPendingAnswer();
    }
  } catch (err) {
    console.warn('[ai-agent] stream round failed', err);
  }

  // Empty stream → non-stream fallback
  if (!sawAnyDelta && !rawContent.trim() && !reasoningAcc.trim()) {
    const fallback = await runGemma4AgentRound(systemPrompt, messages, opts);
    yield { type: 'complete', result: fallback };
    return;
  }

  const parsed = parseAgentJson(
    rawContent || answerAcc || extractAnswerFromReasoning(reasoningAcc) || '',
  );
  if (parsed.toolCalls.length > 0) {
    if (opts?.allowTools === false) {
      const recovery = await runGemma4AgentRound(
        `${systemPrompt}\n\nفقط پاسخ نهایی کوتاه فارسی. ابزار ممنوع.`,
        messages,
        { allowTools: false },
      );
      if (
        recovery.text.trim() &&
        recovery.text !== AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE &&
        recovery.toolCalls.length === 0
      ) {
        for (const ch of recovery.text) yield { type: 'token', delta: ch };
        yield {
          type: 'complete',
          result: {
            text: recovery.text,
            toolCalls: [],
            thinking: recovery.thinking,
            persistedContent:
              recovery.persistedContent ??
              composePersistedThinkContent(recovery.thinking ?? '', recovery.text),
          },
        };
        return;
      }
    }
    yield { type: 'complete', result: parsed };
    return;
  }

  let text = sanitizeAgentVisibleText(answerAcc || parsed.text || stripThinkTags(rawContent));
  // Never treat native English reasoning_content as the user-facing answer
  if (text && !rawContent.trim() && !answerAcc.trim() && reasoningAcc.trim()) {
    text = '';
  }
  // If the model burned tokens on native reasoning and left content empty, recover
  if (!text) {
    const recovery = await runGemma4AgentRound(
      `${systemPrompt}\n\nفقط پاسخ نهایی کوتاه فارسی بده. تگ think اختیاری و کوتاه. ابزار صدا نزن.`,
      messages,
      { allowTools: false },
    );
    if (recovery.toolCalls.length > 0) {
      yield { type: 'complete', result: recovery };
      return;
    }
    if (recovery.text && recovery.text !== AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE) {
      text = sanitizeAgentVisibleText(recovery.text);
      for (const ch of text) {
        yield { type: 'token', delta: ch };
      }
    } else if (recovery.text === AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE) {
      yield { type: 'complete', result: recovery };
      return;
    }
  }

  // Don't persist English native CoT as the visible think block
  const thinking = sanitizeAgentVisibleText(tagThinkingAcc) || undefined;
  if (!text) {
    yield {
      type: 'complete',
      result: { text: AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE, toolCalls: [] },
    };
    return;
  }

  const persistedContent = sanitizePersistedAgentContent(
    composePersistedThinkContent(thinking ?? '', text),
  );
  yield {
    type: 'complete',
    result: {
      text,
      toolCalls: [],
      thinking,
      persistedContent,
    },
  };
}

/** Soft character drip for non-stream fallbacks (Gemini / empty stream). */
export async function* streamTextDeltas(text: string): AsyncGenerator<string> {
  for (const ch of text) {
    yield ch;
    await new Promise((r) => setTimeout(r, 6));
  }
}
