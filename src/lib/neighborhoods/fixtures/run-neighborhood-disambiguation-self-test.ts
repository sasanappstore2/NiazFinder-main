import { getNeighborhoodCatalogForCity, rankNeighborhoodCandidates } from '@/lib/need-intake/neighborhood-catalog.server';
import { applyLocationResolutionToParsed } from '@/lib/need-intake/location-resolution-engine';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import { formatAmbiguousNeighborhoodChipLabel } from '@/lib/neighborhoods/format-disambiguation-label';
import { resolvePostNeighborhoodInCity } from '@/lib/need-intake/laya/post-neighborhood-resolver';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const BAN = '\u0628\u0646\u0641\u0634\u0647';
const MASHHAD = '\u0645\u0634\u0647\u062F';
const EGHBAL = '\u0627\u0642\u0628\u0627\u0644';
const text = `\u0645\u0646 \u06CC\u06A9 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u06F1\u06F5\u06F6 \u0645\u062A\u0631\u06CC \u062F\u0631 ${BAN} \u0645\u06CC\u062E\u0648\u0627\u0645`;

assert(extractLocationFragment(text) === BAN, 'fragment from \u062F\u0631 \u0628\u0646\u0641\u0634\u0647');

const rank = rankNeighborhoodCandidates(MASHHAD, BAN, text, 8);
assert(rank.ambiguous === true, 'rank: shared sub-area is ambiguous');
assert(rank.candidates.length === 5, `rank: expected 5 matches, got ${rank.candidates.length}`);

const enriched = applyLocationResolutionToParsed(parseIntentFromText(text), {
  preferredCityId: 'mashhad',
  preferredCityName: MASHHAD,
  locationText: text,
});
assert(
  enriched.locationResolutionStatus === 'neighborhood_ambiguous',
  `LRE status: ${enriched.locationResolutionStatus}`
);
assert(enriched.entities?.neighborhood === BAN, `LRE neighborhood: ${enriched.entities?.neighborhood}`);
assert(enriched.entities?.area !== BAN, 'neighborhood fragment must not be stored as property area');

const catalog = getNeighborhoodCatalogForCity(MASHHAD);
const neighborhoods = catalog.map((n, i) => ({
  id: n.slug,
  name: n.name,
  areas: n.areas,
  isActive: true,
  order: i,
}));

const hits = findManagedNeighborhoodAmbiguity(neighborhoods, BAN, text);
assert(hits.length === 5, `ambiguity hits: ${hits.length}`);
for (const h of hits) {
  assert(h.matchedLabel === BAN, `matchedLabel: ${h.matchedLabel}`);
  const chip = formatAmbiguousNeighborhoodChipLabel(h.neighborhood.name);
  assert(chip === h.neighborhood.name, `chip should be hood name only: ${chip}`);
}

const eghbalHits = findManagedNeighborhoodAmbiguity(neighborhoods, EGHBAL, text);
for (const h of eghbalHits) {
  assert(h.matchedLabel === EGHBAL, 'eghbal phrase should not match \u0628\u0646\u0641\u0634\u0647 via raw text');
}

const JALAL = '\u062C\u0644\u0627\u0644 \u0622\u0644 \u0627\u062D\u0645\u062F';
const jalalHits = findManagedNeighborhoodAmbiguity(neighborhoods, JALAL, text);
assert(jalalHits.length <= 2, `jalal hits: ${jalalHits.length}`);
assert(jalalHits.length >= 1, 'jalal should resolve to at least one hood');
for (const h of jalalHits) {
  assert(
    h.matchedLabel === JALAL || h.neighborhood.name.includes('\u0633\u06CC\u062F \u0631\u0636\u06CC'),
    `jalal hit: ${h.matchedLabel} / ${h.neighborhood.name}`
  );
}

const SAJAD = '\u0633\u062C\u0627\u062F';
const SAJAD_SHAHR = '\u0633\u062C\u0627\u062F \u0634\u0647\u0631';
const sajadHits = findManagedNeighborhoodAmbiguity(neighborhoods, SAJAD, '');
assert(sajadHits.length >= 3, `sajad hits: ${sajadHits.length}`);
assert(
  sajadHits.some((h) => h.neighborhood.name === SAJAD_SHAHR),
  'sajad should include \u0633\u062C\u0627\u062F \u0634\u0647\u0631'
);
assert(sajadHits[0]!.neighborhood.name === SAJAD_SHAHR, `sajad top: ${sajadHits[0]!.neighborhood.name}`);

console.log('neighborhood-disambiguation self-test OK');

const FERDOWSI = '\u0641\u0631\u062F\u0648\u0633\u06CC';
const BOULEVARD_FERDOWSI = `\u0628\u0644\u0648\u0627\u0631 ${FERDOWSI}`;
const SAFAIIYE = '\u0635\u0641\u0627\u0626\u06CC\u0647 (\u0641\u0631\u062F\u0648\u0633\u06CC\u0647)';
const BEHRAMAN = '\u0628\u0647\u0631\u0645\u0627\u0646';
const TOOS_FERDOWSI = '\u062A\u0648\u0633 \u0641\u0631\u062F\u0648\u0633\u06CC';
const UNI_FERDOWSI = '\u062F\u0627\u0646\u0634\u06AF\u0627\u0647 \u0641\u0631\u062F\u0648\u0633\u06CC';

