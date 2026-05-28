import type { TransactionType } from '@/intake/types';
import type { ConstrainedSelectionParsed } from '@/ai/schema/extractionSchema';
import type { AiCandidateRetrievalSet, AiExtractionRaw } from '@/ai/types';
import type { IntakeEntities } from '@/intake/types';
import { normalizeCategoryPair } from '@/config/categories';
import { simplifiedCategoryKey } from '@/intake/dictionaries/categoryIndex';
import { getCategoryPath } from '@/config/categories';
import { recordValidationReject as recordInMemoryReject } from '@/ai/observability/metrics';
import { persistRejectEventAsync } from '@/ai/analytics/rejectAnalysis';

const TX_ALIASES: Record<string, TransactionType> = {
  BUY: 'BUY',
  RENT: 'RENT',
  FULL_DEPOSIT: 'FULL_DEPOSIT',
  FULL_MORTGAGE: 'FULL_DEPOSIT',
  DEPOSIT_AND_RENT: 'DEPOSIT_AND_RENT',
  DAILY_RENT: 'DAILY_RENT',
  HOURLY_RENT: 'HOURLY_RENT',
  SELL: 'SELL',
  SERVICE_REQUEST: 'RENT',
};

function normalizeKey(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return value.trim().toLowerCase();
}

export interface ValidationRejectDetail {
  field: string;
  value: unknown;
  reason: string;
}

export interface ConstrainedValidationResult {
  patch: Partial<IntakeEntities>;
  rejects: ValidationRejectDetail[];
  acceptedSlugs: {
    categorySlug: string | null;
    citySlug: string | null;
    neighborhoodSlug: string | null;
    transactionType: TransactionType | null;
  };
}

function reject(
  rejects: ValidationRejectDetail[],
  field: string,
  value: unknown,
  reason: string,
  provider?: string | null
): void {
  rejects.push({ field, value, reason });
  recordInMemoryReject(field, String(value ?? ''));
  persistRejectEventAsync({ field, value, reason, provider });
}

/**
 * Strict constrained validation — AI values must exactly match candidate slugs.
 */
export function validateConstrainedSelection(
  selection: ConstrainedSelectionParsed,
  candidates: AiCandidateRetrievalSet
): ConstrainedValidationResult {
  const patch: Partial<IntakeEntities> = {};
  const rejects: ValidationRejectDetail[] = [];
  const acceptedSlugs = {
    categorySlug: null as string | null,
    citySlug: null as string | null,
    neighborhoodSlug: null as string | null,
    transactionType: null as TransactionType | null,
  };

  const categoryKey = normalizeKey(selection.category);
  if (categoryKey) {
    const hit = candidates.categories.find((c) => c.slug.toLowerCase() === categoryKey);
    if (hit) {
      const pair = normalizeCategoryPair(hit.slug);
      const leaf = pair.subcategorySlug ?? pair.categorySlug;
      const path = getCategoryPath(leaf);
      patch.categorySlug = pair.categorySlug;
      patch.subcategorySlug = pair.subcategorySlug ?? null;
      patch.vertical = path[0]?.slug ?? null;
      patch.category = simplifiedCategoryKey(leaf);
      acceptedSlugs.categorySlug = hit.slug;
    } else {
      reject(rejects, 'category', selection.category, 'not_in_candidate_list');
    }
  }

  const cityKey = normalizeKey(selection.city);
  if (cityKey) {
    const hit = candidates.cities.find(
      (c) => c.slug.toLowerCase() === cityKey || c.name.toLowerCase() === cityKey
    );
    if (hit) {
      patch.city = hit.name;
      patch.citySlug = hit.slug;
      acceptedSlugs.citySlug = hit.slug;
    } else {
      reject(rejects, 'city', selection.city, 'not_in_candidate_list');
    }
  }

  const neighborhoodKey = normalizeKey(selection.neighborhood);
  if (neighborhoodKey) {
    const hit = candidates.neighborhoods.find(
      (n) =>
        n.slug.toLowerCase() === neighborhoodKey || n.name.toLowerCase() === neighborhoodKey
    );
    if (hit) {
      patch.neighborhood = hit.name;
      patch.neighborhoodSlug = hit.slug;
      acceptedSlugs.neighborhoodSlug = hit.slug;
      if (!patch.city) patch.city = hit.cityName;
    } else {
      reject(rejects, 'neighborhood', selection.neighborhood, 'not_in_candidate_list');
    }
  }

  const txRaw = selection.transactionType?.trim().toUpperCase() ?? null;
  if (txRaw) {
    const allowed = new Set(candidates.transactionTypes.map((t) => t.value));
    const mapped = TX_ALIASES[txRaw];
    if (mapped && allowed.has(mapped)) {
      patch.transactionType = mapped;
      acceptedSlugs.transactionType = mapped;
    } else if (mapped && !allowed.has(mapped)) {
      reject(rejects, 'transactionType', selection.transactionType, 'not_allowed_for_vertical');
    } else {
      reject(rejects, 'transactionType', selection.transactionType, 'invalid_transaction_type');
    }
  }

  if (selection.budget != null && Number.isFinite(selection.budget) && selection.budget > 0) {
    patch.budgetMax = Math.round(selection.budget);
    patch.budgetMin = Math.round(selection.budget);
  }

  if (selection.area != null && Number.isFinite(selection.area) && selection.area > 0) {
    patch.area = Math.round(selection.area);
  }

  if (selection.rooms != null && Number.isFinite(selection.rooms) && selection.rooms > 0) {
    patch.rooms = Math.round(selection.rooms);
  }

  return { patch, rejects, acceptedSlugs };
}

export function toAiExtractionRaw(selection: ConstrainedSelectionParsed): AiExtractionRaw {
  return {
    category: selection.category,
    city: selection.city,
    neighborhood: selection.neighborhood,
    transactionType: selection.transactionType,
    budget: selection.budget,
    area: selection.area,
    rooms: selection.rooms,
    confidence: selection.confidence,
  };
}

/** @deprecated Use validateConstrainedSelection */
export function validateAiExtraction(
  extraction: ConstrainedSelectionParsed,
  candidates: AiCandidateRetrievalSet
): Partial<IntakeEntities> {
  return validateConstrainedSelection(extraction, candidates).patch;
}
