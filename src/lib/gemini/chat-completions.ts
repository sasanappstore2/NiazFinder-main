import type { ChatMessage } from '@/lib/need-intake/local-chat-client';
import {
  chatMessagesToGeminiRequest,
  geminiGenerateContent,
} from '@/lib/gemini/generate-content';
import { getGeminiModelId, getGeminiTimeoutMs, isGeminiConfigured } from '@/lib/gemini/config';

export interface GeminiChatOptions {
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
  model?: string;
}

/** OpenAI-compatible shape for drop-in use beside localChatCompletions. */
export async function geminiChatCompletions(
  messages: ChatMessage[],
  opts?: GeminiChatOptions
): Promise<{ content: string } | null> {
  if (!isGeminiConfigured()) return null;

  const request = chatMessagesToGeminiRequest(messages, {
    temperature: opts?.temperature,
    maxTokens: opts?.maxTokens,
    jsonMode: opts?.jsonMode,
  });

  const { text } = await geminiGenerateContent(request, {
    model: opts?.model ?? getGeminiModelId(),
    timeoutMs: opts?.timeoutMs ?? getGeminiTimeoutMs(),
  });

  if (!text) return null;
  return { content: text };
}
