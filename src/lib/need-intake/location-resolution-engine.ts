import type { ParsedIntent } from '@/contracts/need-intake';
import { parseCity } from '@/lib/need-intake/intent-parser';
import {
  extractLocationAnchor,
  extractLocationFragment,
  normalizeHoodFragment,
  pickStreetOrHoodDisplay,
} from '@/lib/need-intake/location-fragment';
import {
  findNeighborhoodInText,
  rankGlobalNeighborhoodCandidates,
  rankNeighborhoodCandidates,
  type GlobalNeighborhoodCandidate,
} from '@/lib/need-intake/neighborhood-catalog.server';

/** Prefer catalog sub-area (e.g. «جلال آل احمد») over parent hood name («سید رضی»). */
function neighborhoodLabelForResolved(
  city: string,
  rawText: string,
  slug: string,
  catalogName: string
): string {
  const match = findNeighborhoodInText(city, rawText);
  if (match?.slug === slug && match.matchedArea?.trim()) {
    return match.matchedArea.trim();
  }
  return catalogName;
}

export type LocationResolutionStatus =
  | 'resolved'
  | 'city_ambiguous'
  | 'neighborhood_ambiguous'
  | 'unresolved';

export interface LocationResolutionResult {
  status: LocationResolutionStatus;
  city?: string;
  cityId?: string;
  neighborhoodSlug?: string;
  neighborhoodLabel?: string;
  fragment?: string;
  confidence: number;
  rejectAutoConfirm: boolean;
  cityCandidates?: Array<{ cityId: string; city: string; label: string; score: number }>;
  neighborhoodCandidates?: Array<{ slug: string; label: string; city: string; score: number }>;
}

/** Generic street / boulevard names — never auto-resolve without explicit city. */
const GENERIC_STREET_FRAGMENTS = new Set([
  'امام خمینی',
  'امام',
  'آزادی',
  'ولیعصر',
  'فردوسی',
  'انقلاب',
  'شریعتی',
  'مطهری',
  'جمهوری',
  'کارگر',
  'بلوار',
  'خیابان',
]);

const RESOLVE_CONFIDENCE_MIN = 72;
const CITY_AMBIGUOUS_GAP = 12;

/** Strong neighborhood→city hints (e.g. «سیدی» ≈ مشهد). */
const NEIGHBORHOOD_CITY_HINTS: Record<string, string> = {
  سیدی: 'mashhad',
  'کوه-سنگی': 'mashhad',
  کوهسنگی: 'mashhad',
  'فرامرز-عباسی': 'mashhad',
  'فرامرز عباسی': 'mashhad',
  'شهید فرامرز عباسی': 'mashhad',
  فرامرز: 'mashhad',
  سجاد: 'mashhad',
  'سجاد شهر': 'mashhad',
  'منطقه سجاد': 'mashhad',
};

const LANDMARK_RESOLUTIONS: Array<{
  pattern: RegExp;
  cityId: string;
  city: string;
  neighborhoodSlug: string;
  neighborhoodLabel: string;
}> = [
  {
    pattern: /پاساژ\s*[\u200c\s]*(?:آ|ا)ناهیتا/u,
    cityId: 'mashhad',
    city: 'مشهد',
    neighborhoodSlug: 'شهید-فرامرز-عباسی',
    neighborhoodLabel: 'شهید فرامرز عباسی',
  },
  {
    pattern: /(?:^|\s)(?:منطقه\s*)?سجاد(?:\s*شهر)?(?:\s|$|[،,])/u,
    cityId: 'mashhad',
    city: 'مشهد',
    neighborhoodSlug: 'سجاد-شهر',
    neighborhoodLabel: 'سجاد شهر',
  },
];

