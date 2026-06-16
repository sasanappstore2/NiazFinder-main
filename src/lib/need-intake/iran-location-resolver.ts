import cityMapConfig from '@/data/geo/iran-cities-map-config.json';

export interface IranCityRef {
  id: string;
  slug: string;
  name: string;
}

const BY_ID = new Map<string, IranCityRef>();
const BY_NAME = new Map<string, IranCityRef>();
const BY_SLUG = new Map<string, IranCityRef>();

for (const entry of Object.values(cityMapConfig.cities ?? {})) {
  const ref: IranCityRef = {
    id: entry.cityId ?? entry.slug,
    slug: entry.slug,
    name: entry.name,
  };
  BY_ID.set(ref.id, ref);
  BY_SLUG.set(ref.slug, ref);
  BY_NAME.set(ref.name.trim(), ref);
}

export function resolveIranCityById(idOrSlug: string): IranCityRef | null {
  const key = idOrSlug.trim();
  if (!key) return null;
  return BY_ID.get(key) ?? BY_SLUG.get(key) ?? null;
}

export function resolveIranCityByName(name: string): IranCityRef | null {
  const key = name.trim();
  if (!key) return null;
  return BY_NAME.get(key) ?? null;
}
