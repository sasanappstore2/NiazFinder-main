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
  const matches = ALL_LOCATION_CITIES.filter((c) => c.name === trimmed);
  if (matches.length > 1) {
    const byCatalogSlug = matches.find((c) => locationCityIdToSlug(c.id) === c.id);
    const byKnownSlug = matches.find((c) => {
      const slug = locationCityIdToSlug(c.id);
      return existsSync(path.join(CATALOG_DIR, `${slug}.json`));
    });
    return (byCatalogSlug ?? byKnownSlug ?? matches[0])!.id;
  }
  if (matches.length === 1) return matches[0]!.id;
  if (existsSync(path.join(CATALOG_DIR, `${trimmed}.json`))) return trimmed;
  const slug = locationCityIdToSlug(trimmed);
  if (slug && existsSync(path.join(CATALOG_DIR, `${slug}.json`))) return slug;
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
  const compactText = compactMatchText(norm);
  const catalog = getNeighborhoodCatalogForCity(city);
  for (const n of catalog) {
    if (boundedLocationTokenMatch(norm, n.name)) {
      return { slug: n.slug, name: n.name };
    }
    const compactName = compactMatchText(n.name);
    if (compactName.length >= 4 && compactText.includes(compactName)) {
      return { slug: n.slug, name: n.name };
    }
    for (const a of n.areas ?? []) {
      if (boundedLocationTokenMatch(norm, a)) {
        return { slug: n.slug, name: n.name, matchedArea: a };
      }
      const compactArea = compactMatchText(a);
      if (compactArea.length >= 4 && compactText.includes(compactArea)) {
        return { slug: n.slug, name: n.name, matchedArea: a };
      }
    }
  }
  return null;
}