function tryResolveLandmark(
  rawText: string,
  fragment?: string
): LocationResolutionResult | null {
  const haystack = `${fragment ?? ''} ${rawText}`.trim();
  if (!haystack) return null;
  for (const landmark of LANDMARK_RESOLUTIONS) {
    const m = haystack.match(landmark.pattern);
    if (!m) continue;
    const preserve = m[0].trim().replace(/\s+/g, ' ');
    return {
      status: 'resolved',
      city: landmark.city,
      cityId: landmark.cityId,
      neighborhoodSlug: landmark.neighborhoodSlug,
      neighborhoodLabel: landmark.neighborhoodLabel,
      fragment: preserve || fragment,
      confidence: 95,
      rejectAutoConfirm: false,
    };
  }
  return null;
}

function inferPreferredCityIdFromFragment(fragment: string): string | null {
  const anchor = extractLocationAnchor(fragment);
  if (anchor && NEIGHBORHOOD_CITY_HINTS[anchor]) {
    return NEIGHBORHOOD_CITY_HINTS[anchor];
  }
  const compact = fragment.replace(/\u200c/g, '').replace(/\s+/g, '').toLowerCase();
  for (const [token, cityId] of Object.entries(NEIGHBORHOOD_CITY_HINTS)) {
    const key = token.replace(/\u200c/g, '').replace(/\s+/g, '').toLowerCase();
    if (key.length >= 3 && compact.includes(key)) return cityId;
  }
  return null;
}

