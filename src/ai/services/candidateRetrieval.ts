import type {
  AiCandidateCategory,
  AiCandidateCity,
  AiCandidateNeighborhood,
  AiCandidateRetrievalSet,
  AiCandidateTransactionType,
} from '@/ai/types';
import type { IntakeAnalysisResult, IntakeEntities, IntakeIndexes, CityIndexEntry } from '@/intake/types';
import { CategoryMatcher } from '@/intake/matchers/categoryMatcher';
import { CityMatcher } from '@/intake/matchers/cityMatcher';
import { NeighborhoodMatcher } from '@/intake/matchers/neighborhoodMatcher';
import { getCategoryBySlug } from '@/config/categories';
import { resolveTemplateFromDraftEntities } from '@/intake/template/resolveTemplate';
import { extractTransactionType } from '@/intake/extractors/transactionExtractor';
import type { ClassifierVertical } from '@/lib/need-intake/vertical-classifier';
import { slugBelongsToAnyVertical } from '@/intake/intelligence-engine/hybrid/vertical-slug-index';

const TOP_CATEGORIES = 5;
const TOP_CITIES = 5;
const TOP_NEIGHBORHOODS = 10;

const REAL_ESTATE_TX: AiCandidateTransactionType[] = [
  { value: 'BUY', label: 'خرید' },
  { value: 'RENT', label: 'اجاره' },
  { value: 'FULL_DEPOSIT', label: 'رهن کامل' },
  { value: 'DEPOSIT_AND_RENT', label: 'رهن و اجاره' },
  { value: 'DAILY_RENT', label: 'اجاره روزانه' },
];

const VEHICLE_TX: AiCandidateTransactionType[] = [
  { value: 'BUY', label: 'خرید' },
  { value: 'RENT', label: 'اجاره' },
];

const SERVICE_TX: AiCandidateTransactionType[] = [
  { value: 'RENT', label: 'درخواست خدمت' },
];

const GENERAL_TX: AiCandidateTransactionType[] = [
  { value: 'BUY', label: 'خرید' },
  { value: 'RENT', label: 'اجاره' },
];

function dedupeCategories(items: AiCandidateCategory[]): AiCandidateCategory[] {
  const seen = new Set<string>();
  const out: AiCandidateCategory[] = [];
  for (const item of items) {
    if (seen.has(item.slug)) continue;
    seen.add(item.slug);
    out.push(item);
  }
  return out;
}

function cityBySlug(
  indexes: IntakeIndexes,
  slug: string | null | undefined
): CityIndexEntry | undefined {
  if (!slug) return undefined;
  return [...indexes.cities.values()].find((c) => c.slug === slug);
}

function transactionTypesForVertical(vertical: string | null): AiCandidateTransactionType[] {
  if (vertical === 'real-estate') return REAL_ESTATE_TX;
  if (vertical === 'vehicles') return VEHICLE_TX;
  if (vertical === 'services') return SERVICE_TX;
  return GENERAL_TX;
}

function boostFromRuleEntities(
  slug: string,
  entities: IntakeEntities,
  ruleConfidence: Partial<Record<string, number>>
): number {
  let boost = 0;
  const leaf = entities.subcategorySlug ?? entities.categorySlug;
  if (leaf === slug) boost += 0.35;
  if (entities.citySlug === slug) boost += 0.35;
  if (entities.neighborhoodSlug === slug) boost += 0.35;
  if (ruleConfidence.category && leaf === slug) boost += ruleConfidence.category * 0.1;
  return boost;
}

function relatedTemplateCategorySlugs(entities: IntakeEntities): string[] {
  const template = resolveTemplateFromDraftEntities(entities);
  const leaf = entities.subcategorySlug ?? entities.categorySlug;
  const slugs = new Set<string>();
  if (leaf) slugs.add(leaf);
  if (template.id && template.id !== leaf) slugs.add(template.id);
  return [...slugs];
}

/**
 * Retrieve ranked candidate sets for constrained AI selection.
 * Never returns full registry — only top-N from matchers + rule hints.
 */
export interface CandidateRetrievalOptions {
  verticalFilter?: readonly ClassifierVertical[];
  maxCategories?: number;
}

