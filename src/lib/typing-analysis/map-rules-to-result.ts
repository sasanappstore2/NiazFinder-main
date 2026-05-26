import type { ParsedIntent } from '@/contracts/need-intake';
import type { TypingAnalysisResult } from '@/contracts/typing-analysis';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import {
  classifyVertical,
  type VerticalClassification,
} from '@/lib/need-intake/vertical-classifier';
import { hashTypingText } from './hash';
import { extractKeywords, extractTags } from './extract-keywords';
import { detectSpam } from './spam-detector';
import { detectDuplicate } from './duplicate-detector';
import { buildSuggestions } from './suggest';
import { isTooShortForAnalysis } from './normalize-text';

function mapIntentSlug(parsed: ParsedIntent, vertical: VerticalClassification, text: string): string {
  const norm = text.toLowerCase();
  if (vertical.vertical === 'jobs') {
    if (norm.includes('استخدام') || norm.includes('نیرو') || norm.includes('دنبال برنامه')) {
      return 'hire_developer';
    }
    if (norm.includes('جستجوی کار') || norm.includes('کارجو')) return 'job_seeker';
    return 'job_search';
  }
  if (vertical.vertical === 'real-estate') return 'property_search';
  if (vertical.vertical === 'vehicles') return 'vehicle_search';
  if (vertical.vertical === 'products') return 'product_search';
  if (vertical.vertical === 'social') return 'help_request';
  return parsed.intentType;
}

function shouldPreload(confidence: number, categorySlug: string): TypingAnalysisResult['preloads'] {
  if (confidence < 0.72 || !categorySlug || categorySlug === 'services') {
    return undefined;
  }
  return { specialists: true, requests: true };
}

export async function mapRulesToTypingResult(
  sessionId: string,
  text: string,
  options?: { seq?: number; source?: 'rules' | 'cache' }
): Promise<TypingAnalysisResult> {
  const started = Date.now();
  const trimmed = text.trim();
  const textHash = hashTypingText(trimmed);

  if (isTooShortForAnalysis(trimmed)) {
    return {
      sessionId,
      textHash,
      intent: 'general',
      categorySlug: 'services',
      confidence: 0,
      tags: [],
      keywords: [],
      suggestions: buildSuggestions(trimmed),
      spam: { isSpam: false },
      duplicate: { likely: false },
      latencyMs: Date.now() - started,
      source: options?.source ?? 'rules',
      seq: options?.seq,
    };
  }

  const vertical = classifyVertical(trimmed);
  const parsed = parseIntentFromText(trimmed);
  const spam = detectSpam(trimmed);
  const duplicate = spam.isSpam ? { likely: false } : await detectDuplicate(trimmed);
  const keywords = extractKeywords(trimmed);
  const tags = extractTags(trimmed, parsed.subcategorySlug ?? parsed.categorySlug);
  const confidence = Math.min(
    1,
    Math.max(parsed.confidence, vertical.score / 20, vertical.certainty * 0.85)
  );
  const categorySlug = parsed.subcategorySlug ?? parsed.categorySlug;
  const intent = mapIntentSlug(parsed, vertical, trimmed);

  return {
    sessionId,
    textHash,
    intent,
    categorySlug,
    subcategorySlug: parsed.subcategorySlug,
    confidence: Number(confidence.toFixed(3)),
    tags,
    keywords,
    suggestions: buildSuggestions(trimmed),
    spam,
    duplicate,
    preloads: shouldPreload(confidence, categorySlug),
    latencyMs: Date.now() - started,
    source: options?.source ?? 'rules',
    seq: options?.seq,
  };
}
