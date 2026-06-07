import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { sleep } from './crawl-client';

export const DIVAR_POSTLIST_URL = 'https://api.divar.ir/v8/postlist/w/search';
export const DIVAR_CITIES_URL = 'https://api.divar.ir/v1/places/cities';
export const DIVAR_CITY_ID_CACHE = join(process.cwd(), 'data', 'divar', 'city-id-map.json');

export interface DivarCityRecord {
  id: number;
  slug: string;
  name: string;
}

export interface DivarPostlistPagination {
  has_next_page?: boolean;
  data?: Record<string, unknown>;
}

export interface DivarPostlistResponse {
  list_widgets?: Array<{
    widget_type?: string;
    data?: Record<string, unknown>;
  }>;
  pagination?: DivarPostlistPagination;
}

export interface DivarApiSearchOptions {
  cityId: string;
  parentCategory: string;
  subcategory: string;
  paginationData?: Record<string, unknown>;
}

let cityIdCache: Map<string, string> | null = null;

export async function loadDivarCityIdMap(refresh = false): Promise<Map<string, string>> {
  if (cityIdCache && !refresh) return cityIdCache;

  if (!refresh && existsSync(DIVAR_CITY_ID_CACHE)) {
    try {
      const raw = JSON.parse(readFileSync(DIVAR_CITY_ID_CACHE, 'utf8')) as Record<string, string>;
      cityIdCache = new Map(Object.entries(raw));
      if (cityIdCache.size > 0) return cityIdCache;
    } catch {
      // refetch below
    }
  }

  const res = await fetch(DIVAR_CITIES_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Divar cities HTTP ${res.status}`);
  const body = (await res.json()) as { cities?: DivarCityRecord[] } | DivarCityRecord[];
  const cities = Array.isArray(body) ? body : (body.cities ?? []);
  const map = new Map<string, string>();
  for (const city of cities) {
    if (city.slug && city.id != null) map.set(city.slug, String(city.id));
  }

  mkdirSync(join(process.cwd(), 'data', 'divar'), { recursive: true });
  writeFileSync(DIVAR_CITY_ID_CACHE, JSON.stringify(Object.fromEntries(map), null, 2), 'utf8');
  cityIdCache = map;
  return map;
}

export async function divarCityIdForSlug(citySlug: string): Promise<string | null> {
  const map = await loadDivarCityIdMap();
  return map.get(citySlug) ?? null;
}

export function buildDivarSearchPayload(options: DivarApiSearchOptions): Record<string, unknown> {
  const data: Record<string, unknown> = {
    category: { str: { value: options.parentCategory } },
    subcategory: { str: { value: options.subcategory } },
  };

  const payload: Record<string, unknown> = {
    city_ids: [options.cityId],
    source_view: 'CATEGORY',
    disable_recommendation: false,
    search_data: {
      form_data: { data },
      server_payload: {
        '@type': 'type.googleapis.com/widgets.SearchData.ServerPayload',
        additional_form_data: {
          data: { sort: { str: { value: 'sort_date' } } },
        },
      },
    },
  };

  if (options.paginationData) {
    payload.pagination_data = options.paginationData;
  }

  return payload;
}

export async function fetchDivarPostlistPage(
  options: DivarApiSearchOptions,
  opts?: { retries?: number; retryDelayMs?: number }
): Promise<DivarPostlistResponse> {
  const retries = opts?.retries ?? 4;
  const retryDelayMs = opts?.retryDelayMs ?? 1_500;
  const payload = buildDivarSearchPayload(options);

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(DIVAR_POSTLIST_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries - 1) {
          await sleep(retryDelayMs * (attempt + 1) * 2);
          continue;
        }
        throw new Error(`Divar API HTTP ${res.status}`);
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Divar API HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      return (await res.json()) as DivarPostlistResponse;
    } catch (error) {
      if (attempt >= retries - 1) throw error;
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw new Error('Divar API fetch failed');
}

/** Paginate Divar postlist API until maxPages or no next page. */
export async function fetchDivarPostlistAllPages(
  options: Omit<DivarApiSearchOptions, 'paginationData'>,
  maxPages: number,
  delayMs = 800
): Promise<DivarPostlistResponse[]> {
  const pages: DivarPostlistResponse[] = [];
  let paginationData: Record<string, unknown> | undefined;

  for (let page = 0; page < maxPages; page++) {
    const response = await fetchDivarPostlistPage({
      ...options,
      paginationData,
    });
    pages.push(response);

    const pagination = response.pagination;
    if (!pagination?.has_next_page || !pagination.data) break;
    paginationData = pagination.data;
    await sleep(delayMs);
  }

  return pages;
}
