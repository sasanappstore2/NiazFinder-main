import { extractJsonFromChatContent, localChatCompletions, type ChatMessage } from '@/lib/need-intake/local-chat-client';
import { getLocalModelConfig } from '@/lib/need-intake/local-model-config';
import { AI_AGENT_USER_MESSAGES } from '@/lib/ai-agent/errors';
import { isLocalLlmOnly } from '@/lib/local-llm/config';
import { geminiChatCompletions } from '@/lib/gemini/chat-completions';
import { isGeminiConfigured } from '@/lib/gemini/config';

export type GemmaAgentMessage = ChatMessage | { role: 'tool'; content: string; name?: string };

export interface GemmaAgentToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface GemmaAgentRoundResult {
  text: string;
  toolCalls: GemmaAgentToolCall[];
}

const TOOL_PROTOCOL = `برای فراخوانی ابزار فقط یکی از این JSONها را برگردان (بدون markdown):
{"action":"tool","name":"TOOL_NAME","arguments":{}}
برای پاسخ نهایی:
{"action":"answer","content":"متن پاسخ"}
ابزارها: check_user_account_status, search_needs_agent, get_site_categories, search_site_categories, search_site_cities`.trim();

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

function parseAgentJson(content: string): GemmaAgentRoundResult {
  const parsed = extractJsonFromChatContent(content) as
    | { action?: string; name?: string; arguments?: Record<string, unknown>; content?: string }
    | null;

  if (parsed && parsed.action === 'tool' && parsed.name) {
    return {
      text: '',
      toolCalls: [
        {
          id: `tool_${Date.now()}`,
          name: parsed.name,
          arguments: parsed.arguments ?? {},
        },
      ],
    };
  }

  if (parsed && parsed.action === 'answer' && parsed.content) {
    return { text: parsed.content, toolCalls: [] };
  }

  return { text: content.trim(), toolCalls: [] };
}

function toChatMessages(messages: GemmaAgentMessage[]): ChatMessage[] {
  return messages.map((m) => {
    if (m.role === 'tool') {
      return { role: 'assistant', content: `[tool:${m.name ?? 'result'}] ${m.content}` };
    }
    return { role: m.role, content: m.content };
  });
}

export async function runGemma4AgentRound(
  systemPrompt: string,
  messages: GemmaAgentMessage[],
): Promise<GemmaAgentRoundResult> {
  const agentProvider = process.env.AGENT_LLM_PROVIDER?.trim().toLowerCase();

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: `${systemPrompt}\n\n${TOOL_PROTOCOL}` },
    ...toChatMessages(messages),
  ];

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

  const config = getLocalModelConfig();
  const agentBase = process.env.AGENT_LLM_BASE_URL?.replace(/\/$/, '');
  const mergedConfig = agentBase
    ? {
        ...config,
        baseUrl: agentBase.replace(/\/v1$/, ''),
        model: process.env.AGENT_LLM_MODEL ?? config.model,
        timeoutMs: Number(process.env.AGENT_LLM_TIMEOUT_MS ?? 45000),
      }
    : config;

  const res = await localChatCompletions(chatMessages, {
    config: mergedConfig,
    maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
    temperature: 0.2,
    maxRetries: 0,
  });

  if (!res?.content && isGeminiConfigured() && process.env.GEMINI_FALLBACK_ENABLED === 'true') {
    const geminiRes = await geminiChatCompletions(chatMessages, {
      maxTokens: Number(process.env.AGENT_LLM_MAX_TOKENS ?? 800),
      temperature: 0.2,
    });
    if (geminiRes?.content) {
      return parseAgentJson(geminiRes.content);
    }
  }

  if (!res?.content) {
    return { text: AI_AGENT_USER_MESSAGES.LLM_UNAVAILABLE, toolCalls: [] };
  }

  return parseAgentJson(res.content);
}

export async function* streamTextDeltas(text: string): AsyncGenerator<string> {
  for (const ch of text) {
    yield ch;
    await new Promise((r) => setTimeout(r, 6));
  }
}
