import type { ParsedIntent } from '@/contracts/need-intake';
import type { TransactionType } from '@/intake/types';
import {
  analyzeNeedText,
  buildAnalysisFromEntities,
  type AnalyzeNeedTextOptions,
} from '@/intake/engine/intakeEngine';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';
import { simplifiedCategoryKey } from '@/intake/dictionaries/categoryIndex';
import { getCategoryPath, normalizeCategoryPair } from '@/config/categories';
import { clampConfidence, overallConfidence } from '@/intake/scoring/confidenceEngine';
import type { IntakeAnalysisResult, IntakeConfidence, IntakeEntities, IntakeIndexes } from '@/intake/types';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { reconcileParsedIntent } from '@/lib/need-intake/parse-coherence';
import { isNeedIntakeLlmEnabled, parseIntentViaQwen } from '@/lib/need-intake/qwen-intake-client';
import { toAsciiDigits } from '@/lib/need-intake/extract-property-slots';

export type IntakeAnalyzeEngine = 'intake-rules' | 'intake-qwen' | 'intake-qwen+rules';

export interface AnalyzeNeedTextViaQwenMeta {
  engine: IntakeAnalyzeEngine;
  ruleConfidence: number;
  qwenInvoked: boolean;
  qwenLatencyMs: number;
}

function mapDealTypeToTransaction(dealType: string | undefined): TransactionType | null {
  if (!dealType) return null;
  const v = dealType.trim().toLowerCase();
  if (v === 'buy' || v === 'purchase') return 'BUY';
  if (v === 'sell' || v === 'sale') return 'SELL';
  if (v === 'rent' || v === 'monthly_rent') return 'RENT';
  if (v === 'full_deposit' || v === 'mortgage') return 'FULL_DEPOSIT';
  if (v === 'deposit_and_rent') return 'DEPOSIT_AND_RENT';
  if (v === 'daily_rent' || v === 'nightly') return 'DAILY_RENT';
  if (v === 'hourly_rent') return 'HOURLY_RENT';
  return null;
}

