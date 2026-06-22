/**
 * Smart location resolver — city + neighborhood from free Persian text.
 *
 * Place names are proper nouns, so this uses normalized exact + fuzzy string
 * matching (not embeddings) over the FULL catalog (1207 cities / 48k
 * neighborhoods), plus Finglish transliteration. The key win over the legacy
 * engine: it can infer the city from ANY neighborhood mention (not ~20 hardcoded
 * ones) by indexing every neighborhood with its city, and disambiguates
 * same-named neighborhoods by city prominence.
 */
import 'server-only';

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeIntakeText } from '@/lib/need-intake/normalize-intake-text';
import { transliterateFinglish, looksFinglish } from '@/intake/intelligence-engine/semantic/finglish';

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');

export interface SmartLocationResult {
  citySlug: string | null;
  cityName: string | null;
  neighborhoodSlug: string | null;
  neighborhoodName: string | null;
  /** 'city' = direct city match, 'neighborhood' = city inferred from neighborhood. */
  method: 'city' | 'neighborhood' | 'city+neighborhood' | 'fuzzy-city' | 'none';
  confidence: number;
}

interface CityEntry {
  citySlug: string;
  cityName: string;
}
interface NbEntry {
  citySlug: string;
  cityName: string;
  nbSlug: string;
  nbName: string;
}

interface LocationIndex {
  cities: Map<string, CityEntry>; // normalized city name -> entry
  cityNames: string[]; // normalized city names (for fuzzy)
  neighborhoods: Map<string, NbEntry[]>; // normalized nb/area name -> entries (multi-city)
  prominence: Map<string, number>; // citySlug -> rank (lower = more prominent)
}

/** Major cities first — used to disambiguate same-named neighborhoods/cities. */
const PROMINENCE_ORDER = [
  'tehran-city', 'tehran', 'mashhad', 'isfahan', 'karaj', 'shiraz', 'tabriz',
  'ahvaz', 'qom', 'kermanshah', 'urmia', 'rasht', 'zahedan', 'hamadan', 'kerman',
  'yazd', 'ardabil', 'bandar-abbas', 'arak', 'eslamshahr', 'zanjan', 'sanandaj',
  'qazvin', 'khorramabad', 'gorgan', 'sari', 'shahrekord', 'bushehr', 'birjand', 'ilam',
];

let indexCache: LocationIndex | null = null;

/** Normalize a place string: Finglish→Persian, then standard intake normalize. */
export function normalizeLocationText(s: string): string {
  const base = looksFinglish(s) ? transliterateFinglish(s) : s;
  return normalizeIntakeText(base).replace(/\s+/g, ' ').trim();
}

// Common words that are ALSO neighborhood names — never infer a location from
// these alone (avoids false positives like "نو", "شهرک", deal/property words).
const STOP_TOKENS = new Set(
  [
    'نو', 'شهر', 'شهرک', 'مرکز', 'مرکزی', 'بالا', 'پایین', 'جدید', 'قدیم', 'قدیمی',
    'ده', 'باغ', 'کوی', 'بلوار', 'خیابان', 'میدان', 'جاده', 'پارک', 'گلستان',
    'بهار', 'بهاران', 'ولیعصر', 'امام', 'انقلاب', 'آزادی', 'فردوس', 'صنعتی',
    'رهن', 'اجاره', 'فروش', 'خرید', 'فروشی', 'متری', 'خواب', 'خوابه', 'طبقه',
    'ودیعه', 'پیش', 'قیمت', 'بودجه', 'تومان', 'میلیون', 'میلیارد', 'حدود',
    'منزل', 'خانه', 'خونه', 'آپارتمان', 'ویلا', 'مغازه', 'دفتر', 'زمین',
    // common verbs / fillers that are also (accidental) neighborhood names
    'هست', 'هستم', 'هستیم', 'هستن', 'هستند', 'باشه', 'باشد', 'بود', 'بودم',
    'موجود', 'میخوام', 'می‌خوام', 'میخواهم', 'خوام', 'دارم', 'داریم', 'دارد',
    'خریدارم', 'فروشنده', 'کهنه', 'حلقه', 'صفحه', 'عدد', 'اگر', 'یک', 'یه',
    'من', 'تو', 'ما', 'برای', 'واسه', 'لطفا', 'سلام', 'ممنون', 'هم', 'تا',
    'خوب', 'عالی', 'سالم', 'تعمیر', 'تعمیرکار', 'نیاز', 'دنبال', 'سراغ',
    // common business / job words that are ALSO (accidental) neighborhood names
    'شرکت', 'استخدام', 'حسابدار', 'کارمند', 'کارفرما', 'اداره', 'سازمان', 'موسسه',
    'کارگر', 'منشی', 'فروشگاه', 'کارگاه', 'پرستار', 'معلم', 'راننده',
  ].map((w) => normalizeIntakeText(w))
);

