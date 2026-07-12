import { normalizeCategoryPair } from '@/config/categories';
import type { IntakeStep } from '@/contracts/need-intake';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

export interface HomeToPostParamsInput {
  seed: string;
  citySlug?: string | null;
  phone?: string | null;
  categorySlug?: string | null;
}

/** Rules-first category leaf/parent slug inferred from home seed text. */
export function inferCategorySlugFromSeed(seed: string): string | null {
  const trimmed = seed.trim();
  if (!trimmed) return null;
  const parsed = parseIntentFromText(trimmed);
  const pair = normalizeCategoryPair(parsed.categorySlug, parsed.subcategorySlug);
  return pair.subcategorySlug || pair.categorySlug || null;
}

export function isStrongHomeSeed(seed: string): boolean {
  return canProceedToIntakeLocation(seed, '');
}

/**
 * A/B flag: when false, home always lands on need step (prefilled).
 * Default enabled for seamless handoff.
 */
export function isIntakeSkipNeedStepEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_INTAKE_SKIP_NEED_STEP;
  if (raw === 'false' || raw === '0') return false;
  return true;
}

export function shouldSkipNeedStep(seed: string): boolean {
  if (!isIntakeSkipNeedStepEnabled()) return false;
  return isStrongHomeSeed(seed);
}

/** Initial wizard step after home ? /post navigation. */
export function resolveHomeSeedLandingStep(seed: string): IntakeStep {
  const trimmed = seed.trim();
  if (!trimmed) return 'compose';
  if (!shouldSkipNeedStep(trimmed)) return 'compose';
  if (canProceedToIntakeLocation(trimmed, '')) return 'location';
  return 'compose';
}

/** Atomic query string: seed + city + inferred category + optional phone. */
export function buildHomeToPostSearchParams(input: HomeToPostParamsInput): URLSearchParams {
  const params = new URLSearchParams();
  const seed = input.seed.trim();
  params.set('seed', seed);
  if (input.citySlug?.trim()) params.set('city', input.citySlug.trim());
  const category = input.categorySlug?.trim() || inferCategorySlugFromSeed(seed);
  if (category) params.set('category', category);
  if (input.phone?.trim()) params.set('phone', input.phone.trim());
  return params;
}

export function homeToPostQueryKey(parts: {
  seed: string;
  city?: string | null;
  category?: string | null;
  phone?: string | null;
}): string {
  return [parts.seed, parts.category, parts.city, parts.phone].filter(Boolean).join('|') || 'empty';
}

export function homeSeedAnalyzeText(seed: string, detailsText = ''): string {
  return composeIntakeSourceText(seed, detailsText);
}
