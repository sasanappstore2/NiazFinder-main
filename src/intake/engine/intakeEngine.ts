import type {
  IntakeAnalysisResult,
  IntakeConfidence,
  IntakeEntities,
  IntakeIndexes,
  CityIndexEntry,
} from '@/intake/types';
import { normalizePersian, normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { bestCategoryMatch } from '@/intake/matchers/categoryMatcher';
import { bestCityMatch } from '@/intake/matchers/cityMatcher';
import { bestNeighborhoodMatch } from '@/intake/matchers/neighborhoodMatcher';
import {
  extractArea,
  extractBudget,
  extractRooms,
} from '@/intake/extractors/attributeExtractors';
import {
  categoryNeedsTransactionType,
  extractTransactionType,
} from '@/intake/extractors/transactionExtractor';
import { simplifiedCategoryKey } from '@/intake/dictionaries/categoryIndex';
import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import { buildNextQuestion } from '@/intake/wizard/wizardBuilder';
import {
  buildPrioritizedMissingFields,
  completionStateFromScore,
  computeCompletionScore,
} from '@/intake/schema/needSchema';
import { clampConfidence, overallConfidence } from '@/intake/scoring/confidenceEngine';
import { computeMatchabilityScore } from '@/intake/scoring/matchabilityEngine';
import { resolveNeedType } from '@/intake/schema/needTypes';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { runSemanticResolver } from '@/ai/services/semanticResolver';
import type { IntakeAnalysisTrace } from '@/intake/training/trainingExample';
import { applyLaunchIntakeEntityPolicy } from '@/lib/need-intake/intake-launch-policy';

export interface AnalyzeNeedTextOptions {
  /** City slug from home picker / URL — neighborhoods resolve in this city first. */
  preferredCitySlug?: string | null;
  /** Persian city name fallback when slug is unavailable. */
  preferredCityName?: string | null;
}

function resolvePreferredCityEntry(
  indexes: IntakeIndexes,
  options?: AnalyzeNeedTextOptions
): CityIndexEntry | null {
  const slug = options?.preferredCitySlug?.trim().toLowerCase();
  if (slug) {
    for (const entry of indexes.cities.values()) {
      if (entry.slug === slug || entry.id === slug) return entry;
    }
  }

  const name = options?.preferredCityName?.trim();
  if (name) {
    const key = normalizeLookupKey(name);
    const byLookup = key ? indexes.cityLookup.get(key) : undefined;
    if (byLookup) return indexes.cities.get(byLookup) ?? null;
    for (const entry of indexes.cities.values()) {
      if (entry.name === name) return entry;
    }
  }

  return null;
}

function buildEntities(
  indexes: IntakeIndexes,
  normalizedText: string,
  tokens: readonly string[],
  ngrams: readonly string[],
  options?: AnalyzeNeedTextOptions
): { entities: IntakeEntities; confidence: IntakeConfidence } {
  const confidence: IntakeConfidence = {};
  const entities: IntakeEntities = {
    vertical: null,
    category: null,
    categorySlug: null,
    subcategorySlug: null,
    city: null,
    citySlug: null,
    province: null,
    neighborhood: null,
    neighborhoodSlug: null,
    area: null,
    budgetMin: null,
    budgetMax: null,
    rooms: null,
    transactionType: null,
    lat: null,
    lng: null,
  };

  const categoryHit = bestCategoryMatch(indexes, tokens, ngrams);
  if (categoryHit) {
    const pair = normalizeCategoryPair(categoryHit.entry.slug);
    entities.categorySlug = pair.categorySlug;
    entities.subcategorySlug = pair.subcategorySlug ?? null;
    const leaf = pair.subcategorySlug ?? pair.categorySlug;
    const path = getCategoryPath(leaf);
    entities.vertical = path[0]?.slug ?? null;
    entities.category = simplifiedCategoryKey(leaf);
    confidence.category = clampConfidence(categoryHit.score);
  }

  const preferredCity = resolvePreferredCityEntry(indexes, options);
  const cityHit = bestCityMatch(indexes, tokens, ngrams);

  if (cityHit && (!preferredCity || cityHit.entry.id === preferredCity.id || cityHit.score >= 0.95)) {
    entities.city = cityHit.entry.name;
    entities.citySlug = cityHit.entry.slug;
    entities.province = cityHit.entry.provinceName || null;
    confidence.city = clampConfidence(cityHit.score);
  } else if (preferredCity) {
    entities.city = preferredCity.name;
    entities.citySlug = preferredCity.slug;
    entities.province = preferredCity.provinceName || null;
    confidence.city = 0.88;
  }

  const neighborhoodCityId = preferredCity?.id ?? cityHit?.entry.id ?? null;
  const neighborhoodHit = bestNeighborhoodMatch(
    indexes,
    tokens,
    ngrams,
    neighborhoodCityId,
    normalizedText
  );
  if (neighborhoodHit && neighborhoodHit.score >= 0.65) {
    entities.neighborhood = neighborhoodHit.entry.name;
    entities.neighborhoodSlug = neighborhoodHit.entry.slug;
    confidence.neighborhood = clampConfidence(neighborhoodHit.score);

    if (!entities.city) {
      entities.city = neighborhoodHit.entry.cityName;
      const cityMeta = indexes.cities.get(neighborhoodHit.entry.cityId) ?? null;
      entities.citySlug = cityMeta?.slug ?? null;
      entities.province = cityMeta?.provinceName ?? null;
      confidence.city = clampConfidence((confidence.city ?? 0.7) + 0.1);
    }
  }

  const area = extractArea(normalizedText);
  if (area.value != null) {
    entities.area = area.value;
    confidence.area = area.confidence;
  }

  const rooms = extractRooms(normalizedText);
  if (rooms.value != null) {
    entities.rooms = rooms.value;
    confidence.rooms = rooms.confidence;
  }

  const budget = extractBudget(normalizedText);
  if (budget.min != null) {
    entities.budgetMin = budget.min;
    entities.budgetMax = budget.max ?? budget.min;
    confidence.budget = budget.confidence;
  }

  const tx = extractTransactionType(normalizedText);
  if (tx) {
    entities.transactionType = tx.type;
    confidence.transactionType = tx.confidence;
  }

  // Refine category slug when transaction type implies rent vs sale
  if (entities.categorySlug && entities.transactionType && categoryNeedsTransactionType(entities.categorySlug)) {
    const base = entities.categorySlug;
    if (
      (entities.transactionType === 'BUY' || entities.transactionType === 'SELL') &&
      base.includes('rent') &&
      !base.includes('sale')
    ) {
      const saleVariant = base.replace('-rent', '-sale');
      if (indexes.categories.has(saleVariant)) {
        const pair = normalizeCategoryPair(saleVariant);
        entities.categorySlug = pair.categorySlug;
        entities.subcategorySlug = pair.subcategorySlug ?? null;
      }
    }
    if (
      (entities.transactionType === 'RENT' ||
        entities.transactionType === 'FULL_DEPOSIT' ||
        entities.transactionType === 'DEPOSIT_AND_RENT' ||
        entities.transactionType === 'DAILY_RENT') &&
      base.includes('sale') &&
      !base.includes('rent')
    ) {
      const rentVariant = base.replace('-sale', '-rent');
      if (indexes.categories.has(rentVariant)) {
        const pair = normalizeCategoryPair(rentVariant);
        entities.categorySlug = pair.categorySlug;
        entities.subcategorySlug = pair.subcategorySlug ?? null;
      }
    }
  }

  return { entities, confidence };
}

/**
 * Central orchestration: analyze free-text Persian need into structured entities,
 * confidence scores, missing fields, and the next dynamic wizard question.
 * Rule engine only — synchronous, no AI.
 */
export function analyzeNeedText(
  text: string,
  indexes: IntakeIndexes,
  options?: AnalyzeNeedTextOptions
): IntakeAnalysisResult {
  const started = performance.now();
  const normalizedText = normalizePersian(text);
  const tokens = tokenize(normalizedText, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);

  const { entities, confidence } = buildEntities(
    indexes,
    normalizedText,
    tokens,
    ngrams.all,
    options
  );

  const policyEntities = applyLaunchIntakeEntityPolicy(text, entities);

  return buildAnalysisFromEntities(policyEntities, confidence, normalizedText, started);
}

/** Build full analysis from pre-extracted entities (used by Qwen merge path). */
export function buildAnalysisFromEntities(
  entities: IntakeEntities,
  confidence: IntakeConfidence,
  normalizedText: string,
  started: number
): IntakeAnalysisResult {
  const missingFields = buildPrioritizedMissingFields(entities, {
    sourceText: normalizedText,
  });
  const nextQuestion = buildNextQuestion(entities, missingFields);
  const completionScore = computeCompletionScore(missingFields);
  const matchabilityScore = computeMatchabilityScore(entities);
  const completionState = completionStateFromScore(completionScore);
  const needType = resolveNeedType(entities);

  return {
    entities,
    confidence,
    needType: needType.key,
    detectedVertical: entities.vertical,
    detectedCategory: entities.category,
    missingFields,
    nextQuestion,
    recommendedQuestions: missingFields.map((f) => f.field),
    completionScore,
    matchabilityScore,
    completionState,
    sections: needType.sections.map((s) => ({
      key: s.key,
      label: s.label,
      fields: [...s.fields],
    })),
    normalizedText,
    latencyMs: Math.round(performance.now() - started),
  };
}

export interface AnalyzeNeedTextAsyncMeta {
  engine: 'intake-rules' | 'intake-rules+ai';
  ruleConfidence: number;
  aiInvoked: boolean;
  aiProvider: string | null;
  aiLatencyMs: number;
  trace?: IntakeAnalysisTrace;
}

function buildTrace(
  ruleResult: IntakeAnalysisResult,
  resolved: Awaited<ReturnType<typeof runSemanticResolver>> | null,
  ruleConfidence: number
): IntakeAnalysisTrace {
  return {
    ruleResult,
    aiInvoked: resolved?.aiInvoked ?? false,
    aiExtraction: resolved?.aiExtraction ?? null,
    validatedPatch: resolved?.validatedPatch ?? null,
    validationRejects: resolved?.validationRejects ?? [],
    candidates: resolved?.candidates ?? null,
    aiProvider: resolved?.provider ?? null,
    aiLatencyMs: resolved?.aiLatencyMs ?? 0,
    ruleConfidence,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Rule engine first; if overall confidence < threshold and AI enabled,
 * invoke semantic resolver (advisory only — never overrides rule entities).
 */
export async function analyzeNeedTextAsync(
  text: string,
  indexes: IntakeIndexes,
  options?: { forceAi?: boolean; providerOverride?: string } & AnalyzeNeedTextOptions
): Promise<IntakeAnalysisResult & { meta: AnalyzeNeedTextAsyncMeta }> {
  const { forceAi, providerOverride, ...analyzeOptions } = options ?? {};
  const ruleResult = analyzeNeedText(text, indexes, analyzeOptions);
  const config = getAiSemanticConfig();
  const ruleConfidence = overallConfidence(ruleResult.confidence);

  if (!config.enabled && !options?.forceAi) {
    const trace = buildTrace(ruleResult, null, ruleConfidence);
    return {
      ...ruleResult,
      meta: {
        engine: 'intake-rules',
        ruleConfidence,
        aiInvoked: false,
        aiProvider: null,
        aiLatencyMs: 0,
        trace,
      },
    };
  }

  if (ruleConfidence >= config.confidenceThreshold && !options?.forceAi) {
    const trace = buildTrace(ruleResult, null, ruleConfidence);
    return {
      ...ruleResult,
      meta: {
        engine: 'intake-rules',
        ruleConfidence,
        aiInvoked: false,
        aiProvider: null,
        aiLatencyMs: 0,
        trace,
      },
    };
  }

  const normalizedText = ruleResult.normalizedText;
  const tokens = tokenize(normalizedText, { removeStopWords: true });
  const ngrams = generateNgrams(tokens);

  const resolved = await runSemanticResolver(
    ruleResult,
    text,
    indexes,
    tokens,
    ngrams.all,
    options
  );

  return {
    ...resolved.mergedResult,
    latencyMs: ruleResult.latencyMs + resolved.aiLatencyMs,
    meta: {
      engine: resolved.aiInvoked ? 'intake-rules+ai' : 'intake-rules',
      ruleConfidence,
      aiInvoked: resolved.aiInvoked,
      aiProvider: resolved.provider,
      aiLatencyMs: resolved.aiLatencyMs,
      trace: buildTrace(ruleResult, resolved, ruleConfidence),
    },
  };
}