/** Cities searched first when user omits city name (catalog must exist on disk). */
const NEIGHBORHOOD_SEARCH_PRIORITY = [
  'mashhad',
  'tehran-city',
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

function compactMatchText(text: string): string {
  return normalizeMatchText(text).replace(/\s+/g, '');
}

function tokenizeForMatch(text: string): string[] {
  return normalizeMatchText(text)
    .split(/[\s،,.]+/)
    .filter((t) => t.length >= 2);
}

const DEAL_TYPE_LOCATION_TOKENS = new Set(['رهن', 'ودیعه', 'اجاره', 'رنت', 'مستاجر']);

/** Common property words — not valid neighborhood matches on their own. */
const LOCATION_STOPWORD_NAMES = new Set([
  'ملک',
  'واحد',
  'خانه',
  'خونه',
  'آپارت',
  'اپارت',
  'مسکونی',
  'تجاری',
  'صنعتی',
  'زمین',
  'انباری',
  'انبار',
]);

/** Deal-type words must not resolve as neighborhood names (e.g. «رهن» in Natanz). */
export function isDealTypeLocationToken(token: string, text: string): boolean {
  const tok = normalizeMatchText(token);
  if (!DEAL_TYPE_LOCATION_TOKENS.has(tok)) return false;
  const norm = normalizeMatchText(text);
  if (tok === 'رهن') {
    return (
      /رهن\s*و\s*اجاره|ودیعه\s*و\s*اجاره|رهن\s*کامل|نوع\s*معامله/.test(norm) ||
      (/رهن/.test(norm) && /اجاره|ماهانه|ودیعه/.test(norm))
    );
  }
  if (tok === 'ودیعه') return /ودیعه|رهن/.test(norm);
  if (tok === 'اجاره') {
    return /رهن\s*و\s*اجاره|اجاره\s*ماهانه|نوع\s*معامله|ماهانه\s*چقدر/.test(norm);
  }
  return false;
}

/** «ری» inside «۱۲۰ متری» is area suffix, not neighborhood Rey. */
export function isAreaUnitSubstring(text: string, token: string): boolean {
  const tok = normalizeMatchText(token);
  if (tok !== 'ری') return false;
  return /\d+\s*مت(?:ر|ری)/u.test(text);
}

/** Avoid matching «دی» inside «مجردی» — token must be its own word (or long substring). */
function tokenMatchesInText(normText: string, token: string, textTokens: Set<string>): boolean {
  if (textTokens.has(token)) return true;
  if (token.length < 4) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[\\s،,.\\-])${escaped}($|[\\s،,.\\-])`, 'u');
  return re.test(normText);
}

function boundedLocationTokenMatch(text: string, token: string): boolean {
  const tok = normalizeMatchText(token);
  if (!tok) return false;
  if (isDealTypeLocationToken(tok, text)) return false;
  if (isAreaUnitSubstring(text, tok)) return false;

  const normText = normalizeMatchText(text);
  const textTokens = new Set(tokenizeForMatch(text));

  if (tok.length >= 4) return normText.includes(tok);
  if (textTokens.has(tok)) return true;
  return tokenMatchesInText(normText, tok, textTokens);
}

const MIN_GLOBAL_NEIGHBORHOOD_SCORE = 10;

function scoreNeighborhoodAgainstText(
  text: string,
  entry: NeighborhoodCatalogEntry
): number {
  const normText = normalizeMatchText(text);
  const normName = normalizeMatchText(entry.name);

  if (LOCATION_STOPWORD_NAMES.has(normName)) return 0;
  if (isDealTypeLocationToken(normName, text)) return 0;
  if (isAreaUnitSubstring(text, normName)) return 0;

  if (normName.length >= 4 && normText.includes(normName)) return normName.length + 10;

  const nameTokens = tokenizeForMatch(entry.name).filter((t) => !['شهید', 'امام', 'سید'].includes(t));
  const textTokens = new Set(tokenizeForMatch(text));

  let matched = 0;
  for (const t of nameTokens) {
    if (isDealTypeLocationToken(t, text)) continue;
    if (isAreaUnitSubstring(text, t)) continue;
    if (tokenMatchesInText(normText, t, textTokens)) matched += 1;
  }

  for (const a of entry.areas ?? []) {
    const na = normalizeMatchText(a);
    if (isDealTypeLocationToken(na, text)) continue;
    if (isAreaUnitSubstring(text, na)) continue;
    if (na.length < 5) {
      if (textTokens.has(na) && !isDealTypeLocationToken(na, text)) return na.length + 8;
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
export function findNeighborhoodInAnyCity(
  text: string,
  preferredCityId?: string | null
): NeighborhoodGlobalMatch | null {
  const norm = text.trim();
  if (!norm || norm.length < 4) return null;

  const searchOrder = preferredCityId
    ? [
        preferredCityId,
        ...NEIGHBORHOOD_SEARCH_PRIORITY.filter((id) => id !== preferredCityId),
      ]
    : [...NEIGHBORHOOD_SEARCH_PRIORITY];

  let best: NeighborhoodGlobalMatch | null = null;

  for (const cityId of searchOrder) {
    const cityMeta = ALL_LOCATION_CITIES.find((c) => locationCityIdToSlug(c.id) === cityId);
    const cityLabel = cityMeta?.name ?? cityId;
    const catalog = loadCatalogForCityId(cityId, cityLabel);
    if (!catalog.length) continue;

    for (const entry of catalog) {
      let score = scoreNeighborhoodAgainstText(norm, entry);
      if (score <= 0) continue;
      if (preferredCityId && cityId === preferredCityId) {
        score += 18;
      }
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

export interface GlobalNeighborhoodCandidate {
  city: string;
  cityId: string;
  slug: string;
  name: string;
  score: number;
}

/**
 * Above this raw score, a match is exact/near-exact (compact-form equality, full substring
 * containment of a reasonably long fragment/name) — see `scoreFragmentAgainstEntry`'s paths 1-2.
 * This kind of evidence is reliable on its own, with or without a city hint (e.g. "سیدی" → مشهد).
 */
const STRONG_MATCH_FLOOR = 85;

/**
 * LRE permissiveness audit finding: below `STRONG_MATCH_FLOOR`, a match is only weak corroborating
 * evidence (token overlap, prefix, or a blended contextual score — see `scoreFragmentAgainstEntry`
 * paths 3+) — plausible when a city is already known/hinted (narrows the search space enormously),
 * but NOT reliable enough to search the entire nationwide catalog unconstrained and trust the
 * result. Applied only when there is no city hint at all (`preferredCityId` falsy); a hinted
 * search already gets its own `+18` city-match boost below and needn't be further discounted.
 * Precision/recall trade-off, explicit: this trades a small amount of recall (a genuinely correct
 * but weakly-scored nationwide guess may now require a follow-up question instead of auto-
 * resolving) for a large precision gain (a generic word/short fragment with no city context can no
 * longer coincidentally out-score its way to auto-resolution nationwide — the original class of
 * bug this was built to fix, e.g. a fragment fuzzy-matching an unrelated neighborhood by weak
 * token overlap alone).
 */
const NO_HINT_WEAK_MATCH_DISCOUNT = 0.55;

/** Rank neighborhood matches across priority cities (multi-candidate, for LRE). */
export function rankGlobalNeighborhoodCandidates(
  rawText: string,
  fragment: string,
  preferredCityId?: string | null,
  limit = 12
): GlobalNeighborhoodCandidate[] {
  const norm = rawText.trim();
  const seed = fragment.trim() || norm;
  if (!seed || seed.length < 2) return [];

  const searchOrder = preferredCityId
    ? [
        preferredCityId,
        ...NEIGHBORHOOD_SEARCH_PRIORITY.filter((id) => id !== preferredCityId),
      ]
    : [...NEIGHBORHOOD_SEARCH_PRIORITY];

  const hits: GlobalNeighborhoodCandidate[] = [];

  for (const cityId of searchOrder) {
    const cityMeta = ALL_LOCATION_CITIES.find((c) => c.id === cityId);
    const cityLabel = cityMeta?.name ?? cityId;
    const catalog = loadCatalogForCityId(cityId, cityLabel);
    if (!catalog.length) continue;

    for (const entry of catalog) {
      let score = scoreFragmentAgainstEntry(seed, entry, norm);
      if (score <= 0) score = scoreNeighborhoodAgainstText(norm, entry);
      if (score <= 0) continue;
      if (!preferredCityId && score < STRONG_MATCH_FLOOR) {
        score *= NO_HINT_WEAK_MATCH_DISCOUNT;
      }
      if (preferredCityId && cityId === preferredCityId) score += 18;
      hits.push({
        city: entry.city,
        cityId,
        slug: entry.slug,
        name: entry.name,
        score,
      });
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || b.name.length - a.name.length)
    .slice(0, limit);
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

  const normName = normalizeMatchText(entry.name);
  if (LOCATION_STOPWORD_NAMES.has(normName)) return 0;

  const compactFrag = compactMatchText(fragment);
  let best = 0;
  const nn = normalizeMatchText(entry.name);
  const compactName = compactMatchText(entry.name);
  if (compactFrag === compactName || compactFrag.includes(compactName) || compactName.includes(compactFrag)) {
    const shortNameInLongFrag =
      compactName.length > 0 &&
      compactName.length <= 6 &&
      compactFrag.length > compactName.length + 10 &&
      /فرامرز/.test(compactFrag) &&
      !compactName.includes('فرامرز');
    if (!shortNameInLongFrag) {
      best = Math.max(best, compactFrag === compactName ? 98 : 88);
    }
  }
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
    const compactArea = compactMatchText(a);
    const shortAreaInLongFrag =
      compactFrag.length > 14 && compactArea.length > 0 && compactArea.length < 7;
    if (
      compactFrag === compactArea ||
      (!shortAreaInLongFrag &&
        (compactFrag.includes(compactArea) || compactArea.includes(compactFrag)))
    ) {
      best = Math.max(best, compactFrag === compactArea ? 98 : shortAreaInLongFrag ? 52 : 90);
    }
    if (!na) continue;
    if (na === frag) best = Math.max(best, 92);
    else if (frag.includes(na) || na.includes(frag))
      best = Math.max(best, 68 + Math.min(na.length, 10));
    else if (na.startsWith(frag)) best = Math.max(best, 46 + frag.length);
  }

  const anchorMatch = fragment.trim().match(/(?:^|\s)در\s+([\u0600-\u06FF\u200c\-]+)\s*$/u);
  const anchor = anchorMatch?.[1]?.trim();
  if (anchor) {
    const compactAnchor = compactMatchText(anchor);
    const compactName = compactMatchText(entry.name);
    if (compactName.includes(compactAnchor) || compactAnchor === compactName) {
      best = Math.max(best, 82 + Math.min(compactAnchor.length, 12));
    }
    if (/فرامرز/.test(compactAnchor) && compactName.includes('فرامرز')) {
      best = Math.max(best, 96);
    }
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
  const compactFrag = compactMatchText(frag);
  const exactNameMatches = scored.filter(
    (c) => compactMatchText(c.name) === compactFrag && c.score >= 90
  );
  const exactAreaMatches = scored.filter((c) => {
    if (c.score < 90) return false;
    const entry = catalog.find((e) => e.slug === c.slug);
    return (entry?.areas ?? []).some((a) => compactMatchText(a) === compactFrag);
  });

  if (exactAreaMatches.length >= 2) {
    return { candidates: exactAreaMatches, ambiguous: true };
  }

  // Exact hood name + other strong similar hits (compound names / shared sub-areas)
  if (exactNameMatches.length >= 1) {
    const strongSimilar = scored.filter((c) => c.score >= top - AMBIGUOUS_SCORE_GAP);
    if (strongSimilar.length >= 2) {
      return { candidates: scored, ambiguous: true };
    }
    return { candidates: scored, ambiguous: false };
  }

  // Lone sub-area hit without a same-named hood — keep previous auto-resolve behavior
  if (exactAreaMatches.length === 1 && top - second >= AMBIGUOUS_SCORE_GAP) {
    return { candidates: scored, ambiguous: false };
  }

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