assert(
  extractLocationFragment(BOULEVARD_FERDOWSI) === FERDOWSI,
  `boulevard fragment: ${extractLocationFragment(BOULEVARD_FERDOWSI)}`
);

const ferdowsiAmbiguity = findManagedNeighborhoodAmbiguity(neighborhoods, FERDOWSI, '');
assert(ferdowsiAmbiguity.length >= 2, `ferdowsi similar hits: ${ferdowsiAmbiguity.length}`);
assert(
  ferdowsiAmbiguity.some((h) => h.neighborhood.name === FERDOWSI),
  'ferdowsi exact hood must be among suggestions'
);
assert(
  ferdowsiAmbiguity.some((h) => h.neighborhood.name === TOOS_FERDOWSI),
  'توس فردوسی must be among suggestions'
);
assert(
  ferdowsiAmbiguity[0]!.neighborhood.name === FERDOWSI,
  `ferdowsi top suggestion: ${ferdowsiAmbiguity[0]!.neighborhood.name}`
);

const ferdowsiRank = rankNeighborhoodCandidates(MASHHAD, FERDOWSI, `\u062F\u0631 ${FERDOWSI}`, 8);
assert(ferdowsiRank.ambiguous === true, 'ferdowsi rank should be ambiguous among similar names');
assert(
  ferdowsiRank.candidates.some((c) => c.name === FERDOWSI),
  'ferdowsi rank includes exact name'
);
assert(
  ferdowsiRank.candidates.some((c) => c.name === TOOS_FERDOWSI || c.name === UNI_FERDOWSI),
  'ferdowsi rank includes compound similar names'
);

const ferdowsiScoped = applyLocationResolutionToParsed(parseIntentFromText(BOULEVARD_FERDOWSI), {
  preferredCityId: 'mashhad',
  preferredCityName: MASHHAD,
  locationText: BOULEVARD_FERDOWSI,
});
assert(ferdowsiScoped.city === MASHHAD, `ferdowsi scoped city: ${ferdowsiScoped.city}`);
assert(
  ferdowsiScoped.locationResolutionStatus === 'neighborhood_ambiguous' ||
    ferdowsiScoped.neighborhoodSlug ||
    (ferdowsiScoped.neighborhoodCandidates?.length ?? 0) >= 1,
  'ferdowsi scoped should resolve or offer candidates'
);
if (ferdowsiScoped.neighborhoodSlug) {
  const hoodName =
    catalog.find((n) => n.slug === ferdowsiScoped.neighborhoodSlug)?.name ?? '';
  assert(
    hoodName.includes('\u0641\u0631\u062F\u0648\u0633\u06CC') || hoodName === SAFAIIYE,
    `ferdowsi hood: ${hoodName}`
  );
}
if ((ferdowsiScoped.neighborhoodCandidates?.length ?? 0) >= 2) {
  assert(
    ferdowsiScoped.neighborhoodCandidates!.some((c) => c.label === FERDOWSI || c.slug === FERDOWSI),
    'ambiguous candidates should include exact فردوسی'
  );
}

const ferdowsiGlobal = applyLocationResolutionToParsed(parseIntentFromText(BOULEVARD_FERDOWSI), {
  locationText: BOULEVARD_FERDOWSI,
});
assert(
  ferdowsiGlobal.city === MASHHAD || ferdowsiGlobal.cityCandidates?.some((c) => c.label === MASHHAD),
  `ferdowsi global city: ${ferdowsiGlobal.city}`
);

const behramanScopedText = `\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631 ${BEHRAMAN} \u0645\u06CC\u062E\u0648\u0627\u0645`;
const behramanScoped = applyLocationResolutionToParsed(parseIntentFromText(behramanScopedText), {
  preferredCityId: 'mashhad',
  preferredCityName: MASHHAD,
  locationText: behramanScopedText,
});
assert(behramanScoped.city === MASHHAD, `behraman scoped city: ${behramanScoped.city}`);
assert(behramanScoped.city !== BEHRAMAN, 'behraman scoped must not pick behraman city');

const ferdowsiHits = findManagedNeighborhoodAmbiguity(neighborhoods, BOULEVARD_FERDOWSI, '');
assert(ferdowsiHits.length >= 1, `ferdowsi ambiguity hits: ${ferdowsiHits.length}`);

const TEHRAN = '\u062A\u0647\u0631\u0627\u0646';
const VANAK = '\u0648\u0646\u06A9';
const tehranCatalog = getNeighborhoodCatalogForCity(TEHRAN);
const tehranNeighborhoods = tehranCatalog.map((n, i) => ({
  id: n.slug,
  name: n.name,
  areas: n.areas,
  isActive: true,
  order: i,
}));
const vanakAmbiguity = findManagedNeighborhoodAmbiguity(tehranNeighborhoods, VANAK, '');
assert(vanakAmbiguity.length >= 2, `Vanak alias ambiguity: ${vanakAmbiguity.length}`);
const vanakResolution = resolvePostNeighborhoodInCity(
  tehranNeighborhoods,
  VANAK,
  TEHRAN,
  `\u062F\u0631 ${VANAK}`
);
assert(vanakResolution.hit?.name === VANAK, `exact Vanak neighborhood: ${vanakResolution.hit?.name}`);
assert(vanakResolution.candidates.length === 0, 'exact city-catalog match must beat alias candidates');

console.log('neighborhood-disambiguation ferdowsi/behraman scenarios OK');