// Location cue words — a fuzzy city match is only trusted right after one.
const LOC_CUES = new Set(
  ['در', 'تو', 'توی', 'شهر', 'استان', 'واقع', 'محله', 'منطقه', 'حوالی', 'نزدیک'].map((w) =>
    normalizeIntakeText(w)
  )
);

function buildIndex(): LocationIndex {
  if (indexCache) return indexCache;
  const cities = new Map<string, CityEntry>();
  const neighborhoods = new Map<string, NbEntry[]>();
  const prominence = new Map<string, number>();

  const files = existsSync(CATALOG_DIR)
    ? readdirSync(CATALOG_DIR).filter((f) => f.endsWith('.json'))
    : [];

  for (const file of files) {
    const citySlug = file.replace(/\.json$/, '');
    let data: { cityName?: string; neighborhoods?: Array<{ id: string; name: string; areas?: string[] }> };
    try {
      data = JSON.parse(readFileSync(path.join(CATALOG_DIR, file), 'utf8'));
    } catch {
      continue;
    }
    const cityName = (data.cityName ?? citySlug).trim();
    const cityKey = normalizeIntakeText(cityName);
    if (cityKey && !cities.has(cityKey)) cities.set(cityKey, { citySlug, cityName });

    for (const n of data.neighborhoods ?? []) {
      const names = [n.name, ...(n.areas ?? [])];
      for (const raw of names) {
        const key = normalizeIntakeText(raw);
        if (!key || key.length < 2) continue;
        const entry: NbEntry = { citySlug, cityName, nbSlug: n.id, nbName: n.name };
        const arr = neighborhoods.get(key);
        if (arr) arr.push(entry);
        else neighborhoods.set(key, [entry]);
      }
    }
  }

  PROMINENCE_ORDER.forEach((slug, i) => prominence.set(slug, i));

  indexCache = { cities, cityNames: [...cities.keys()], neighborhoods, prominence };
  return indexCache;
}

export function resetSmartLocationIndex(): void {
  indexCache = null;
}

/**
 * Resolve a city NAME (e.g. "کرمانشاه" from the form/UI) to the catalog's own
 * citySlug (catalog filename, e.g. "kermanshah-city"). This is the single
 * source of truth for catalog slugs — do NOT use other city-slug schemes
 * (e.g. the fuse/location-index search) to scope a catalog lookup, since
 * their slug spaces don't match this one and even mismatch cities entirely.
 */
export function resolveCatalogCitySlugByName(cityName: string): string | null {
  const idx = buildIndex();
  const key = normalizeIntakeText(cityName);
  return idx.cities.get(key)?.citySlug ?? null;
}

function rank(citySlug: string, prominence: Map<string, number>): number {
  return prominence.get(citySlug) ?? 9999;
}

function pickByProminence<T extends { citySlug: string }>(items: T[], prominence: Map<string, number>): T {
  return [...items].sort((a, b) => rank(a.citySlug, prominence) - rank(b.citySlug, prominence))[0]!;
}

function ngrams(words: string[], max = 3): string[] {
  const out: string[] = [];
  for (let n = max; n >= 1; n--) {
    for (let i = 0; i + n <= words.length; i++) {
      out.push(words.slice(i, i + n).join(' '));
    }
  }
  return out;
}

/** Levenshtein ≤ maxDist (early-exit). */
function withinEditDistance(a: string, b: string, maxDist: number): boolean {
  if (Math.abs(a.length - b.length) > maxDist) return false;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let curMin = i;
    const cur = [i, ...new Array(b.length).fill(0)];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (cur[j]! < curMin) curMin = cur[j]!;
    }
    if (curMin > maxDist) return false;
    for (let k = 0; k <= b.length; k++) prev[k] = cur[k]!;
  }
  return prev[b.length]! <= maxDist;
}

/**
 * Resolve city + neighborhood from text. If `scopedCitySlug` is provided the
 * neighborhood search is biased to that city.
 */