export function retrieveIntakeCandidates(
  indexes: IntakeIndexes,
  tokens: readonly string[],
  ngrams: readonly string[],
  ruleResult: IntakeAnalysisResult,
  opts?: CandidateRetrievalOptions
): AiCandidateRetrievalSet {
  const entities = ruleResult.entities;
  const ruleConfidence = ruleResult.confidence;

  const preferredCityId = entities.citySlug
    ? [...indexes.cities.values()].find((c) => c.slug === entities.citySlug)?.id ?? null
    : null;

  const categoryHits = new CategoryMatcher(indexes).match(tokens, ngrams);
  const cityHits = new CityMatcher(indexes).match(tokens, ngrams);
  const neighborhoodHits = new NeighborhoodMatcher(indexes, preferredCityId).match(
    tokens,
    ngrams
  );

  const categoryMap = new Map<string, AiCandidateCategory>();

  for (const hit of categoryHits.slice(0, TOP_CATEGORIES)) {
    const meta = getCategoryBySlug(hit.entry.slug);
    categoryMap.set(hit.entry.slug, {
      slug: hit.entry.slug,
      title: meta?.title ?? hit.entry.title,
      rankScore: Math.min(1, hit.score + boostFromRuleEntities(hit.entry.slug, entities, ruleConfidence)),
    });
  }

  for (const slug of relatedTemplateCategorySlugs(entities)) {
    if (categoryMap.size >= TOP_CATEGORIES + 2) break;
    if (categoryMap.has(slug)) continue;
    const entry = indexes.categories.get(slug);
    if (!entry) continue;
    const meta = getCategoryBySlug(slug);
    categoryMap.set(slug, {
      slug,
      title: meta?.title ?? entry.title,
      rankScore: 0.55 + boostFromRuleEntities(slug, entities, ruleConfidence),
    });
  }

  const leaf = entities.subcategorySlug ?? entities.categorySlug;
  if (leaf && indexes.categories.has(leaf) && !categoryMap.has(leaf)) {
    const entry = indexes.categories.get(leaf)!;
    const meta = getCategoryBySlug(leaf);
    categoryMap.set(leaf, {
      slug: leaf,
      title: meta?.title ?? entry.title,
      rankScore: 0.75 + boostFromRuleEntities(leaf, entities, ruleConfidence),
    });
  }

  const categories = dedupeCategories([...categoryMap.values()])
    .filter((c) => {
      if (!opts?.verticalFilter?.length) return true;
      return slugBelongsToAnyVertical(c.slug, opts.verticalFilter);
    })
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
    .slice(0, opts?.maxCategories ?? TOP_CATEGORIES);

  const cityMap = new Map<string, AiCandidateCity>();
  for (const hit of cityHits.slice(0, TOP_CITIES)) {
    cityMap.set(hit.entry.slug, {
      id: hit.entry.id,
      slug: hit.entry.slug,
      name: hit.entry.name,
      rankScore: Math.min(1, hit.score + boostFromRuleEntities(hit.entry.slug, entities, ruleConfidence)),
    });
  }
  if (entities.citySlug) {
    const bySlug = cityBySlug(indexes, entities.citySlug);
    if (bySlug && !cityMap.has(bySlug.slug)) {
      cityMap.set(bySlug.slug, {
        id: bySlug.id,
        slug: bySlug.slug,
        name: bySlug.name,
        rankScore: 0.8,
      });
    }
  }
  if (entities.city) {
    const byName = [...indexes.cities.values()].find((c) => c.name === entities.city);
    if (byName && !cityMap.has(byName.slug)) {
      cityMap.set(byName.slug, {
        id: byName.id,
        slug: byName.slug,
        name: byName.name,
        rankScore: 0.78,
      });
    }
  }
  const cities = [...cityMap.values()]
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
    .slice(0, TOP_CITIES);

  const neighborhoodMap = new Map<string, AiCandidateNeighborhood>();
  for (const hit of neighborhoodHits.slice(0, TOP_NEIGHBORHOODS)) {
    neighborhoodMap.set(hit.entry.slug, {
      slug: hit.entry.slug,
      name: hit.entry.name,
      cityId: hit.entry.cityId,
      cityName: hit.entry.cityName,
      rankScore: Math.min(
        1,
        hit.score + boostFromRuleEntities(hit.entry.slug, entities, ruleConfidence)
      ),
    });
  }
  if (entities.neighborhoodSlug && indexes.neighborhoods.has(entities.neighborhoodSlug)) {
    const n = indexes.neighborhoods.get(entities.neighborhoodSlug)!;
    if (!neighborhoodMap.has(n.slug)) {
      neighborhoodMap.set(n.slug, {
        slug: n.slug,
        name: n.name,
        cityId: n.cityId,
        cityName: n.cityName,
        rankScore: 0.82,
      });
    }
  }
  const neighborhoods = [...neighborhoodMap.values()]
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0))
    .slice(0, TOP_NEIGHBORHOODS);

  const txFromText = extractTransactionType(ruleResult.normalizedText);
  const vertical = entities.vertical ?? null;
  let transactionTypes = transactionTypesForVertical(vertical);
  if (txFromText) {
    const exists = transactionTypes.some((t) => t.value === txFromText.type);
    if (!exists) {
      transactionTypes = [
        { value: txFromText.type, label: txFromText.type },
        ...transactionTypes,
      ];
    }
  }

  return {
    categories,
    cities,
    neighborhoods,
    transactionTypes,
    retrievalCount: categories.length + cities.length + neighborhoods.length,
  };
}

/** Legacy adapter — strips rank scores for backward-compatible consumers. */
export function toLegacyCandidates(set: AiCandidateRetrievalSet) {
  return {
    categories: set.categories.map(({ slug, title }) => ({ slug, title })),
    cities: set.cities.map(({ id, slug, name }) => ({ id, slug, name })),
    neighborhoods: set.neighborhoods.map(({ slug, name, cityId, cityName }) => ({
      slug,
      name,
      cityId,
      cityName,
    })),
    transactionTypes: set.transactionTypes,
  };
}
