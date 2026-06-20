import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CANONICAL_CATEGORIES, getCategoryBySlug } from '@/config/categories';
import { REPAIR_SUBCATEGORIES } from '@/config/repair-subcategories';

const ROOT = join(import.meta.dirname, '../../..');

export const REPAIR_SLUG_SET = new Set(REPAIR_SUBCATEGORIES.map((c) => c.slug));
export const VALID_CATEGORY_SLUGS = new Set(CANONICAL_CATEGORIES.map((c) => c.slug));

export interface CatInfo {
  slug: string;
  pathFa: string;
  nameFa: string;
  nameEn: string;
}

export interface LocEntry {
  cityId: string;
  city: string;
  province: string;
  neighborhoodId: string;
  neighborhood: string;
}

export interface LocationIndex {
  cityByName: Map<string, { cityId: string; city: string; province: string }>;
  hoodByCity: Map<string, Map<string, LocEntry>>;
  hoodLocations: Map<string, LocEntry[]>;
}

const PATH_SEP = ' › ';

export function normMatch(text: string): string {
  return text
    .trim()
    .replace(/\u064a/g, '\u06cc')
    .replace(/\u0643/g, '\u06a9')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u0640/g, '\u200c')
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ');
}

function walkCategories(
  nodes: Array<{ slug: string; nameFa: string; nameEn?: string; children?: unknown[] }>,
  prefix = ''
): Map<string, CatInfo> {
  const out = new Map<string, CatInfo>();
  for (const n of nodes) {
    const path = prefix ? `${prefix}${PATH_SEP}${n.nameFa}` : n.nameFa;
    const info: CatInfo = {
      slug: n.slug,
      pathFa: path,
      nameFa: n.nameFa,
      nameEn: n.nameEn ?? n.slug,
    };
    out.set(path, info);
    out.set(n.slug, info);
    if (n.children?.length) {
      const childMap = walkCategories(
        n.children as Array<{ slug: string; nameFa: string; nameEn?: string; children?: unknown[] }>,
        path
      );
      for (const [k, v] of childMap) out.set(k, v);
    }
  }
  return out;
}

export function loadCategoryIndex(): Map<string, CatInfo> {
  const doc = JSON.parse(
    readFileSync(join(ROOT, 'src/data/iran-categories-tree.json'), 'utf-8')
  ) as { categories: Array<{ slug: string; nameFa: string; nameEn?: string; children?: unknown[] }> };
  return walkCategories(doc.categories);
}

export function loadLocationIndex(): LocationIndex {
  const doc = JSON.parse(
    readFileSync(join(ROOT, 'src/data/iran-locations-tree.json'), 'utf-8')
  ) as {
    countries: Array<{
      provinces: Array<{
        name: string;
        cities: Array<{
          id: string;
          name: string;
          neighborhoods?: Array<{ id: string; name: string }>;
        }>;
      }>;
    }>;
  };

  const cityByName = new Map<string, { cityId: string; city: string; province: string }>();
  const hoodByCity = new Map<string, Map<string, LocEntry>>();
  const hoodLocations = new Map<string, LocEntry[]>();

  for (const prov of doc.countries[0].provinces) {
    for (const city of prov.cities) {
      const cityMeta = { cityId: city.id, city: city.name, province: prov.name };
      cityByName.set(city.name, cityMeta);
      cityByName.set(normMatch(city.name), cityMeta);

      const hoodMap = new Map<string, LocEntry>();
      for (const hood of city.neighborhoods ?? []) {
        const entry: LocEntry = {
          cityId: city.id,
          city: city.name,
          province: prov.name,
          neighborhoodId: hood.id,
          neighborhood: hood.name,
        };
        hoodMap.set(hood.name, entry);
        hoodMap.set(normMatch(hood.name), entry);
        const list = hoodLocations.get(hood.name) ?? [];
        list.push(entry);
        hoodLocations.set(hood.name, list);
        const normList = hoodLocations.get(normMatch(hood.name)) ?? [];
        if (!normList.includes(entry)) normList.push(entry);
        hoodLocations.set(normMatch(hood.name), normList);
      }
      hoodByCity.set(city.name, hoodMap);
      hoodByCity.set(normMatch(city.name), hoodMap);
    }
  }

  return { cityByName, hoodByCity, hoodLocations };
}

export function catInfoForSlug(slug: string, catIndex: Map<string, CatInfo>): CatInfo | null {
  return catIndex.get(slug) ?? null;
}

export function mapLeafToCanonical(slug: string): {
  categorySlug: string;
  subcategorySlug?: string;
} {
  if (REPAIR_SLUG_SET.has(slug)) {
    return { categorySlug: 'repairs', subcategorySlug: slug };
  }
  const cat = getCategoryBySlug(slug);
  if (!cat) return { categorySlug: slug };
  if (cat.parentSlug === 'repairs') {
    return { categorySlug: 'repairs', subcategorySlug: slug };
  }
  return { categorySlug: slug };
}
