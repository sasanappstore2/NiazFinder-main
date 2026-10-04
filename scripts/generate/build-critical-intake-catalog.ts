/**
 * Generates per-category critical optional intake fields for all pack slugs.
 * Run: npx tsx scripts/generate/build-critical-intake-catalog.ts
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CATEGORIES, getCategoryPath } from '../../src/config/categories';

const PACKS_DIR = join(process.cwd(), 'src/intake/rules/packs');
const OUT_FILE = join(process.cwd(), 'src/intake/template/critical-intake-catalog.ts');

export interface CriticalIntakeProfile {
  fields: string[];
  sectionKeys?: string[];
}

const CRITICAL_BY_ROOT: Record<string, readonly string[]> = {
  'real-estate': ['rooms', 'areaMin', 'deposit', 'monthlyRent', 'amenities', 'budget'],
  vehicles: ['brand', 'yearMin', 'mileageMax', 'condition', 'budget'],
  services: ['when', 'budget', 'serviceType', 'urgency'],
  electronics: ['brand', 'condition', 'budget', 'storage'],
  'home-appliances': ['brand', 'condition', 'budget'],
  'personal-items': ['brand', 'condition', 'budget'],
  entertainment: ['brand', 'condition', 'budget'],
  jobs: ['employmentType', 'experience', 'salaryMin', 'roleType'],
  social: ['socialType', 'when', 'budget'],
  general: ['budget', 'condition', 'dealType'],
};

/** Curated high-traffic slugs — merged with root defaults. */
const CRITICAL_BY_SLUG_CURATED: Record<string, CriticalIntakeProfile> = {
  'apartment-rent': { fields: ['rooms', 'areaMin', 'deposit', 'monthlyRent', 'amenities'] },
  'apartment-sale': { fields: ['rooms', 'areaMin', 'budget', 'amenities', 'buildingAge'] },
  'villa-rent': { fields: ['rooms', 'areaMin', 'deposit', 'monthlyRent', 'amenities'] },
  'villa-sale': { fields: ['rooms', 'areaMin', 'budget', 'plotWidth'] },
  'shop-rent': { fields: ['areaMin', 'deposit', 'monthlyRent', 'budget'] },
  'shop-sale': { fields: ['areaMin', 'budget', 'deedType'] },
  'car-ride': { fields: ['brand', 'yearMin', 'mileageMax', 'condition', 'budget'] },
  motorcycle: { fields: ['brand', 'yearMin', 'mileageMax', 'condition'] },
  plumbing: { fields: ['when', 'budget', 'serviceType', 'urgency'] },
  cleaning: { fields: ['when', 'budget', 'serviceType'] },
  moving: { fields: ['when', 'budget', 'serviceType'] },
  electrical: { fields: ['when', 'budget', 'serviceType'] },
  'mobile-phone': { fields: ['brand', 'condition', 'storage', 'budget'] },
  laptops: { fields: ['brand', 'condition', 'ram', 'storage', 'budget'] },
  'musical-instruments': { fields: ['brand', 'condition', 'budget'] },
  'lost-found': { fields: ['when', 'socialType'] },
  it: { fields: ['employmentType', 'experience', 'salaryMin', 'roleType'] },
};

const PACK_OPTIONAL_PRIORITY = [
  'rooms',
  'area',
  'areaMin',
  'budget',
  'brand',
  'condition',
  'when',
  'serviceType',
  'yearMin',
  'mileageMax',
  'deposit',
  'monthlyRent',
  'employmentType',
  'experience',
  'salaryMin',
  'amenities',
  'storage',
  'urgency',
  'dealType',
];

function rootForSlug(slug: string): string {
  const path = getCategoryPath(slug);
  return path[0]?.slug ?? 'general';
}

function loadPackOptional(slug: string): string[] {
  const file = join(PACKS_DIR, `${slug}.pack.json`);
  try {
    const pack = JSON.parse(readFileSync(file, 'utf8')) as {
      meta?: { optionalFields?: string[] };
    };
    return pack.meta?.optionalFields ?? [];
  } catch {
    return [];
  }
}

