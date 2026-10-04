import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';

export interface TextNeighborhoodResolution {
  hit?: ManagedNeighborhood;
  candidates: ManagedNeighborhood[];
}

type PreparedNeighborhoodLabel = {
  neighborhood: ManagedNeighborhood;
  canonical: boolean;
  labelKey: string;
  labelLength: number;
  matcher: RegExp;
};

type PreparedNeighborhoodCatalog = {
  labels: PreparedNeighborhoodLabel[];
  canonicalNameKeys: Set<string>;
  /** How many neighborhoods list each non-canonical label (compact key). */
  areaUsage: Map<string, number>;
};

const preparedCatalogs = new WeakMap<ManagedNeighborhood[], PreparedNeighborhoodCatalog>();

function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[يى]/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/[ۀة]/gu, 'ه')
    .replace(/[أإآ]/gu, 'ا')
    .replace(/[\u064B-\u065F\u0670\u0640]/gu, '')
    .replace(/[۰-۹٠-٩]/gu, (digit) => {
      const persian = '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit);
      return String(persian >= 0 ? persian : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit));
    })
    .replace(/\u200c/gu, ' ')
    // Keep parentheses: some official neighborhood names include a city
    // qualifier, and stripping it made two distinct catalog names identical.
    .replace(/[^\p{L}\p{N}()]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}

function compact(text: string): string {
  return normalize(text).replace(/\s+/gu, '');
}

function exactMatches(neighborhoods: ManagedNeighborhood[], phrase: string): ManagedNeighborhood[] {
  const target = compact(phrase);
  if (target.length < 3) return [];
  // The catalog may include a formal honorific while users omit it, and
  // Persian place names are often typed without spaces. Require an exact
  // compact-name match; fuzzy substrings must never silently select a row.
  const named = neighborhoods.filter((neighborhood) => {
    const name = compact(neighborhood.name);
    const withoutHonorific = compact(neighborhood.name.replace(/^شهید\s+/u, ''));
    return name === target || withoutHonorific === target;
  });
  if (named.length) return named;
  return neighborhoods.filter((neighborhood) =>
    (neighborhood.areas ?? []).some((label) => compact(label) === target)
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

type TextSpan = { start: number; end: number };

/** Locate the selected city as context so its own words cannot become a hood. */
function selectedCitySpans(text: string, cityName: string): TextSpan[] {
  const withoutQualifiers = cityName.replace(/\s*\([^)]*\)/gu, ' ');
  const qualifiers = [...cityName.matchAll(/\(([^)]*)\)/gu)].map((match) => match[1] ?? '');
  const variants = new Set([
    normalize(cityName),
    normalize(withoutQualifiers),
    ...qualifiers.map((qualifier) => normalize(`${withoutQualifiers} ${qualifier}`)),
  ].filter(Boolean));
  const spans: TextSpan[] = [];

  for (const variant of variants) {
    const body = variant.split(/\s+/u).map(escapeRegExp).join('\\s+');
    const matcher = new RegExp(`(^|[^\\p{L}\\p{N}])(${body})(?=$|[^\\p{L}\\p{N}])`, 'gu');
    for (const match of text.matchAll(matcher)) {
      const label = match[2] ?? '';
      const start = (match.index ?? 0) + (match[1]?.length ?? 0);
      spans.push({ start, end: start + label.length });
    }
  }
  return spans;
}

function precedingCityEndOf(citySpans: TextSpan[], position: number): number {
  return citySpans.reduce(
    (latest, span) => (span.end <= position ? Math.max(latest, span.end) : latest),
    0
  );
}

function neighborhoodLabels(neighborhood: ManagedNeighborhood): Array<{ label: string; canonical: boolean }> {
  const labels = [
    { label: neighborhood.name, canonical: true },
    {
      label: neighborhood.name.replace(/^(?:شهید|سید|آیت\s+الله)\s+/u, ''),
      canonical: true,
    },
    ...(neighborhood.areas ?? []).map((label) => ({ label, canonical: false })),
  ];
  return labels.filter(
    (entry, index) =>
      compact(entry.label).length >= 2 &&
      labels.findIndex((candidate) => compact(candidate.label) === compact(entry.label)) === index
  );
}

