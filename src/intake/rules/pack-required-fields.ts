/**
 * Client-safe required-field hints from curated packs (no fs).
 * Server analyze uses full pack meta via registry.server.ts.
 */
const CURATED_PACK_REQUIRED_FIELDS: Record<string, string[]> = {
  'musical-instruments': ['dealType', 'condition'],
  'mobile-phone': ['dealType', 'condition'],
  'car-ride': ['dealType', 'budget'],
  'apartment-rent': ['dealType', 'city', 'mapPin'],
  'apartment-sale': ['dealType', 'city', 'mapPin'],
  plumbing: ['city'],
  motorcycle: ['dealType'],
  'game-console': ['dealType', 'condition'],
  'lost-found': ['city'],
};

export function getPackRequiredFields(slug: string): string[] {
  return CURATED_PACK_REQUIRED_FIELDS[slug] ?? [];
}
