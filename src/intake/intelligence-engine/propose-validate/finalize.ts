/**
 * Stage 3: write validated category + location into the field bag (auto-fill
 * when clearly best), else surface top candidates for the existing chip UI.
 * Everything written here is catalog/tree-confirmed → no hallucinated values.
 */
import { setField, type IntakeFieldBag } from '@/intake/intelligence-engine/types';
import { normalizeCategoryPair } from '@/config/categories';
import { categoryCandidatesForUi } from '@/intake/intelligence-engine/disambiguation/category-disambiguation';
import { proposeValidateThresholds } from '@/intake/rules/config';
import type { CategoryCandidateOption } from '@/contracts/need-intake';
import type { ValidatedCategories } from '@/intake/intelligence-engine/propose-validate/validate-categories';
import type { ValidatedLocation } from '@/intake/intelligence-engine/propose-validate/validate-location';

export interface ProposeValidateFinalization {
  categoryCandidates?: CategoryCandidateOption[];
  cityCandidates?: Array<{ cityId: string; label: string; score?: number }>;
  neighborhoodCandidates?: Array<{ slug: string; label: string; city?: string }>;
  categoryResolved: boolean;
  cityResolved: boolean;
  neighborhoodResolved: boolean;
}

export function applyProposeValidateToFieldBag(
  bag: IntakeFieldBag,
  cat: ValidatedCategories,
  loc: ValidatedLocation,
): ProposeValidateFinalization {
  const th = proposeValidateThresholds();
  const out: ProposeValidateFinalization = {
    categoryResolved: false,
    cityResolved: false,
    neighborhoodResolved: false,
  };

  // ── Category: auto-fill on a clear winner, else chips ──
  const top = cat.candidates[0];
  const second = cat.candidates[1];
  const clearWinner =
    !!top &&
    top.confidence >= th.categoryClearMin &&
    (!second || top.confidence - second.confidence >= th.categoryClearMargin);
  if (clearWinner && cat.top) {
    const pair = normalizeCategoryPair(cat.top.categorySlug, cat.top.subcategorySlug);
    setField(bag, 'categorySlug', {
      value: pair.categorySlug,
      confidence: top.confidence,
      source: 'ai',
      evidence: 'propose-validate',
    });
    if (pair.subcategorySlug) {
      setField(bag, 'subcategorySlug', {
        value: pair.subcategorySlug,
        confidence: top.confidence,
        source: 'ai',
        evidence: 'propose-validate',
      });
    }
    out.categoryResolved = true;
  } else if (cat.candidates.length >= 1) {
    out.categoryCandidates = categoryCandidatesForUi(cat.candidates);
  }

  // ── City / province ──
  if (loc.citySlug && loc.cityName) {
    const conf =
      loc.citySource === 'scope' ? 0.95 : loc.citySource === 'rag' ? 0.85 : 0.9;
    setField(bag, 'city', {
      value: loc.cityName,
      confidence: conf,
      source: 'ai',
      evidence: `propose-validate:${loc.citySource}`,
    });
    setField(bag, 'citySlug', {
      value: loc.citySlug,
      confidence: conf,
      source: 'ai',
      evidence: 'propose-validate',
    });
    out.cityResolved = true;
  } else if (loc.cityCandidates.length >= 2) {
    out.cityCandidates = loc.cityCandidates;
  }
  if (loc.province) {
    setField(bag, 'province', {
      value: loc.province,
      confidence: 0.8,
      source: 'ai',
      evidence: 'propose-validate',
    });
  }

  // ── Neighborhood: auto-fill on a single catalog hit, else chips ──
  if (loc.neighborhoodCandidates.length === 1 && loc.neighborhoodSlug && loc.neighborhoodName) {
    setField(bag, 'neighborhood', {
      value: loc.neighborhoodName,
      confidence: 0.88,
      source: 'ai',
      evidence: 'propose-validate',
    });
    setField(bag, 'neighborhoodSlug', {
      value: loc.neighborhoodSlug,
      confidence: 0.88,
      source: 'ai',
      evidence: 'propose-validate',
    });
    out.neighborhoodResolved = true;
  } else if (loc.neighborhoodCandidates.length >= 2) {
    out.neighborhoodCandidates = loc.neighborhoodCandidates;
  }

  return out;
}
