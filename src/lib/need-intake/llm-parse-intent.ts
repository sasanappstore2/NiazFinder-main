import type { ParsedIntent } from '@/contracts/need-intake';
import {
  getNeedIntakeEnrichTimeoutMs,
  isNeedIntakeAiEnabled,
} from '@/lib/ai/env';
import { chatCompletion, extractJsonObject } from '@/lib/ai/openai-compatible';
import {
  buildListingEnrichSystemPrompt,
  buildListingEnrichUserMessage,
} from '@/lib/need-intake/ai-prompts';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import {
  buildParseSystemPromptForText,
} from '@/lib/need-intake/prompts';
import { buildParseUserMessage } from '@/lib/need-intake/prompts/base';
import { getCachedParse, setCachedParse } from '@/lib/need-intake/parse-cache';
import { validateAndNormalizeLlmParsed } from '@/lib/need-intake/validate-parsed-intent';
const GENERIC_TITLES = new Set([
  'ثبت نیاز',
  'جستجوی خودرو',
  'جستجوی ملک',
  'جستجوی کالا',
  'درخواست خدمات',
]);

/** Merge LLM output with rule-based parser (budget/city safety net). */
export function mergeParsedIntent(llm: ParsedIntent, rules: ParsedIntent): ParsedIntent {
  return {
    ...llm,
    budgetMin: llm.budgetMin ?? rules.budgetMin,
    budgetMax: llm.budgetMax ?? rules.budgetMax,
    city: llm.city ?? rules.city,
    province: llm.province ?? rules.province,
    urgency: llm.urgency ?? rules.urgency,
    confidence: Math.max(llm.confidence, rules.confidence * 0.5),
    entities: { ...rules.entities, ...llm.entities },
    rawText: llm.rawText || rules.rawText,
  };
}

export async function parseIntentWithLlm(rawText: string): Promise<ParsedIntent | null> {
  const rules = parseIntentFromText(rawText);

  try {
    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: buildParseSystemPromptForText(rawText) },
        { role: 'user', content: buildParseUserMessage(rawText) },
      ],
      jsonMode: true,
      temperature: 0.2,
    });

    const json = extractJsonObject(content);
    const normalized = validateAndNormalizeLlmParsed(json, rawText.trim(), rules);
    return mergeParsedIntent(normalized, rules);
  } catch (e) {
    console.warn('[need-intake] LLM parse failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** LLM parse with fallback to rules-only. */
export async function parseIntentWithAi(rawText: string): Promise<{
  parsed: ParsedIntent;
  source: 'llm' | 'rules' | 'hybrid';
  llmRaw?: unknown;
  cacheHit?: boolean;
  latencyMs?: number;
}> {
  const rules = parseIntentFromText(rawText);
  const trimmed = rawText.trim();

  const cached = getCachedParse(trimmed);
  if (cached) {
    return {
      parsed: cached.parsed,
      source: cached.source,
      llmRaw: cached.llmRaw,
      cacheHit: true,
      latencyMs: 0,
    };
  }

  if (!isNeedIntakeAiEnabled()) {
    return { parsed: rules, source: 'rules', cacheHit: false };
  }

  const started = Date.now();
  const llm = await parseIntentWithLlm(trimmed);
  const latencyMs = Date.now() - started;

  if (!llm) {
    return { parsed: rules, source: 'rules', cacheHit: false, latencyMs };
  }

  const result = {
    parsed: llm,
    source: 'hybrid' as const,
    llmRaw: llm.entities,
    cacheHit: false,
    latencyMs,
  };

  setCachedParse(trimmed, {
    parsed: llm,
    source: result.source,
    llmRaw: result.llmRaw,
  });

  return result;
}

export interface ListingEnrichment {
  title: string;
  description: string;
}

function needsListingEnrichment(title: string, description: string): boolean {
  const t = title.trim();
  if (t.length < 10) return true;
  if (GENERIC_TITLES.has(t)) return true;
  if (description.trim().length < 40) return true;
  return false;
}

/** Optional second LLM call for publish title/description. */
export async function enrichListingWithLlm(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  currentTitle: string,
  currentDescription: string
): Promise<ListingEnrichment | null> {
  if (!isNeedIntakeAiEnabled()) return null;
  if (!needsListingEnrichment(currentTitle, currentDescription)) return null;

  try {
    const { content } = await chatCompletion({
      messages: [
        { role: 'system', content: buildListingEnrichSystemPrompt() },
        { role: 'user', content: buildListingEnrichUserMessage(parsed, answers) },
      ],
      jsonMode: true,
      temperature: 0.3,
      timeoutMs: getNeedIntakeEnrichTimeoutMs(),
    });

    const json = extractJsonObject(content) as { title?: string; description?: string };
    const title = String(json.title ?? '').trim().slice(0, 120);
    const description = String(json.description ?? '').trim().slice(0, 2000);
    if (title.length < 8 || description.length < 20) return null;
    return { title, description };
  } catch (e) {
    console.warn('[need-intake] listing enrich failed:', e instanceof Error ? e.message : e);
    return null;
  }
}
