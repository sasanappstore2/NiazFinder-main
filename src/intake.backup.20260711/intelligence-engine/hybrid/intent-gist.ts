import { localChatCompletions } from '@/lib/need-intake/local-chat-client';
import { getLocalModelConfig } from '@/lib/need-intake/local-model-config';
import { isLocalLlmOnly } from '@/lib/local-llm/config';
import { geminiChatCompletions } from '@/lib/gemini/chat-completions';
import { getGeminiIntentGistModelId, isGeminiConfigured } from '@/lib/gemini/config';
import { isIntakeAiGloballyDisabled } from '@/intake/rules/config';
import { isIntentGistEnabled } from '@/intake/intelligence-engine/hybrid/intent-gist-config';
import {
  buildIntentGistCacheKey,
  getCachedIntentGist,
  setCachedIntentGist,
} from '@/intake/intelligence-engine/hybrid/intent-gist-cache';
import {
  buildIntentGistUserPrompt,
  INTENT_GIST_SYSTEM_PROMPT,
  type IntentGistPromptHints,
} from '@/intake/intelligence-engine/hybrid/intent-gist-prompt';

export interface IntentGistResult {
  gist: string;
  provider: string;
  cacheHit: boolean;
  latencyMs: number;
}

function maxGistWords(): number {
  const n = Number(process.env.NEED_INTAKE_INTENT_GIST_MAX_WORDS ?? 25);
  return Number.isFinite(n) && n >= 8 ? Math.min(n, 40) : 25;
}

function looksLikeLegalTemplate(text: string): boolean {
  return (
    text.includes('\u0645\u0634\u062A\u0631\u06CC \u0645\u062A\u0642\u0627\u0636\u06CC') ||
    text.includes(') or') ||
    /\bbuyer\b|\bseller\b|\bcustomer\b/i.test(text)
  );
}

function stripLegalBoilerplate(text: string): string {
  return text
    .replace(/^\)\s*or\s*/i, '')
    .replace(/\u0645\u0634\u062A\u0631\u06CC \u0645\u062A\u0642\u0627\u0636\u06CC\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clampIntentGist(raw: string): string {
  const cleaned = raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[{}\[\]"'*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  if (/ONE simple|PERSIAN sentence|JSON|markdown|No JSON/i.test(cleaned)) return '';

  let firstSentence = cleaned.split(/[.!\n]/)[0]?.trim() ?? cleaned;
  if (looksLikeLegalTemplate(firstSentence)) {
    firstSentence = stripLegalBoilerplate(firstSentence);
  }

  const persianChars = (firstSentence.match(/[\u0600-\u06FF]/g) ?? []).length;
  if (persianChars < 6) return '';

  const words = firstSentence.split(/\s+/).filter(Boolean);
  return words.slice(0, maxGistWords()).join(' ');
}

export function buildRulesSourceText(original: string, gist?: string | null): string {
  const g = gist?.trim();
  if (!g) return original;
  return `${original.trim()}\n${g}`;
}

export function shouldRunIntentGist(
  text: string,
  opts?: { categoryLocked?: boolean }
): boolean {
  if (!isIntentGistEnabled() || isIntakeAiGloballyDisabled()) return false;
  if (opts?.categoryLocked) return false;
  return text.trim().length >= 6;
}

async function callIntentGistLlm(
  text: string,
  hints?: IntentGistPromptHints
): Promise<{ gist: string; provider: string } | null> {
  const messages = [
    { role: 'system' as const, content: INTENT_GIST_SYSTEM_PROMPT },
    { role: 'user' as const, content: buildIntentGistUserPrompt(text, hints) },
  ];
  const maxTokens = Number(process.env.NEED_INTAKE_INTENT_GIST_MAX_TOKENS ?? 512);
  const gistProvider = process.env.NEED_INTAKE_INTENT_GIST_PROVIDER?.trim().toLowerCase();
  const preferGemini =
    !isLocalLlmOnly() && gistProvider === 'gemini';
  const localTimeoutMs = Number(process.env.NEED_INTAKE_INTENT_GIST_LOCAL_TIMEOUT_MS ?? 4000);

  const tryGemini = async (): Promise<{ gist: string; provider: string } | null> => {
    if (!isGeminiConfigured()) return null;
    if (
      process.env.GEMINI_FALLBACK_ENABLED !== 'true' &&
      process.env.NEED_INTAKE_INTENT_GIST_PROVIDER !== 'gemini'
    ) {
      return null;
    }
    const gemini = await geminiChatCompletions(messages, {
      maxTokens,
      temperature: 0.05,
      model: getGeminiIntentGistModelId(),
    });
    if (!gemini?.content) return null;
    const gist = clampIntentGist(gemini.content);
    return gist ? { gist, provider: 'gemini' } : null;
  };

  const tryLocal = async (): Promise<{ gist: string; provider: string } | null> => {
    const local = await localChatCompletions(messages, {
      config: {
        ...getLocalModelConfig(),
        timeoutMs: localTimeoutMs,
        maxRetries: 0,
      },
      maxTokens,
      temperature: 0.05,
      maxRetries: 0,
    });
    if (!local?.content) return null;
    const gist = clampIntentGist(local.content);
    return gist ? { gist, provider: 'local-llm' } : null;
  };

  if (preferGemini) {
    return (await tryGemini()) ?? (await tryLocal());
  }

  return (await tryLocal()) ?? (await tryGemini());
}

/** Background intent summary ? one simple sentence for rules + UI. */
export async function runIntentGist(
  text: string,
  hints?: IntentGistPromptHints & { categoryLocked?: boolean }
): Promise<IntentGistResult | null> {
  const trimmed = text.trim();
  if (!shouldRunIntentGist(trimmed, { categoryLocked: hints?.categoryLocked })) return null;

  const cacheKey = buildIntentGistCacheKey(trimmed, hints);
  const cached = getCachedIntentGist(cacheKey);
  if (cached) {
    return {
      gist: cached.gist,
      provider: cached.provider,
      cacheHit: true,
      latencyMs: 0,
    };
  }

  const started = performance.now();
  const llm = await callIntentGistLlm(trimmed, hints);
  if (!llm) return null;

  setCachedIntentGist(cacheKey, llm.gist, llm.provider);
  return {
    gist: llm.gist,
    provider: llm.provider,
    cacheHit: false,
    latencyMs: Math.round(performance.now() - started),
  };
}