export function smartResolveLocation(
  rawText: string,
  opts?: { scopedCitySlug?: string | null }
): SmartLocationResult {
  const idx = buildIndex();
  const norm = normalizeLocationText(rawText);
  if (!norm) return EMPTY;
  const words = norm.split(' ').filter(Boolean);
  const grams = ngrams(words, 3);

  // 1) Direct city match (longest gram wins; ties broken by prominence).
  let cityHit: CityEntry | null = null;
  for (const g of grams) {
    const hit = idx.cities.get(g);
    if (hit) {
      if (!cityHit || rank(hit.citySlug, idx.prominence) < rank(cityHit.citySlug, idx.prominence)) {
        cityHit = hit;
      }
    }
  }

  // 2) Neighborhood match — collect ALL candidate matches and keep the BEST
  //    (multi-word ≫ single-word; then scoped city; then city prominence), so a
  //    stray verb can't beat a real neighborhood, and نارمک (تهران, rank 0) wins
  //    over a same-named neighborhood in an obscure city.
  const scopedCity = opts?.scopedCitySlug ?? cityHit?.citySlug ?? null;
  let nbHit: NbEntry | null = null;
  let nbScore = -Infinity;
  // Position-aware so we know the preceding word (location cue). A SINGLE-word
  // neighborhood used to INFER a city (no explicit/scoped city) must follow a
  // cue («در نیاوران»), so a common word that happens to be a neighborhood name
  // («گیمینگ»، «دست») can't hallucinate a city. Multi-word names are specific
  // enough to match without a cue.
  for (let start = 0; start < words.length; start++) {
    const hasCue = start > 0 && LOC_CUES.has(words[start - 1]!);
    for (let n = Math.min(3, words.length - start); n >= 1; n--) {
      const g = words.slice(start, start + n).join(' ');
      if (n === 1 && (STOP_TOKENS.has(g) || g.length < 3)) continue;
      const arr = idx.neighborhoods.get(g);
      if (!arr?.length) continue;
      for (const e of arr) {
        const scopedMatch = scopedCity != null && e.citySlug === scopedCity;
        if (n === 1 && !scopedMatch && !cityHit && !hasCue) continue;
        let score = n > 1 ? 1000 : 0;
        score += g.length;
        score += (10000 - rank(e.citySlug, idx.prominence)) / 100;
        if (scopedMatch) score += 5000;
        if (hasCue) score += 50;
        if (score > nbScore) {
          nbScore = score;
          nbHit = e;
        }
      }
    }
  }

  // 3) Fuzzy city fallback (typos) — ONLY for a token right after a location
  //    cue ("در شهر …"), so common words like «کولر» can't fuzzy-match a city.
  if (!cityHit && !nbHit) {
    for (let i = 1; i < words.length; i++) {
      const w = words[i]!;
      if (w.length < 4 || STOP_TOKENS.has(w)) continue;
      if (!LOC_CUES.has(words[i - 1]!)) continue;
      for (const name of idx.cityNames) {
        if (Math.abs(name.length - w.length) > 1) continue;
        if (withinEditDistance(w, name, 1)) {
          cityHit = idx.cities.get(name)!;
          break;
        }
      }
      if (cityHit) break;
    }
    if (cityHit) {
      return {
        citySlug: cityHit.citySlug, cityName: cityHit.cityName,
        neighborhoodSlug: null, neighborhoodName: null,
        method: 'fuzzy-city', confidence: 0.6,
      };
    }
  }

  if (cityHit && nbHit && nbHit.citySlug === cityHit.citySlug) {
    return {
      citySlug: cityHit.citySlug, cityName: cityHit.cityName,
      neighborhoodSlug: nbHit.nbSlug, neighborhoodName: nbHit.nbName,
      method: 'city+neighborhood', confidence: 0.9,
    };
  }
  if (cityHit) {
    return {
      citySlug: cityHit.citySlug, cityName: cityHit.cityName,
      neighborhoodSlug: null, neighborhoodName: null,
      method: 'city', confidence: 0.85,
    };
  }
  if (nbHit) {
    // City inferred purely from the neighborhood mention.
    return {
      citySlug: nbHit.citySlug, cityName: nbHit.cityName,
      neighborhoodSlug: nbHit.nbSlug, neighborhoodName: nbHit.nbName,
      method: 'neighborhood', confidence: 0.7,
    };
  }
  return EMPTY;
}

const EMPTY: SmartLocationResult = {
  citySlug: null, cityName: null, neighborhoodSlug: null,
  neighborhoodName: null, method: 'none', confidence: 0,
};

/**
 * Strict scoped lookup — for when the city is ALREADY known/locked (e.g. the
 * user picked it explicitly). Returns a neighborhood ONLY if it's a real,
 * cataloged entry belonging to exactly that city; never a different city,
 * never a raw unvalidated text fragment. Returns null (→ leave the field
 * empty for the user to pick) when no real neighborhood is mentioned.
 */
export function findNeighborhoodInScopedCity(
  rawText: string,
  citySlug: string
): { slug: string; name: string } | null {
  if (!citySlug) return null;
  const idx = buildIndex();
  const norm = normalizeLocationText(rawText);
  if (!norm) return null;
  const words = norm.split(' ').filter(Boolean);

  let best: NbEntry | null = null;
  let bestScore = -Infinity;
  for (let start = 0; start < words.length; start++) {
    for (let n = Math.min(3, words.length - start); n >= 1; n--) {
      const g = words.slice(start, start + n).join(' ');
      if (n === 1 && (STOP_TOKENS.has(g) || g.length < 3)) continue;
      const arr = idx.neighborhoods.get(g);
      if (!arr?.length) continue;
      for (const e of arr) {
        if (e.citySlug !== citySlug) continue; // never leak another city
        const score = (n > 1 ? 1000 : 0) + g.length;
        if (score > bestScore) {
          bestScore = score;
          best = e;
        }
      }
    }
  }
  return best ? { slug: best.nbSlug, name: best.nbName } : null;
}