function prepareNeighborhoodCatalog(neighborhoods: ManagedNeighborhood[]): PreparedNeighborhoodCatalog {
  const cached = preparedCatalogs.get(neighborhoods);
  if (cached) return cached;

  const labels: PreparedNeighborhoodLabel[] = [];
  const canonicalNameKeys = new Set<string>();
  const areaUsage = new Map<string, number>();
  for (const neighborhood of neighborhoods) {
    for (const { label, canonical } of neighborhoodLabels(neighborhood)) {
      const normalized = normalize(label);
      const labelKey = normalized.replace(/\s+/gu, '');
      const tokens = normalized.split(' ').filter(Boolean);
      if (!tokens.length) continue;
      const labelPattern = tokens.map(escapeRegExp).join('\\s*');
      const ezafeYeh = normalized.endsWith('ا') ? 'ی?' : '';
      labels.push({
        neighborhood,
        canonical,
        labelKey,
        labelLength: labelKey.length,
        // Persian punctuation right after the label is a word boundary too
        // («…مهران (سیدخندان)، ۹۵۱ میلیون…»).
        matcher: new RegExp(`(?:^|\\s)(${labelPattern}${ezafeYeh})(?=\\s|$|[،,؛.!؟])`, 'gu'),
      });
      if (canonical) {
        canonicalNameKeys.add(labelKey);
      } else {
        areaUsage.set(labelKey, (areaUsage.get(labelKey) ?? 0) + 1);
      }
    }
  }

  const prepared = { labels, canonicalNameKeys, areaUsage };
  preparedCatalogs.set(neighborhoods, prepared);
  return prepared;
}

/** Two-character names are only safe with a strong, explicit place cue. */
function hasStrongNeighborhoodCue(before: string): boolean {
  return /(?:^|\s)(?:محله|محدوده|منطقه|حوالی|اطراف|حاشیه|نزدیک)(?:\s+ی)?\s*$/u.test(before);
}

function hasExplicitFragmentLocationEvidence(
  text: string,
  fragment: string,
  citySpans: TextSpan[]
): boolean {
  const normalized = normalize(fragment);
  if (!normalized) return false;
  const labelPattern = normalized.split(/\s+/u).map(escapeRegExp).join('\\s*');
  const matcher = new RegExp(`(?:^|\\s)(${labelPattern})(?=\\s|$)`, 'gu');
  for (const match of text.matchAll(matcher)) {
    const label = match[1] ?? '';
    const start = (match.index ?? 0) + match[0].length - label.length;
    const end = start + label.length;
    if (citySpans.some((span) => span.start <= start && end <= span.end)) continue;
    const precedingCityEnd = citySpans.reduce(
      (latest, span) => (span.end <= start ? Math.max(latest, span.end) : latest),
      0
    );
    const before = text.slice(Math.max(start - 40, precedingCityEnd), start).trim();
    if (
      hasStrongNeighborhoodCue(before) ||
      (label.length >= 3 && /(?:^|\s)(?:در|تو|توی|داخل)\s*$/u.test(before))
    ) return true;
  }
  return false;
}

/**
 * Resolve only a neighborhood explicitly present in the user's text and in the
 * selected city's catalog. Similarity is deliberately not enough to fill a
 * form field; shared aliases and multiple mentioned places stay suggestions.
 */
