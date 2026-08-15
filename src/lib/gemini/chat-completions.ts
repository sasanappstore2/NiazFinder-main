import type { ChatCompletionResult, ChatMessage } from '@/lib/need-intake/local-chat-client';
import {
  chatMessagesToGeminiRequest,
  geminiGenerateContent,
} from '@/lib/gemini/generate-content';
import { getGeminiApiKey, getGeminiModelId, getGeminiTimeoutMs, isGeminiConfigured } from '@/lib/gemini/config';

export interface GeminiChatOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  model?: string;
  /** Intent gist may call Gemini while LOCAL_LLM_ONLY blocks other Gemini paths. */
  bypassLocalLlmOnly?: boolean;
}

/** OpenAI-compatible shape for drop-in use beside localChatCompletions. */
export async function geminiChatCompletions(
  messages: ChatMessage[],
  opts?: GeminiChatOptions
): Promise<ChatCompletionResult | null> {
  if (opts?.bypassLocalLlmOnly) {
    if (!getGeminiApiKey()) return null;
  } else if (!isGeminiConfigured()) {
    return null;
  }

  const started = performance.now();
  const request = chatMessagesToGeminiRequest(messages, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    jsonMode: opts?.jsonMode,
  });

  const { text, raw } = await geminiGenerateContent(request, {
    model: opts?.model ?? getGeminiModelId(),
    timeoutMs: opts?.timeoutMs ?? getGeminiTimeoutMs(),
  });

  if (!text) return null;
  return {
    content: text,
    raw,
    latencyMs: Math.round(performance.now() - started),
  };
}