function dedupe(fields: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of fields) {
    if (!f || seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}

function buildProfileForSlug(slug: string): CriticalIntakeProfile {
  const curated = CRITICAL_BY_SLUG_CURATED[slug];
  if (curated) return { fields: dedupe(curated.fields).slice(0, 6) };

  const root = rootForSlug(slug);
  const rootDefaults = [...(CRITICAL_BY_ROOT[root] ?? CRITICAL_BY_ROOT.general!)];
  const packOptional = loadPackOptional(slug);

  const fromPack = packOptional
    .filter((f) => PACK_OPTIONAL_PRIORITY.includes(f) || rootDefaults.includes(f))
    .sort(
      (a, b) =>
        (PACK_OPTIONAL_PRIORITY.indexOf(a) === -1 ? 99 : PACK_OPTIONAL_PRIORITY.indexOf(a)) -
        (PACK_OPTIONAL_PRIORITY.indexOf(b) === -1 ? 99 : PACK_OPTIONAL_PRIORITY.indexOf(b))
    );

  const merged = dedupe([...rootDefaults, ...fromPack]);
  const fields = merged.length >= 2 ? merged.slice(0, 6) : dedupe([...rootDefaults, 'budget', 'dealType']).slice(0, 4);

  return { fields };
}

const packSlugs = readdirSync(PACKS_DIR)
  .filter((f) => f.endsWith('.pack.json'))
  .map((f) => f.replace('.pack.json', ''));

const canonicalPostingSlugs = new Set(
  CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).map((c) => c.slug)
);
const catalogSlugs = dedupe([
  // Stress-only packs such as marathon-overrides are rule overlays, not
  // posting categories and have no field registry. Keeping them here made
  // the generated catalog claim they had critical fields when none existed.
  ...packSlugs.filter((slug) => canonicalPostingSlugs.has(slug)),
  ...canonicalPostingSlugs,
]);

const CRITICAL_BY_SLUG: Record<string, CriticalIntakeProfile> = {};
for (const slug of catalogSlugs) {
  CRITICAL_BY_SLUG[slug] = buildProfileForSlug(slug);
}

const output = `/**
 * AUTO-GENERATED — do not edit by hand.
 * Run: npx tsx scripts/generate/build-critical-intake-catalog.ts
 */
import { getCategoryPath } from '@/config/categories';
import { getMergedFieldsForCategory } from '@/config/category-filters/registry';
import { resolveSectionKeyForField } from '@/intake/template/sectionGroups';

export interface CriticalIntakeProfile {
  fields: string[];
  sectionKeys?: string[];
}

export const CRITICAL_BY_ROOT: Record<string, readonly string[]> = ${JSON.stringify(CRITICAL_BY_ROOT, null, 2)} as const;

export const CRITICAL_BY_SLUG: Record<string, CriticalIntakeProfile> = ${JSON.stringify(CRITICAL_BY_SLUG, null, 2)} as const;

const MIN_CRITICAL_FIELDS_DEFAULT = 2;

/** Registry-valid critical field keys for a category slug. */
export function getCriticalIntakeFields(slug: string | null | undefined): string[] {
  if (!slug) return [];
  const profile = CRITICAL_BY_SLUG[slug];
  const raw = profile?.fields ?? CRITICAL_BY_ROOT[getCategoryPath(slug)[0]?.slug ?? 'general'] ?? CRITICAL_BY_ROOT.general;
  const registryKeys = new Set(
    getMergedFieldsForCategory(slug, 'need')
      .filter((f) => f.intake !== false)
      .map((f) => f.key)
  );
  const minRequired =
    registryKeys.size >= 3
      ? MIN_CRITICAL_FIELDS_DEFAULT
      : Math.max(1, Math.min(MIN_CRITICAL_FIELDS_DEFAULT, registryKeys.size));

  const filtered = raw.filter((k) => registryKeys.has(k));
  if (filtered.length >= minRequired) return filtered.slice(0, 6);

  const generic = ['budget', 'dealType', 'condition', 'brand', 'when', 'serviceType', 'rooms', 'areaMin', 'socialType', 'serviceKind'];
  const padded = [...new Set([...filtered, ...generic.filter((k) => registryKeys.has(k)), ...registryKeys])];
  return padded.slice(0, Math.max(minRequired, Math.min(6, padded.length)));
}

export function getCriticalSectionKeys(slug: string, criticalFields: string[]): Set<string> {
  const profile = CRITICAL_BY_SLUG[slug];
  if (profile?.sectionKeys?.length) return new Set(profile.sectionKeys);

  const root = getCategoryPath(slug)[0]?.slug ?? 'general';
  const keys = new Set<string>();
  for (const field of criticalFields) {
    const sectionKey = resolveSectionKeyForField(field, root, slug);
    if (sectionKey && sectionKey !== 'specs') keys.add(sectionKey);
  }
  return keys;
}
`;

writeFileSync(OUT_FILE, output, 'utf8');
console.log(`Wrote ${catalogSlugs.length} critical profiles to ${OUT_FILE}`);
