/**
 * Province id/slug helpers (location-system ids + canonical registry).
 */
import { countries, type Province } from '@/lib/location-system';
import { getProvinceBySlug, isProvinceSlug } from '@/config/locations';

const IRAN_PROVINCES: readonly Province[] =
  countries.find((c) => c.id === 'iran')?.provinces ?? [];

const BY_ID = new Map(IRAN_PROVINCES.map((p) => [p.id, p]));
const BY_NAME = new Map(IRAN_PROVINCES.map((p) => [p.name, p]));

/** Map location-system province id → canonical slug when they differ. */
const ID_TO_CANONICAL_SLUG: Record<string, string> = {
  'khorasan-razavi': 'razavi-khorasan',
  'khorasan-north': 'north-khorasan',
  'khorasan-south': 'south-khorasan',
  'chaharmahal': 'chaharmahal-bakhtiari',
  'kohgiluyeh': 'kohgiluyeh-boyer-ahmad',
};

export function provinceIdToSlug(id: string): string {
  return ID_TO_CANONICAL_SLUG[id] ?? id;
}

export function provinceSlugToId(slug: string): string {
  for (const [id, canonical] of Object.entries(ID_TO_CANONICAL_SLUG)) {
    if (canonical === slug) return id;
  }
  return slug;
}

export function isKnownProvinceSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (isProvinceSlug(s)) return true;
  if (BY_ID.has(s)) return true;
  return Object.values(ID_TO_CANONICAL_SLUG).includes(s);
}

export function getProvinceByIdOrSlug(slugOrId: string): Province | null {
  const id = provinceSlugToId(slugOrId);
  return BY_ID.get(id) ?? BY_ID.get(slugOrId) ?? null;
}

export function provinceSlugToPersianName(slug: string): string | null {
  const p = getProvinceByIdOrSlug(slug);
  if (p) return p.name;
  return getProvinceBySlug(provinceIdToSlug(slug))?.title ?? null;
}

export function provinceSlugsToPersianNames(slugs: string[]): string[] {
  return slugs.map(provinceSlugToPersianName).filter((n): n is string => Boolean(n));
}

export function getAllProvinces(): readonly Province[] {
  return IRAN_PROVINCES;
}

export function findProvinceByCityId(cityId: string): Province | null {
  for (const province of IRAN_PROVINCES) {
    if (province.cities.some((c) => c.id === cityId)) return province;
  }
  return null;
}
