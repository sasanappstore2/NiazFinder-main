import { CANONICAL_CITIES } from '@/config/locations';

const SLUG_BY_TITLE = new Map(CANONICAL_CITIES.map((c) => [c.title, c.slug]));
const SLUG_SET = new Set(CANONICAL_CITIES.map((c) => c.slug));

/** Normalize Persian city title or slug to canonical English slug. */
export function cityToSlug(city?: string | null): string | undefined {
  if (!city) return undefined;
  const trimmed = city.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (SLUG_SET.has(lower)) return lower;
  return SLUG_BY_TITLE.get(trimmed) ?? undefined;
}

export function cityLabelForSlug(slug: string): string | undefined {
  return CANONICAL_CITIES.find((c) => c.slug === slug)?.title;
}
