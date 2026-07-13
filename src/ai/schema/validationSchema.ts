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

  const budgetMax =
    selection.budgetMax ?? selection.budget ?? null;
  const budgetMin = selection.budgetMin ?? null;
  if (budgetMax != null && Number.isFinite(budgetMax) && budgetMax > 0 && budgetMax < 1e15) {
    patch.budgetMax = Math.round(budgetMax);
  } else if (budgetMax != null) {
    reject(rejects, 'budget', budgetMax, 'out_of_range');
  }
  if (budgetMin != null && Number.isFinite(budgetMin) && budgetMin > 0 && budgetMin < 1e15) {
    patch.budgetMin = Math.round(budgetMin);
  }

  if (selection.area != null && Number.isFinite(selection.area)) {
    if (selection.area >= 5 && selection.area <= 100_000) {
      patch.area = Math.round(selection.area);
    } else {
      reject(rejects, 'area', selection.area, 'out_of_range');
    }
  }

  if (selection.rooms != null && Number.isFinite(selection.rooms)) {
    if (selection.rooms >= 0 && selection.rooms <= 30) {
      patch.rooms = Math.round(selection.rooms);
    } else {
      reject(rejects, 'rooms', selection.rooms, 'out_of_range');
    }
  }

  // Rent/rahn money fields live on answers/entities extension via patch extras.
  const moneyExtras = patch as Partial<IntakeEntities> & {
    rahnAmount?: number;
    monthlyRent?: number;
    deposit?: number;
  };
  if (
    selection.rahnAmount != null &&
    Number.isFinite(selection.rahnAmount) &&
    selection.rahnAmount > 0 &&
    selection.rahnAmount < 1e15
  ) {
    moneyExtras.rahnAmount = Math.round(selection.rahnAmount);
  }
  if (
    selection.monthlyRent != null &&
    Number.isFinite(selection.monthlyRent) &&
    selection.monthlyRent > 0 &&
    selection.monthlyRent < 1e15
  ) {
    moneyExtras.monthlyRent = Math.round(selection.monthlyRent);
  }
  if (
    selection.deposit != null &&
    Number.isFinite(selection.deposit) &&
    selection.deposit > 0 &&
    selection.deposit < 1e15
  ) {
    moneyExtras.deposit = Math.round(selection.deposit);
  }

  return { patch, rejects, acceptedSlugs };
}

export function toAiExtractionRaw(selection: ConstrainedSelectionParsed): AiExtractionRaw {
  return {
    category: selection.category,
    city: selection.city,
    neighborhood: selection.neighborhood,
    transactionType: selection.transactionType,
    budget: selection.budget ?? selection.budgetMax ?? null,
    budgetMin: selection.budgetMin ?? null,
    budgetMax: selection.budgetMax ?? selection.budget ?? null,
    rahnAmount: selection.rahnAmount ?? null,
    monthlyRent: selection.monthlyRent ?? null,
    deposit: selection.deposit ?? null,
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