export function resolveTextNeighborhoodInCity(
  neighborhoods: ManagedNeighborhood[],
  sourceText: string,
  cityName: string
): TextNeighborhoodResolution {
  if (!cityName.trim() || !sourceText.trim() || !neighborhoods.length) {
    return { candidates: [] };
  }

  const text = normalize(sourceText);
  const city = normalize(cityName);
  const cityAliases = new Set([
    city,
    compact(cityName),
    compact(cityName.replace(/\([^)]*\)/gu, ' ')),
  ].filter(Boolean));
  const citySpans = selectedCitySpans(text, cityName);
  const preparedCatalog = prepareNeighborhoodCatalog(neighborhoods);
  const canonicalCatalogNameKeys = preparedCatalog.canonicalNameKeys;
  const matches: Array<{
    neighborhood: ManagedNeighborhood;
    labelKey: string;
    labelLength: number;
    isName: boolean;
    start: number;
    end: number;
    includesCitySuffix: boolean;
    duplicatesDistrictWithCitySuffix: boolean;
    bare: boolean;
  }> = [];
  for (const entry of preparedCatalog.labels) {
      const { neighborhood, canonical, labelKey, labelLength, matcher } = entry;
      const cityAliasLabel = cityAliases.has(labelKey);
      // Some city catalogs also contain a broad "neighborhood" whose label
      // is exactly the city name (e.g. Ahvaz). In a phrase that names both a
      // district and the selected city, treating that city token as a second
      // neighborhood creates a false ambiguity. The selected city is scope,
      // never a neighborhood candidate — unless the mention sits in an
      // explicit spatial context or is repeated, which reads as the
      // city-named neighborhood the catalog manages (e.g. «محدوده موران»).
      const parentheticalCityQualifier = [...cityAliases].some((alias) => labelKey.endsWith(`(${alias})`));
      const includesCitySuffix = !parentheticalCityQualifier && [...cityAliases].some((alias) =>
        labelKey.length > alias.length && labelKey.endsWith(alias)
      );
      // Catalogs can contain both a district name and the same name suffixed
      // by its city (e.g. "شهرک دانشگاه" and "شهرک دانشگاه تهران"). When
      // the city token is already the selected location context, do not let
      // the suffixed duplicate consume that separate city mention and outrank
      // the exact district label.
      const duplicatesDistrictWithCitySuffix = [...cityAliases].some((alias) =>
        labelKey.length > alias.length &&
        labelKey.endsWith(alias) &&
        canonicalCatalogNameKeys.has(labelKey.slice(0, -alias.length))
      );
      if (labelLength < 2) continue;
      matcher.lastIndex = 0;
      let cityAliasOccurrences = 0;
      if (cityAliasLabel) {
        for (const occurrence of text.matchAll(matcher)) {
          cityAliasOccurrences += 1;
          if (cityAliasOccurrences >= 2) break;
        }
        matcher.lastIndex = 0;
      }
      for (const match of text.matchAll(matcher)) {
        const matchedLabel = match[1] ?? '';
        const matchStart = (match.index ?? 0) + match[0].length - matchedLabel.length;
        const matchEnd = matchStart + matchedLabel.length;
        const before = text.slice(Math.max(matchStart - 40, precedingCityEndOf(citySpans, matchStart)), matchStart).trim();
        const after = text.slice(matchStart + matchedLabel.length, matchStart + matchedLabel.length + 40).trim();
        const cityAliasAllowed =
          cityAliasLabel &&
          (hasStrongNeighborhoodCue(before) || cityAliasOccurrences >= 2);
        // A selected city can itself be present in the neighborhood catalog,
        // or contain the name of a catalog neighborhood (e.g. «میاندشت» in
        // «بوئین و میاندشت»). A match wholly inside that city mention is
        // context, not a neighborhood selection. A longer canonical label
        // that contains the city name remains eligible.
        if (
          !cityAliasAllowed &&
          citySpans.some((span) => span.start <= matchStart && matchEnd <= span.end)
        ) continue;
        if (cityAliasLabel && !cityAliasAllowed) continue;
        const hasLocationCue =
          /(?:^|\s)(?:در|تو|توی|حوالی|اطراف|نزدیک|محدوده|محله|منطقه|خیابان|بلوار|میدان|حاشیه|دور و بر)(?:\s+\S+){0,2}$/u.test(before) ||
          // «آپارتمان ۱۰۴ متر زاد رهن کامل» — a canonical hood name glued to
          // the meterage is the location the user named, not a random word.
          /(?:^|\s)(?:\d+|[۰-۹]+)\s*(?:متر|متری)$/u.test(before) ||
          /^(?:بین|مدنظرم|مدنظرمه|مد نظرم|مورد نظرم)(?:\s|$)/u.test(after) ||
          (city.length > 0 && (after === city || after.startsWith(`${city} `)));
        // A bare mention («میخوام یافت آباد شمالی») is accepted for labels
        // long enough to be unambiguous place names; shorter tokens keep
        // requiring an explicit spatial cue.
        const bare = !hasLocationCue && !cityAliasAllowed;
        // A 2-char canonical hood name («حر» تهران) is accepted only when the
        // spatial cue is directly adjacent — no token between cue and label —
        // so ordinary short words never become neighborhoods.
        const directlyCued =
          /(?:^|\s)(?:در|تو|توی|حوالی|نزدیک|محدوده|محله|منطقه)$/u.test(before);
        if (
          (hasLocationCue && (labelLength >= 3 || hasStrongNeighborhoodCue(before) || (labelLength === 2 && directlyCued))) ||
          (bare && labelLength >= 5)
        ) {
          matches.push({
            neighborhood,
            labelKey,
            labelLength,
            isName: canonical,
            start: matchStart,
            end: matchEnd,
            includesCitySuffix,
            duplicatesDistrictWithCitySuffix,
            bare,
          });
        }
      }
  }

  if (matches.length) {
    // A mention fully covered by a longer matched label is part of a compound
    // name («حافظ» inside «تقاطع غیر همسطح حافظ», «ابوذر» inside
    // «ابوذر شرقی») — the compound is the place the user actually named.
    // A coverer that itself ends with the selected city's name belongs to the
    // city-suffix dedup below, not to containment.
    const covered = new Set(
      matches.filter((match) =>
        matches.some(
          (other) =>
            other !== match &&
            !other.includesCitySuffix &&
            other.labelLength > match.labelLength &&
            other.start <= match.start &&
            match.end <= other.end
        )
      )
    );
    const surviving = matches.filter((match) => !covered.has(match));
    if (!surviving.length) surviving.push(...matches);
    // Cued mentions are explicit evidence; bare long-label mentions only fill
    // in when nothing cued was found — except a bare compound that overlaps a
    // cued match («شهرک دانشگاه تهران» covers the cued «شهرک دانشگاه» + city),
    // which must compete with it instead of being dropped.
    const cuedMatches = surviving.filter((match) => !match.bare);
    const pool = cuedMatches.length
      ? surviving.filter(
          (match) =>
            !match.bare ||
            cuedMatches.some((cued) => cued.start < match.end && match.start < cued.end)
        )
      : surviving;
    // A city-name suffix can be either part of an official district name or
    // the separately typed selected city. If it overlaps another canonical
    // district match ("شهرک دانشگاه تهران" -> "شهرک دانشگاه" + city Tehran),
    // prefer the city-independent district. Parenthetical catalog qualifiers
    // remain intact and are not treated as a city suffix.
    const canonicalWithoutCitySuffix = pool.filter((match) => match.isName && !match.includesCitySuffix);
    const eligibleMatches = pool.filter((match) => {
      const cityMentionOutsideLabel = citySpans.some((span) =>
        span.end <= match.start || span.start >= match.end
      );
      const duplicateSuffix = match.duplicatesDistrictWithCitySuffix && !cityMentionOutsideLabel;
      const overlapsShorterCanonical = match.includesCitySuffix && canonicalWithoutCitySuffix.some((other) =>
        other.start < match.end && match.start < other.end
      );
      return !duplicateSuffix && !(overlapsShorterCanonical && !cityMentionOutsideLabel);
    });
    const namedMatches = eligibleMatches.filter((match) => match.isName);
    // A mention with no location cue anywhere is review-only evidence: it can
    // narrow candidates but never silently auto-apply a neighborhood.
    const pureBarePool = cuedMatches.length === 0;
    // «زیرمحله + محله والد» (e.g. «سباری نیاوران»): when a sub-area label that
    // exactly one neighborhood in this city manages sits directly before the
    // canonical name, the sub-area is the specific place the user named and the
    // canonical name is geographic context — resolve to the sub-area's
    // neighborhood instead of the context name.
    const areaAnchor =
      !pureBarePool && namedMatches.length
        ? eligibleMatches.find((match) => {
            if (match.isName) return false;
            if (preparedCatalog.areaUsage.get(match.labelKey) !== 1) return false;
            return namedMatches.some(
              (named) => named.start >= match.end && named.start - match.end <= 1
            );
          })
        : undefined;
    if (areaAnchor) {
      return { hit: areaAnchor.neighborhood, candidates: [] };
    }
    // A span matched both as a canonical name and as another neighborhood's
    // area label keeps the canonical row (repo contract: «ونک» resolves to the
    // ونک catalog row, not its role as an area of another neighborhood).
    const eligible = namedMatches.length ? namedMatches : eligibleMatches;
    const longest = Math.max(...eligible.map((match) => match.labelLength));
    const candidates = [
      ...new Map(
        eligible
          .filter((match) => match.labelLength === longest)
          .map((match) => [match.neighborhood.id, match.neighborhood])
      ).values(),
    ];
    // Uncued mentions stay proposals even when the catalog match is unique.
    if (pureBarePool) return { candidates };
    return candidates.length === 1
      ? { hit: candidates[0], candidates: [] }
      : { candidates };
  }

  // Only fall back to a reduced fragment after matching complete catalog
  // labels in context. Fragment extraction intentionally treats words such
  // as «شهر», «محله» and money terms as boundaries, but those can also be part
  // of a legitimate neighborhood name (e.g. «فرهنگ شهر» or «قائم محله»).
  const fragment = extractLocationFragment(sourceText);
  if (!fragment) return { candidates: [] };
  const fragmentMatches = exactMatches(neighborhoods, fragment);
  if (
    fragmentMatches.length === 1 &&
    hasExplicitFragmentLocationEvidence(text, fragment, citySpans)
  ) return { hit: fragmentMatches[0], candidates: [] };
  return fragmentMatches.length > 1 ? { candidates: fragmentMatches } : { candidates: [] };
}
