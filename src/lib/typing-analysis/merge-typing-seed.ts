import type { IntentType, ParsedIntent } from '@/contracts/need-intake';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { normalizeCategoryPair } from '@/config/categories';

const INTENT_SLUG_TO_TYPE: Record<string, IntentType> = {
  hire_developer: 'job_search',
  job_seeker: 'job_search',
  job_search: 'job_search',
  property_search: 'property_search',
  vehicle_search: 'vehicle_search',
  product_search: 'product_search',
  help_request: 'help_request',
  general: 'service_request',
};

export function typingIntentToParsedType(slug: string): IntentType {
  return INTENT_SLUG_TO_TYPE[slug] ?? 'service_request';
}

/** Merge lightweight typing hints into full parse result (seed only). */
export function mergeTypingIntoParsed(
  parsed: ParsedIntent,
  typing: TypingAnalysisResult | null
): ParsedIntent {
  if (!typing || typing.confidence < 0.35) return parsed;

  const pair = normalizeCategoryPair(typing.categorySlug, typing.subcategorySlug);
  const fromTyping = typing.confidence >= parsed.confidence;

  return {
    ...parsed,
    intentType: fromTyping ? typingIntentToParsedType(typing.intent) : parsed.intentType,
    categorySlug: fromTyping ? pair.categorySlug : parsed.categorySlug,
    subcategorySlug: fromTyping ? pair.subcategorySlug : parsed.subcategorySlug,
    confidence: Math.max(parsed.confidence, typing.confidence * 0.9),
    entities: {
      ...parsed.entities,
      ...(typing.keywords.length
        ? { _typingKeywords: typing.keywords.slice(0, 8).join(',') }
        : {}),
    },
  };
}
