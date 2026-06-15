import { normalizePersianName } from '../../neighborhoods/lib';

/** Full city record from Divar places API. */
export interface DivarApiCity {
  id: number;
  name: string;
  slug: string;
  second_slug?: string;
  level?: string;
  parent: number;
  radius?: number;
  new?: boolean;
  centroid?: { latitude: number; longitude: number };
  default_location?: { latitude: number; longitude: number };
}

export interface DivarCityNode {
  id: number;
  name: string;
  slug: string;
  second_slug?: string;
  level: string;
  parent: number;
  radius?: number;
  inUi?: boolean;
  centroid?: { lat: number; lng: number };
}

export interface DivarProvinceNode {
  id: number;
  name: string;
  slug?: string;
  cities: DivarCityNode[];
}

export interface DivarLocationTree {
  meta: {
    extractedAt: string;
    apiCityCount: number;
    uiCityCount: number;
    provinceCount: number;
    source: 'hybrid' | 'api' | 'ui';
    verified: boolean;
  };
  provinces: DivarProvinceNode[];
  excludedFromUi?: DivarCityNode[];
  uiOnly?: Array<{ name: string; slug?: string; provinceName?: string }>;
}

export interface DivarUiCity {
  name: string;
  slug?: string;
  provinceName: string;
  provinceId?: number;
}

export interface DivarUiProvince {
  id?: number;
  name: string;
  cities: DivarUiCity[];
}

export interface DivarUiScrapeResult {
  scrapedAt: string;
  provinces: DivarUiProvince[];
  flatCities: DivarUiCity[];
  networkResponses?: Array<{ url: string; cityCount?: number }>;
}

export function toCityNode(city: DivarApiCity, inUi = false): DivarCityNode {
  const loc = city.default_location ?? city.centroid;
  return {
    id: city.id,
    name: city.name,
    slug: city.slug,
    second_slug: city.second_slug,
    level: city.level ?? 'place2',
    parent: city.parent,
    radius: city.radius,
    inUi,
    centroid:
      loc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)
        ? { lat: loc.latitude, lng: loc.longitude }
        : undefined,
  };
}

/** Group API cities by parent province id. */
export function groupCitiesByParent(cities: DivarApiCity[]): Map<number, DivarApiCity[]> {
  const map = new Map<number, DivarApiCity[]>();
  for (const city of cities) {
    const parent = city.parent;
    const list = map.get(parent) ?? [];
    list.push(city);
    map.set(parent, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }
  return map;
}

/** Infer province display name from UI or largest-radius city in group. */
export function inferProvinceName(
  parentId: number,
  cities: DivarApiCity[],
  uiName?: string
): string {
  if (uiName?.trim()) return uiName.trim();
  const sorted = [...cities].sort((a, b) => (b.radius ?? 0) - (a.radius ?? 0));
  return sorted[0]?.name ?? `province-${parentId}`;
}

export function buildApiTree(
  cities: DivarApiCity[],
  provinceNames: Map<number, string> = new Map()
): DivarLocationTree {
  const grouped = groupCitiesByParent(cities);
  const provinces: DivarProvinceNode[] = [];

  for (const [parentId, group] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
    provinces.push({
      id: parentId,
      name: inferProvinceName(parentId, group, provinceNames.get(parentId)),
      slug: `province-${parentId}`,
      cities: group.map((c) => toCityNode(c, false)),
    });
  }

  provinces.sort((a, b) => a.name.localeCompare(b.name, 'fa'));

  return {
    meta: {
      extractedAt: new Date().toISOString(),
      apiCityCount: cities.length,
      uiCityCount: 0,
      provinceCount: provinces.length,
      source: 'api',
      verified: false,
    },
    provinces,
  };
}

export function sumTreeCities(tree: DivarLocationTree, onlyInUi = false): number {
  return tree.provinces.reduce(
    (sum, p) => sum + p.cities.filter((c) => !onlyInUi || c.inUi).length,
    0
  );
}

export function flattenTree(tree: DivarLocationTree): DivarCityNode[] {
  return tree.provinces.flatMap((p) =>
    p.cities.map((c) => ({ ...c, parent: c.parent || p.id }))
  );
}

/** Match UI city to API city: slug > id > normalized name. */
export function matchUiToApi(
  ui: DivarUiCity,
  apiBySlug: Map<string, DivarApiCity>,
  apiByName: Map<string, DivarApiCity>
): DivarApiCity | null {
  if (ui.slug) {
    const hit = apiBySlug.get(ui.slug.toLowerCase());
    if (hit) return hit;
  }
  const norm = normalizePersianName(ui.name);
  const byName = apiByName.get(norm);
  if (byName) return byName;
  return null;
}

export function buildApiIndexes(cities: DivarApiCity[]) {
  const bySlug = new Map<string, DivarApiCity>();
  const byId = new Map<number, DivarApiCity>();
  const byName = new Map<string, DivarApiCity>();
  for (const city of cities) {
    bySlug.set(city.slug.toLowerCase(), city);
    if (city.second_slug) bySlug.set(city.second_slug.toLowerCase(), city);
    byId.set(city.id, city);
    byName.set(normalizePersianName(city.name), city);
  }
  return { bySlug, byId, byName };
}
