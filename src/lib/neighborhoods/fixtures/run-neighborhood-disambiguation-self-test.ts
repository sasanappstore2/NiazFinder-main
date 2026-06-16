import { getNeighborhoodCatalogForCity, rankNeighborhoodCandidates } from '@/lib/need-intake/neighborhood-catalog.server';
import { enrichParsedIntent } from '@/lib/need-intake/enrich-parsed-intent';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import { formatAmbiguousNeighborhoodChipLabel } from '@/lib/neighborhoods/format-disambiguation-label';

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

const enriched = enrichParsedIntent(parseIntentFromText(text), {
  preferredCityId: 'mashhad',
  preferredCityName: MASHHAD,
  locationText: text,
});
assert(
  enriched.locationResolutionStatus === 'neighborhood_ambiguous',
  `LRE status: ${enriched.locationResolutionStatus}`
);
assert(enriched.entities?.area === BAN, `LRE area: ${enriched.entities?.area}`);

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

console.log('neighborhood-disambiguation self-test OK');
