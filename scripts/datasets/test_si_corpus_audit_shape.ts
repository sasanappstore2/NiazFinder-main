import {
  siAuditTargetFingerprint,
  readSiCorpusAuditShape,
  readSiTypedPrediction,
} from './si-corpus-audit-shape';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const shape = readSiCorpusAuditShape({
  taskType: 'divar-counterfactual-post-need-si-proposal/v3',
  synthetic: true,
  state: 'یک آپارتمان در محله نمونه می‌خواهم.',
  source: {
    dataset: 'divarofficial/real_estate_ads',
    sourceType: 'seller_or_agent_property_offer',
    sourceExampleId: 'source-example',
    normalizedTextGroupSha256: 'group-hash',
  },
  hypotheticalNeed: {
    targetDecisions: {
      category_candidate: { value: 'apartment-rent', source: 'source_offer_category_counterfactual' },
      city: { value: 'mashhad', source: 'verified_app_city_crosswalk' },
      neighborhood: { value: 'district-1-neighborhood-2', source: 'exact_city_scoped_official_crosswalk' },
      area: { value: 135, source: 'listing_area_recast_as_hypothetical_preference' },
      budget: { value: 'unknown', source: 'offer_price_never_transferred_to_seeker_budget' },
    },
    sourceOfferLocation: {
      appCityName: 'مشهد',
      appNeighborhoodName: 'محله نمونه',
    },
  },
  si: { answers: { category_candidate: { choice: 'apartment-rent' } } },
});

assert(shape.text === 'یک آپارتمان در محله نمونه می‌خواهم.', 'audit should read the natural user-facing state, not provenance labels');
assert(shape.category === 'apartment-rent', 'audit should unwrap the counterfactual category target');
assert(shape.city === 'mashhad', 'audit should read the structured city target');
assert(shape.neighborhood === 'district-1-neighborhood-2', 'audit should read the structured neighborhood target');
assert(shape.typedDecisions?.area !== undefined, 'counterfactual typed decisions should be visible to the audit');
assert(shape.hasSourceProvenance, 'source hashes and identifiers should count as row provenance');
assert(
  siAuditTargetFingerprint(shape.label) === siAuditTargetFingerprint({
    ...shape.label,
    area: { value: 135, source: 'different-provenance-metadata', humanReviewed: true },
  }),
  'duplicate-target fingerprint should ignore provenance metadata around values',
);
assert(
  siAuditTargetFingerprint(shape.label) !== siAuditTargetFingerprint({
    ...shape.label,
    area: { value: 140, source: 'listing_area_recast_as_hypothetical_preference' },
  }),
  'duplicate-target fingerprint should detect conflicting field values',
);

const unresolved = readSiCorpusAuditShape({
  state: 'نیاز فرضی بدون شهر مشخص.',
  hypotheticalNeed: {
    targetDecisions: {
      city: { value: 'unknown', source: 'not_mapped' },
      neighborhood: { value: null, source: 'not_exactly_mapped' },
    },
  },
});
assert(!unresolved.city && !unresolved.neighborhood, 'unknown location targets must not inflate coverage');
assert(!unresolved.hasSourceProvenance, 'missing source identity must not imply provenance');
assert(readSiTypedPrediction({ choice: 'buy' }) === 'buy', 'audit should read Si choice answers');
assert(readSiTypedPrediction({ noul: 'buy' }) === 'buy', 'audit should read Si noul answers');
assert(readSiTypedPrediction({ value: 'buy' }) === 'buy', 'audit should read Si value answers');
assert(!readSiTypedPrediction({ score: 0.7 }), 'scores must not be mistaken for categorical predictions');

console.log('Si corpus audit shape: 14 checks passed');
