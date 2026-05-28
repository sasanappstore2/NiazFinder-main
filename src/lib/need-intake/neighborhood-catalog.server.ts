import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { ALL_LOCATION_CITIES, locationCityIdToSlug } from '@/lib/search/city-slugs';
import type { CatalogNeighborhood } from '@/lib/neighborhoods/catalog-types';

export interface NeighborhoodCatalogEntry {
  slug: string;
  name: string;
  city: string;
  areas?: string[];
}

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');
const catalogCache = new Map<string, NeighborhoodCatalogEntry[]>();

function resolveCityId(city: string): string | null {
  const trimmed = city.trim();
  const byName = ALL_LOCATION_CITIES.find((c) => c.name === trimmed);
  if (byName) return byName.id;
  if (existsSync(path.join(CATALOG_DIR, `${trimmed}.json`))) return trimmed;
  return null;
}

function toEntries(cityLabel: string, rows: CatalogNeighborhood[]): NeighborhoodCatalogEntry[] {
  return rows.map((n) => ({
    slug: n.id,
    name: n.name,
    city: cityLabel,
    areas: n.areas,
  }));
}

function loadCatalogForCityId(cityId: string, cityLabel: string): NeighborhoodCatalogEntry[] {
  const cacheKey = `${cityId}:${cityLabel}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  const filePath = path.join(CATALOG_DIR, `${cityId}.json`);
  if (!existsSync(filePath)) {
    catalogCache.set(cacheKey, []);
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as {
      cityName?: string;
      neighborhoods: CatalogNeighborhood[];
    };
    const label = data.cityName ?? cityLabel;
    const entries = toEntries(label, data.neighborhoods ?? []);
    catalogCache.set(cacheKey, entries);
    return entries;
  } catch {
    catalogCache.set(cacheKey, []);
    return [];
  }
}

export function getNeighborhoodCatalogForCity(city: string): NeighborhoodCatalogEntry[] {
  const cityId = resolveCityId(city);
  if (!cityId) return [];
  const cityMeta = ALL_LOCATION_CITIES.find((c) => c.id === cityId);
  return loadCatalogForCityId(cityId, cityMeta?.name ?? city);
}

export function formatNeighborhoodCatalogForPrompt(city: string, limit = 40): string {
  const items = getNeighborhoodCatalogForCity(city).slice(0, limit);
  if (!items.length) return '';
  return items
    .map((n) => {
      const areas = n.areas?.length ? ` (${n.areas.slice(0, 4).join('، ')})` : '';
      return `${n.slug}: ${n.name}${areas}`;
    })
    .join('\n');
}

/** Match neighborhood name or sub-area mentioned in free text. */
export function findNeighborhoodInText(
  city: string,
  text: string
): { slug: string; name: string; matchedArea?: string } | null {
  const norm = text.trim();
  if (!norm) return null;
  const catalog = getNeighborhoodCatalogForCity(city);
  for (const n of catalog) {
    if (norm.includes(n.name)) {
      return { slug: n.slug, name: n.name };
    }
    for (const a of n.areas ?? []) {
      if (norm.includes(a)) {
        return { slug: n.slug, name: n.name, matchedArea: a };
      }
    }
  }
  return null;
}

/** Cities searched first when user omits city name (catalog must exist on disk). */
const NEIGHBORHOOD_SEARCH_PRIORITY = [
  'mashhad',
  'tehran',
  'isfahan',
  'shiraz',
  'karaj',
  'tabriz',
  'ahvaz',
  'qom',
  'rasht',
  'yazd',
  'kerman',
] as const;

function normalizeMatchText(text: string): string {
  return text
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokenizeForMatch(text: string): string[] {
  return normalizeMatchText(text)
    .split(/[\s،,.]+/)
    .filter((t) => t.length >= 2);
}

/** Avoid matching «دی» inside «مجردی» — token must be its own word (or long substring). */
function tokenMatchesInText(normText: string, token: string, textTokens: Set<string>): boolean {
  if (textTokens.has(token)) return true;
  if (token.length < 4) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s،,.\\-])${escaped}($|[\\s،,.\\-])`, 'u');
  return re.test(normText);
}

