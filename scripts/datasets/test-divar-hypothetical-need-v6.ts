import {
  buildDivarHypotheticalNeedV6,
  DIVAR_HYPOTHETICAL_NEED_V6_TASK,
} from './divar-hypothetical-need-v6';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const source = {
  taskType: 'divar-property-offer-facts/v2',
  exampleId: 'source-hash',
  synthetic: false,
  isNeedGroundTruth: false,
  state: 'آگهی مغازه برای اجاره در مشهد، فرامرزعباسی',
  split: 'train',
  splitGroup: 'a'.repeat(64),
  source: {
    dataset: 'divarofficial/real_estate_ads',
    datasetSha256: 'dataset-hash',
    rowOrdinal: 12,
    normalizedTextGroupSha256: 'a'.repeat(64),
    sourceType: 'seller_or_agent_property_offer',
  },
  typedDecisions: {
    offer_category: { value: 'shop-rent' },
    offer_property_kind: { value: 'shop' },
    offer_transaction_type: { value: 'rent_rahn_ejare' },
  },
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    area: { value: 75, sourceColumn: 'building_size' },
    rent: { value: 200_000_000, sourceColumn: 'rent_value' },
    credit: { value: 1_000_000_000, sourceColumn: 'credit_value' },
  },
  offerLocation: {
    appCitySlug: 'mashhad',
    appNeighborhoodId: 'mashhad-faramarz-abbasi',
    appNeighborhoodName: 'فرامرزعباسی',
    neighborhoodMatch: 'exact_official_crosswalk',
  },
};

const combinedRent = buildDivarHypotheticalNeedV6(source);
assert(combinedRent, 'valid exact rental facts should produce a v6 proposal');
assert(combinedRent.taskType === DIVAR_HYPOTHETICAL_NEED_V6_TASK && combinedRent.schemaVersion === 6, 'v6 must have a distinct task and schema identity');
assert(combinedRent.exampleId === 'source-hash:counterfactual-v6', 'v6 ids must not collide with predecessor examples');
assert(combinedRent.targetDecisions.transaction_type.value === 'rent_rahn_ejare', 'explicit combined deposit/rent mode must be preserved');
assert(combinedRent.state.includes('رهن و اجاره'), 'generated counterfactual wording must agree with the transaction target');
assert(combinedRent.targetDecisions.transaction_type.source === 'explicit_structured_offer_rent_mode_recast_as_hypothetical_need', 'transaction provenance must identify the source-side counterfactual');
assert(!combinedRent.state.includes('۱٬۰۰۰٬۰۰۰٬۰۰۰') && !combinedRent.state.includes('۲۰۰٬۰۰۰٬۰۰۰'), 'listing deposit and rent amounts must not become seeker constraints');
assert(combinedRent.synthetic && !combinedRent.realNeedGroundTruth && !combinedRent.trainingEligible, 'v6 must remain synthetic and training-ineligible');

for (const [sourceMode, expected] of [
  ['rent_monthly', 'rent_monthly'],
  ['rent_rahn_full', 'rent_rahn_full'],
  ['rent_rahn_ejare', 'rent_rahn_ejare'],
] as const) {
  const result = buildDivarHypotheticalNeedV6({
    ...source,
    typedDecisions: {
      ...source.typedDecisions,
      offer_transaction_type: { value: sourceMode },
    },
  });
  assert(result?.targetDecisions.transaction_type.value === expected, `${sourceMode} must remain a distinct need-side proposal`);
}

const unknownMode = buildDivarHypotheticalNeedV6({
  ...source,
  typedDecisions: {
    ...source.typedDecisions,
    offer_transaction_type: { value: 'unknown' },
  },
});
assert(unknownMode?.targetDecisions.transaction_type.value === 'unknown', 'missing source rent mode must not be guessed as monthly');
assert(unknownMode.state.includes('اجاره') && !unknownMode.state.includes('اجارهٔ ماهانه'), 'unknown long-term rental text must not overstate transaction detail');

const incompatibleMode = buildDivarHypotheticalNeedV6({
  ...source,
  typedDecisions: {
    ...source.typedDecisions,
    offer_transaction_type: { value: 'buy' },
  },
});
assert(incompatibleMode?.targetDecisions.transaction_type.value === 'unknown', 'incompatible structured modes must fail closed');

const sale = buildDivarHypotheticalNeedV6({
  ...source,
  typedDecisions: {
    offer_category: { value: 'apartment-sale' },
    offer_property_kind: { value: 'apartment' },
    offer_transaction_type: { value: 'buy' },
  },
});
assert(sale?.targetDecisions.transaction_type.value === 'buy', 'non-rental transaction semantics must remain compatible with v5');

console.log('Divar hypothetical need v6: explicit rent-mode and unknown-safe checks passed');