function parseRooms(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const m = toAsciiDigits(value).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseArea(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const n = Number(toAsciiDigits(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function resolveCityFromParsed(
  indexes: IntakeIndexes,
  cityName: string | undefined,
  options?: AnalyzeNeedTextOptions
): Pick<IntakeEntities, 'city' | 'citySlug' | 'province'> | null {
  const preferredSlug = options?.preferredCitySlug?.trim().toLowerCase();
  if (preferredSlug) {
    for (const entry of indexes.cities.values()) {
      if (entry.slug === preferredSlug || entry.id === preferredSlug) {
        return {
          city: entry.name,
          citySlug: entry.slug,
          province: entry.provinceName || null,
        };
      }
    }
  }

  const name = cityName?.trim();
  if (!name) return null;

  const key = normalizeLookupKey(name);
  const cityId = key ? indexes.cityLookup.get(key) : undefined;
  if (cityId) {
    const entry = indexes.cities.get(cityId);
    if (entry) {
      return {
        city: entry.name,
        citySlug: entry.slug,
        province: entry.provinceName || null,
      };
    }
  }

  for (const entry of indexes.cities.values()) {
    if (entry.name === name) {
      return {
        city: entry.name,
        citySlug: entry.slug,
        province: entry.provinceName || null,
      };
    }
  }

  return { city: name, citySlug: null, province: null };
}

function resolveNeighborhoodFromParsed(
  indexes: IntakeIndexes,
  neighborhoodSlug: string | undefined,
  citySlug: string | null
): Pick<IntakeEntities, 'neighborhood' | 'neighborhoodSlug' | 'city' | 'citySlug' | 'province'> | null {
  const slug = neighborhoodSlug?.trim();
  if (!slug) return null;

  const entry = indexes.neighborhoods.get(slug);
  if (entry) {
    const cityMeta = indexes.cities.get(entry.cityId);
    if (citySlug && cityMeta && cityMeta.slug !== citySlug) return null;
    return {
      neighborhood: entry.name,
      neighborhoodSlug: entry.slug,
      city: cityMeta?.name ?? entry.cityName,
      citySlug: cityMeta?.slug ?? null,
      province: cityMeta?.provinceName ?? null,
    };
  }

  const key = normalizeLookupKey(slug);
  const candidates = key ? indexes.neighborhoodLookup.get(key) : undefined;
  if (candidates?.length) {
    for (const candidateSlug of candidates) {
      const candidate = indexes.neighborhoods.get(candidateSlug);
      if (!candidate) continue;
      const cityMeta = indexes.cities.get(candidate.cityId);
      if (citySlug && cityMeta && cityMeta.slug !== citySlug) continue;
      return {
        neighborhood: candidate.name,
        neighborhoodSlug: candidate.slug,
        city: cityMeta?.name ?? candidate.cityName,
        citySlug: cityMeta?.slug ?? null,
        province: cityMeta?.provinceName ?? null,
      };
    }
  }

  return null;
}

export function mergeParsedIntentIntoAnalysis(
  ruleResult: IntakeAnalysisResult,
  parsed: ParsedIntent,
  indexes: IntakeIndexes,
  options?: AnalyzeNeedTextOptions
): { entities: IntakeEntities; confidence: IntakeConfidence } {
  const entities: IntakeEntities = { ...ruleResult.entities };
  const confidence: IntakeConfidence = { ...ruleResult.confidence };

  const pair = normalizeCategoryPair(parsed.subcategorySlug ?? parsed.categorySlug);
  if (pair.categorySlug) {
    entities.categorySlug = pair.categorySlug;
    entities.subcategorySlug = pair.subcategorySlug ?? null;
    const leaf = pair.subcategorySlug ?? pair.categorySlug;
    const path = getCategoryPath(leaf);
    entities.vertical = path[0]?.slug ?? entities.vertical;
    entities.category = simplifiedCategoryKey(leaf);
    confidence.category = clampConfidence(Math.max(confidence.category ?? 0, parsed.confidence, 0.72));
  }

  const cityResolved = resolveCityFromParsed(indexes, parsed.city, options);
  if (cityResolved?.city) {
    entities.city = cityResolved.city;
    entities.citySlug = cityResolved.citySlug;
    entities.province = cityResolved.province;
    confidence.city = clampConfidence(Math.max(confidence.city ?? 0, parsed.confidence, 0.75));
  }

  const neighborhoodResolved = resolveNeighborhoodFromParsed(
    indexes,
    parsed.neighborhoodSlug,
    entities.citySlug
  );
  if (neighborhoodResolved?.neighborhood) {
    entities.neighborhood = neighborhoodResolved.neighborhood;
    entities.neighborhoodSlug = neighborhoodResolved.neighborhoodSlug;
    confidence.neighborhood = clampConfidence(Math.max(confidence.neighborhood ?? 0, 0.72));
    if (!entities.city && neighborhoodResolved.city) {
      entities.city = neighborhoodResolved.city;
      entities.citySlug = neighborhoodResolved.citySlug;
      entities.province = neighborhoodResolved.province;
      confidence.city = clampConfidence(Math.max(confidence.city ?? 0, 0.72));
    }
  }

  if (parsed.budgetMin != null) {
    entities.budgetMin = parsed.budgetMin;
    entities.budgetMax = parsed.budgetMax ?? parsed.budgetMin;
    confidence.budget = clampConfidence(Math.max(confidence.budget ?? 0, 0.7));
  } else if (parsed.budgetMax != null) {
    entities.budgetMax = parsed.budgetMax;
    confidence.budget = clampConfidence(Math.max(confidence.budget ?? 0, 0.7));
  }

  const rooms = parseRooms(parsed.entities?.rooms);
  if (rooms != null) {
    entities.rooms = rooms;
    confidence.rooms = clampConfidence(Math.max(confidence.rooms ?? 0, 0.7));
  }

  const area = parseArea(parsed.entities?.areaMin ?? parsed.entities?.areaMax);
  if (area != null) {
    entities.area = area;
    confidence.area = clampConfidence(Math.max(confidence.area ?? 0, 0.65));
  }

  const tx = mapDealTypeToTransaction(parsed.entities?.dealType);
  if (tx) {
    entities.transactionType = tx;
    confidence.transactionType = clampConfidence(Math.max(confidence.transactionType ?? 0, 0.72));
  }

  return { entities, confidence };
}

/**
 * Rules baseline + Qwen parse/reconcile merge. Falls back to rules-only when MLX is down.
 */
export async function analyzeNeedTextViaQwen(
  text: string,
  indexes: IntakeIndexes,
  options?: AnalyzeNeedTextOptions
): Promise<IntakeAnalysisResult & { meta: AnalyzeNeedTextViaQwenMeta }> {
  const started = performance.now();
  const ruleResult = analyzeNeedText(text, indexes, options);
  const ruleConfidence = overallConfidence(ruleResult.confidence);

  if (!isNeedIntakeLlmEnabled()) {
    return {
      ...ruleResult,
      meta: {
        engine: 'intake-rules',
        ruleConfidence,
        qwenInvoked: false,
        qwenLatencyMs: 0,
      },
    };
  }

  const qwenStarted = performance.now();
  const rulesParsed = parseFromText(text);
  const llm = await parseIntentViaQwen(text);
  const qwenLatencyMs = Math.round(performance.now() - qwenStarted);

  if (!llm) {
    return {
      ...ruleResult,
      meta: {
        engine: 'intake-rules',
        ruleConfidence,
        qwenInvoked: false,
        qwenLatencyMs,
      },
    };
  }

  const reconciled = reconcileParsedIntent(llm.parsed, rulesParsed, text);
  const merged = mergeParsedIntentIntoAnalysis(ruleResult, reconciled, indexes, options);
  const analysis = buildAnalysisFromEntities(
    merged.entities,
    merged.confidence,
    ruleResult.normalizedText,
    started
  );

  return {
    ...analysis,
    meta: {
      engine: 'intake-qwen+rules',
      ruleConfidence,
      qwenInvoked: true,
      qwenLatencyMs,
    },
  };
}