const MIN_GLOBAL_NEIGHBORHOOD_SCORE = 10;

function scoreNeighborhoodAgainstText(
  text: string,
  entry: NeighborhoodCatalogEntry
): number {
  const normText = normalizeMatchText(text);
  const normName = normalizeMatchText(entry.name);

  if (normName.length >= 4 && normText.includes(normName)) return normName.length + 10;

  const nameTokens = tokenizeForMatch(entry.name).filter((t) => !['شهید', 'امام', 'سید'].includes(t));
  const textTokens = new Set(tokenizeForMatch(text));

  let matched = 0;
  for (const t of nameTokens) {
    if (tokenMatchesInText(normText, t, textTokens)) matched += 1;
  }

  for (const a of entry.areas ?? []) {
    const na = normalizeMatchText(a);
    if (na.length < 5) {
      if (textTokens.has(na)) return na.length + 8;
      continue;
    }
    if (tokenMatchesInText(normText, na, textTokens) || normText.includes(na)) {
      return na.length + 8;
    }
  }

  if (nameTokens.length >= 2 && matched === nameTokens.length) {
    return matched + normName.length;
  }
  if (matched >= 2) return matched + 5;
  if (matched === 1 && nameTokens.length === 1) return matched + 3;
  return 0;
}

export interface NeighborhoodGlobalMatch {
  city: string;
  cityId: string;
  slug: string;
  name: string;
  matchedArea?: string;
  score: number;
}

/** Resolve neighborhood (and city) from text without an explicit city mention. */
export function findNeighborhoodInAnyCity(text: string): NeighborhoodGlobalMatch | null {
  const norm = text.trim();
  if (!norm || norm.length < 4) return null;

  let best: NeighborhoodGlobalMatch | null = null;

  for (const cityId of NEIGHBORHOOD_SEARCH_PRIORITY) {
    const cityMeta = ALL_LOCATION_CITIES.find((c) => locationCityIdToSlug(c.id) === cityId);
    const cityLabel = cityMeta?.name ?? cityId;
    const catalog = loadCatalogForCityId(cityId, cityLabel);
    if (!catalog.length) continue;

    for (const entry of catalog) {
      const score = scoreNeighborhoodAgainstText(norm, entry);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = {
          city: entry.city,
          cityId,
          slug: entry.slug,
          name: entry.name,
          score,
        };
      }
    }
  }

  if (best && best.score < MIN_GLOBAL_NEIGHBORHOOD_SCORE) return null;
  return best;
}

export interface RankedNeighborhoodCandidate {
  slug: string;
  name: string;
  score: number;
  reason?: string;
}

/** If top-2 scores differ by less than this, treat as ambiguous. */
const AMBIGUOUS_SCORE_GAP = 14;

