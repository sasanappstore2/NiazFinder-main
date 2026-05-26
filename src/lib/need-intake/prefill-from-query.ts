import type { ParsedIntent } from '@/contracts/need-intake';
import { normalizeCategoryPair, legacyValueToSlug } from '@/config/categories';
import { getCityBySlug } from '@/config/locations';
import { getIntentsForCategory } from '@/config/need-intents';
import { DEFAULT_INTENT } from '@/config/need-intents';

export function resolveSlugFromQuery(categoryParam: string): string | null {
  return legacyValueToSlug(categoryParam) ?? categoryParam;
}

export function buildPrefilledIntent(
  categoryParam: string | null | undefined,
  cityParam: string | null | undefined,
  rawText = ''
): ParsedIntent | null {
  if (!categoryParam?.trim()) return null;

  const slug = resolveSlugFromQuery(categoryParam.trim());
  if (!slug) return null;

  const pair = normalizeCategoryPair(slug);
  const intents = getIntentsForCategory(pair.categorySlug);
  const intentType = intents[0] ?? DEFAULT_INTENT;

  let city: string | undefined;
  if (cityParam?.trim()) {
    const bySlug = getCityBySlug(cityParam.trim().toLowerCase());
    city = bySlug?.title ?? cityParam.trim();
  }

  return {
    intentType,
    categorySlug: pair.categorySlug,
    subcategorySlug: pair.subcategorySlug,
    city,
    confidence: 0.92,
    urgency: 'NORMAL',
    entities: {},
    rawText: rawText.trim(),
    title: rawText.trim().slice(0, 80) || 'ثبت نیاز',
    description: rawText.trim(),
  };
}