/** Hood-only fragment when city is explicit at end, e.g. «کوهسنگی مشهد». */
function deriveFragmentFromExplicitCity(rawText: string, explicitCity: string): string | undefined {
  const text = rawText.trim();
  if (!text || !explicitCity) return undefined;

  const cityRe = new RegExp(
    `(?:^|[\\s،])${explicitCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
    'i'
  );
  if (!cityRe.test(text)) return undefined;

  const hood = text
    .replace(cityRe, '')
    .replace(/^[،,\s]+|[،,\s]+$/g, '')
    .trim();
  return hood.length >= 2 ? hood : undefined;
}

/** Hood fragment when city is explicit at start, e.g. «مشهد خیابان فرامرز عباسی». */
function deriveFragmentFromLeadingCity(rawText: string, explicitCity: string): string | undefined {
  const text = rawText.trim();
  if (!text || !explicitCity) return undefined;

  const cityRe = new RegExp(
    `^${explicitCity.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(.+)$`,
    'i'
  );
  const hood = cityRe.exec(text)?.[1]?.trim();
  return hood && hood.length >= 2 ? hood : undefined;
}

function resolveFragment(
  rawText: string,
  explicitCity?: string,
  parsedArea?: string
): string | undefined {
  return (
    extractLocationFragment(rawText) ??
    parsedArea?.trim() ??
    (explicitCity ? deriveFragmentFromLeadingCity(rawText, explicitCity) : undefined) ??
    (explicitCity ? deriveFragmentFromExplicitCity(rawText, explicitCity) : undefined)
  );
}

function isGenericStreetFragment(fragment: string, explicitCity: boolean): boolean {
  const f = fragment.trim().toLowerCase();
  if (explicitCity) return false;
  for (const g of GENERIC_STREET_FRAGMENTS) {
    const gl = g.toLowerCase();
    if (f === gl || f.includes(gl)) return true;
  }
  const namedStreet = normalizeHoodFragment(f);
  if (/^خیابان\s|^بلوار\s|^کوچه\s/.test(f) && namedStreet.length >= 4) return false;
  if (/^خیابان\s*$|^بلوار\s*$|^کوچه\s*$/.test(f)) return true;
  if (/خیابان\s+امام|امام\s*خمینی/.test(f)) return true;
  return false;
}

function collectHoodRankingAttempts(fragment: string): string[] {
  const attempts: string[] = [];
  const normalized = normalizeHoodFragment(fragment);
  if (normalized) attempts.push(normalized);
  const malek = fragment.match(/ملک[\s\u200c]*آباد/u)?.[0];
  if (malek) attempts.push(malek.replace(/\s+/g, ' ').trim());
  return [...new Set(attempts.filter(Boolean))];
}

function resolveNeighborhoodInCity(
  explicitCity: string,
  fragment: string,
  rawText: string
): LocationResolutionResult {
  let hoodFragment = normalizeHoodFragment(fragment);
  if (fragment.includes(explicitCity)) {
    hoodFragment = normalizeHoodFragment(
      deriveFragmentFromLeadingCity(fragment, explicitCity) ??
        deriveFragmentFromExplicitCity(fragment, explicitCity) ??
        fragment
          .replace(explicitCity, '')
          .replace(/^[،,\s]+|[،,\s]+$/g, '')
          .trim()
    );
  }

  for (const attempt of collectHoodRankingAttempts(hoodFragment || fragment)) {
    const { candidates, ambiguous } = rankNeighborhoodCandidates(
      explicitCity,
      attempt,
      rawText,
      8
    );
    if (candidates.length === 0) continue;
    const best = candidates[0]!;
    if (!ambiguous && best.score >= RESOLVE_CONFIDENCE_MIN) {
      return {
        status: 'resolved',
        city: explicitCity,
        neighborhoodSlug: best.slug,
        neighborhoodLabel: neighborhoodLabelForResolved(
          explicitCity,
          rawText,
          best.slug,
          best.name
        ),
        fragment,
        confidence: best.score,
        rejectAutoConfirm: false,
      };
    }
  }

  const primary = hoodFragment || normalizeHoodFragment(fragment) || fragment;
  const { candidates, ambiguous } = rankNeighborhoodCandidates(
    explicitCity,
    primary,
    rawText,
    8
  );
  if (candidates.length === 0) {
    return {
      status: 'unresolved',
      city: explicitCity,
      fragment,
      confidence: 40,
      rejectAutoConfirm: true,
    };
  }
  if (ambiguous) {
    const top = candidates[0]!;
    return {
      status: 'neighborhood_ambiguous',
      city: explicitCity,
      fragment,
      confidence: top.score,
      rejectAutoConfirm: true,
      neighborhoodCandidates: candidates.map((c) => ({
        slug: c.slug,
        label: c.name,
        city: explicitCity,
        score: c.score,
      })),
    };
  }
  const best = candidates[0]!;
  const confident = best.score >= RESOLVE_CONFIDENCE_MIN;
  return {
    status: confident ? 'resolved' : 'neighborhood_ambiguous',
    city: explicitCity,
    neighborhoodSlug: confident ? best.slug : undefined,
    neighborhoodLabel: confident
      ? neighborhoodLabelForResolved(explicitCity, rawText, best.slug, best.name)
      : best.name,
    fragment,
    confidence: best.score,
    rejectAutoConfirm: !confident,
    neighborhoodCandidates: confident
      ? undefined
      : candidates.map((c) => ({
          slug: c.slug,
          label: c.name,
          city: explicitCity,
          score: c.score,
        })),
  };
}

function groupGlobalByCity(
  global: GlobalNeighborhoodCandidate[]
): Map<string, GlobalNeighborhoodCandidate[]> {
  const map = new Map<string, GlobalNeighborhoodCandidate[]>();
  for (const c of global) {
    const list = map.get(c.cityId) ?? [];
    list.push(c);
    map.set(c.cityId, list);
  }
  return map;
}

function applyResolvedToParsed(
  parsed: ParsedIntent,
  result: LocationResolutionResult
): ParsedIntent {
  const next: ParsedIntent = { ...parsed };

  next.locationResolutionStatus = result.status;
  next.rejectLocationAutoConfirm = result.rejectAutoConfirm;
  next.cityCandidates = result.cityCandidates?.map((c) => ({
    cityId: c.cityId,
    label: c.label,
  }));

  if (result.status === 'resolved' && result.city) {
    next.city = result.city;
    next.locationAmbiguous = false;
    next.neighborhoodCandidates = undefined;
    if (result.neighborhoodSlug) {
      next.neighborhoodSlug = result.neighborhoodSlug;
      const areaLabel =
        result.neighborhoodLabel?.trim() ||
        pickStreetOrHoodDisplay(result.fragment, result.neighborhoodLabel) ||
        result.fragment?.trim();
      if (areaLabel) {
        next.entities = {
          ...next.entities,
          area: areaLabel,
        };
      }
    } else if (result.fragment) {
      next.entities = { ...next.entities, area: result.fragment };
    }
    return next;
  }

  if (result.status === 'city_ambiguous') {
    next.city = undefined;
    next.neighborhoodSlug = undefined;
    next.locationAmbiguous = true;
    next.neighborhoodCandidates = result.neighborhoodCandidates?.slice(0, 6).map((c) => ({
      slug: c.slug,
      label: `${c.label} — ${c.city}`,
      city: c.city,
    }));
    if (result.fragment) {
      next.entities = { ...next.entities, area: result.fragment };
    }
    return next;
  }

  if (result.status === 'neighborhood_ambiguous' && result.city) {
    next.city = result.city;
    next.neighborhoodSlug = undefined;
    next.locationAmbiguous = true;
    next.neighborhoodCandidates = result.neighborhoodCandidates?.slice(0, 6).map((c) => ({
      slug: c.slug,
      label: c.label,
      city: c.city,
    }));
    if (result.fragment) {
      next.entities = { ...next.entities, area: result.fragment };
    }
    return next;
  }

  if (result.city && !result.neighborhoodSlug) {
    next.city = result.city;
  }
  if (result.fragment) {
    next.entities = { ...next.entities, area: result.fragment };
  }
  next.locationAmbiguous = result.status !== 'resolved';
  return next;
}

/** Resolve location from user text with no-guess policy. */
export function resolveLocation(
  rawText: string,
  opts?: {
    explicitCity?: string;
    preferredCityId?: string | null;
    parsed?: ParsedIntent;
  }
): LocationResolutionResult {
  const explicitCity = opts?.explicitCity?.trim() || parseCity(rawText);
  const fragment = resolveFragment(
    rawText,
    explicitCity,
    opts?.parsed?.entities?.area
  );

  const landmark = tryResolveLandmark(rawText, fragment);
  if (landmark) return landmark;

  if (!fragment && !explicitCity) {
    return {
      status: 'unresolved',
      confidence: 0,
      rejectAutoConfirm: true,
    };
  }

  if (fragment && isGenericStreetFragment(fragment, Boolean(explicitCity))) {
    return {
      status: explicitCity ? 'unresolved' : 'city_ambiguous',
      fragment,
      city: explicitCity,
      confidence: 20,
      rejectAutoConfirm: true,
      cityCandidates: explicitCity
        ? undefined
        : [
            { cityId: 'mashhad', city: 'مشهد', label: 'مشهد', score: 0 },
            { cityId: 'tehran-city', city: 'تهران', label: 'تهران', score: 0 },
            { cityId: 'isfahan', city: 'اصفهان', label: 'اصفهان', score: 0 },
          ],
    };
  }

  if (explicitCity && fragment) {
    return resolveNeighborhoodInCity(explicitCity, fragment, rawText);
  }

  if (explicitCity && !fragment) {
    return {
      status: 'unresolved',
      city: explicitCity,
      confidence: 50,
      rejectAutoConfirm: true,
    };
  }

  const cityHintId =
    opts?.preferredCityId ?? inferPreferredCityIdFromFragment(fragment ?? rawText);

  const global = rankGlobalNeighborhoodCandidates(
    rawText,
    fragment ?? '',
    cityHintId,
    12
  );

  if (global.length === 0) {
    return {
      status: 'unresolved',
      fragment,
      confidence: 0,
      rejectAutoConfirm: true,
    };
  }

  const byCity = groupGlobalByCity(global);
  const cityScores = [...byCity.entries()]
    .map(([cityId, list]) => ({
      cityId,
      city: list[0].city,
      score: Math.max(...list.map((x) => x.score)),
      best: list[0],
    }))
    .sort((a, b) => b.score - a.score);

  const topCity = cityScores[0];
  const secondCity = cityScores[1];

  if (cityHintId && byCity.has(cityHintId)) {
    const hinted = byCity.get(cityHintId)!;
    const hintedSorted = [...hinted].sort((a, b) => b.score - a.score);
    const hintTop = hintedSorted[0];
    const hintSecond = hintedSorted[1];
    const hoodAmbiguous =
      hintedSorted.length >= 2 &&
      hintSecond &&
      hintTop.score - hintSecond.score < 14;
    if (hoodAmbiguous) {
      return {
        status: 'neighborhood_ambiguous',
        city: hintTop.city,
        cityId: cityHintId,
        fragment,
        confidence: hintTop.score,
        rejectAutoConfirm: true,
        neighborhoodCandidates: hintedSorted.slice(0, 6).map((c) => ({
          slug: c.slug,
          label: c.name,
          city: c.city,
          score: c.score,
        })),
      };
    }
    if (hintTop && hintTop.score >= RESOLVE_CONFIDENCE_MIN) {
      return {
        status: 'resolved',
        city: hintTop.city,
        cityId: cityHintId,
        neighborhoodSlug: hintTop.slug,
        neighborhoodLabel: hintTop.name,
        fragment,
        confidence: hintTop.score,
        rejectAutoConfirm: false,
      };
    }
  }

  const multiCity =
    cityScores.length >= 2 &&
    secondCity &&
    topCity.score - secondCity.score < CITY_AMBIGUOUS_GAP &&
    secondCity.score >= RESOLVE_CONFIDENCE_MIN - 10;

  if (multiCity) {
    const hoodCandidates = global.slice(0, 6).map((c) => ({
      slug: c.slug,
      label: c.name,
      city: c.city,
      score: c.score,
    }));
    return {
      status: 'city_ambiguous',
      fragment,
      confidence: topCity.score,
      rejectAutoConfirm: true,
      cityCandidates: cityScores.slice(0, 4).map((c) => ({
        cityId: c.cityId,
        city: c.city,
        label: c.city,
        score: c.score,
      })),
      neighborhoodCandidates: hoodCandidates,
    };
  }

  const best = topCity.best;
  const confident = best.score >= RESOLVE_CONFIDENCE_MIN;

  if (!confident) {
    return {
      status: 'city_ambiguous',
      fragment,
      confidence: best.score,
      rejectAutoConfirm: true,
      cityCandidates: cityScores.slice(0, 4).map((c) => ({
        cityId: c.cityId,
        city: c.city,
        label: c.city,
        score: c.score,
      })),
      neighborhoodCandidates: global.slice(0, 6).map((c) => ({
        slug: c.slug,
        label: c.name,
        city: c.city,
        score: c.score,
      })),
    };
  }

  return {
    status: 'resolved',
    city: best.city,
    cityId: best.cityId,
    neighborhoodSlug: best.slug,
    neighborhoodLabel: best.name,
    fragment,
    confidence: best.score,
    rejectAutoConfirm: false,
  };
}

/** Merge LRE result into ParsedIntent for property intake. */
export function applyLocationResolutionToParsed(
  parsed: ParsedIntent,
  opts?: {
    preferredCityId?: string | null;
    preferredCityName?: string | null;
    locationText?: string;
  }
): ParsedIntent {
  const locationSource = opts?.locationText?.trim() || parsed.rawText?.trim() || '';
  if (!locationSource) return parsed;

  const explicitCity =
    parseCity(locationSource) ||
    parsed.city?.trim() ||
    opts?.preferredCityName?.trim() ||
    undefined;

  const result = resolveLocation(locationSource, {
    explicitCity,
    preferredCityId: opts?.preferredCityId,
    parsed: { ...parsed, city: explicitCity ?? parsed.city },
  });

  return applyResolvedToParsed(parsed, result);
}