function scoreFragmentAgainstEntry(
  fragment: string,
  entry: NeighborhoodCatalogEntry,
  rawText?: string
): number {
  const frag = normalizeMatchText(fragment);
  if (!frag) return 0;

  let best = 0;
  const nn = normalizeMatchText(entry.name);
  if (nn === frag) best = Math.max(best, 100);
  else if (nn.includes(frag) && frag.length >= 4) best = Math.max(best, 78 + Math.min(frag.length, 12));
  else if (frag.includes(nn) && nn.length >= 6) best = Math.max(best, 72 + nn.length);
  else if (nn.startsWith(frag)) best = Math.max(best, 52 + frag.length * 2);
  else if (frag.startsWith(nn) && nn.length >= 5) best = Math.max(best, 48);

  const textToks = new Set(tokenizeForMatch(fragment));

  let tokenHits = 0;
  for (const t of tokenizeForMatch(entry.name).filter((x) => !['شهید', 'امام', 'سید'].includes(x))) {
    if (textToks.has(t) || (t.length >= 3 && frag.includes(t))) tokenHits++;
  }
  if (tokenHits >= 2) best = Math.max(best, 38 + tokenHits * 14);
  if (tokenHits === 1 && frag.length <= 12) best = Math.max(best, 30);

  for (const a of entry.areas ?? []) {
    const na = normalizeMatchText(a);
    if (!na) continue;
    if (na === frag) best = Math.max(best, 92);
    else if (frag.includes(na) || na.includes(frag)) best = Math.max(best, 68 + Math.min(na.length, 10));
    else if (na.startsWith(frag)) best = Math.max(best, 46 + frag.length);
  }

  if (rawText?.trim()) {
    const contextual = scoreNeighborhoodAgainstText(rawText.trim(), entry);
    if (contextual > 0)
      best = Math.max(best, contextual * 0.42 + Math.min(best || 35, 55) * 0.58);
  }

  return best;
}

/**
 * Rank catalog neighborhoods for a city against a user fragment (and optional raw message).
 * Sets `ambiguous` when several options score similarly or a short fragment matches many prefixes.
 */
export function rankNeighborhoodCandidates(
  city: string,
  userFragment: string,
  rawText?: string,
  limit = 8
): { candidates: RankedNeighborhoodCandidate[]; ambiguous: boolean } {
  const frag = userFragment.trim();
  if (!frag) return { candidates: [], ambiguous: false };

  const catalog = getNeighborhoodCatalogForCity(city);
  if (!catalog.length) return { candidates: [], ambiguous: false };

  const scored = catalog
    .map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      score: scoreFragmentAgainstEntry(frag, entry, rawText),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.name.length - a.name.length)
    .slice(0, limit);

  if (scored.length === 0) return { candidates: [], ambiguous: false };
  if (scored.length === 1) {
    const only = scored[0];
    const compactTok = (normalizeMatchText(frag).split(/\s+/)[0] ?? '').length;
    if (compactTok > 0 && compactTok <= 4 && only.score < 48) return { candidates: scored, ambiguous: true };
    return { candidates: scored, ambiguous: false };
  }

  const top = scored[0].score;
  const second = scored[1].score;
  const ambiguousByCloseTop = top - second < AMBIGUOUS_SCORE_GAP;

  const firstTok = normalizeMatchText(frag).split(/\s+/)[0] ?? '';
  const shortFragmentAmbiguous =
    firstTok.length > 1 &&
    firstTok.length <= 5 &&
    scored.filter((c) => c.score >= top - 10).length >= 2;

  return {
    candidates: scored,
    ambiguous: ambiguousByCloseTop || shortFragmentAmbiguous,
  };
}

export function resolveNeighborhoodSlug(
  city: string,
  areaName: string
): { slug: string; name: string } | null {
  const norm = areaName.trim();
  if (!norm) return null;
  const catalog = getNeighborhoodCatalogForCity(city);
  const exact = catalog.find((n) => n.name === norm || n.slug === norm);
  if (exact) return { slug: exact.slug, name: exact.name };

  const ranked = catalog
    .map((n) => {
      let score = 0;
      if (n.name === norm) score = 100;
      else if (n.name.startsWith(`${norm} `) || n.name === `${norm} شهر`) score = 85;
      else if (n.name.startsWith(norm)) score = 50;
      else if (norm.startsWith(n.name)) score = 25;
      return { n, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.n.name.length - b.n.name.length);
  if (ranked.length > 0) {
    const best = ranked[0].n;
    return { slug: best.slug, name: best.name };
  }

  if (norm.length >= 4) {
    const partial = catalog.find((n) =>
      n.areas?.some((a) => {
        const na = normalizeMatchText(a);
        return na === norm || na.startsWith(`${norm} `) || na.startsWith(norm);
      })
    );
    if (partial) return { slug: partial.slug, name: partial.name };
  }
  return null;
}
