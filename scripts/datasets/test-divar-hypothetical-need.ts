import {
  buildDivarHypotheticalNeed,
  buildSiDerivedHypotheticalNeed,
  divarAppCityCatalog,
  divarAppCityPersianName,
  DIVAR_HYPOTHETICAL_NEED_TASK,
} from './divar-hypothetical-need';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const sourceRow = {
  taskType: 'divar-property-offer-facts/v2',
  exampleId: 'offer-hash',
  synthetic: false,
  isNeedGroundTruth: false,
  state: 'آگهی ویژه ۱۳۰ متر دو خواب با پارکینگ، سند تک برگ، قیمت ۱۰ میلیارد. متن خام محرمانه.',
  split: 'test',
  splitGroup: 'offer-group-hash',
  source: {
    dataset: 'divarofficial/real_estate_ads',
    datasetSha256: 'dataset-sha',
    rowOrdinal: 42,
    normalizedTextGroupSha256: 'offer-group-hash',
    sourceType: 'seller_or_agent_property_offer',
  },
  sourceUse: { kind: 'public_database_license', licenseId: 'ODbL-1.0' },
  privacy: { reviewStatus: 'regex_only_not_comprehensive' },
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    area: { value: 130, sourceColumn: 'building_size' },
    rooms: { value: 2, sourceColumn: 'rooms_count' },
    deedType: { value: 'single_page', sourceColumn: 'deed_type' },
    amenities: { parking: { value: true, sourceColumn: 'has_parking' } },
  },
  typedDecisions: {
    offer_category: { value: 'apartment-sale' },
    offer_property_kind: { value: 'apartment' },
    offer_transaction_type: { value: 'sell' },
  },
  offerLocation: {
    appCitySlug: 'tehran',
    appNeighborhoodId: 'ونک',
    appNeighborhoodName: 'ونک',
    neighborhoodMatch: 'exact_official_crosswalk',
  },
};

const proposal = buildDivarHypotheticalNeed(sourceRow);
assert(proposal !== null, 'verified offer fact row should produce a proposal');
assert(proposal.taskType === DIVAR_HYPOTHETICAL_NEED_TASK, 'proposal task must be explicitly versioned');
assert(proposal.schemaVersion === 5 && proposal.generation.version === 5, 'template and target semantics must have a versioned schema/generation');
assert(proposal.exampleId === 'offer-hash:counterfactual-v5', 'derived identifier must use the source row exampleId');
assert(proposal.synthetic && !proposal.realNeedGroundTruth && !proposal.trainingEligible, 'proposal must never claim real-need or training eligibility');
assert(proposal.state.includes('آپارتمان') && proposal.state.includes('تهران') && proposal.state.includes('ونک'), 'proposal should use canonical category and exact mapped location');
assert(proposal.state.includes('۱۳۰ متر') && proposal.state.includes('۲ خواب') && proposal.state.includes('پارکینگ'), 'only extracted property facts should appear as counterfactual preferences');
assert(!proposal.state.includes('به‌صورت فرضی') && !proposal.state.includes('۱۰ میلیارد') && !proposal.state.includes('متن خام محرمانه'), 'disclaimer, seller price, and original ad prose must not leak into generated text');
assert(proposal.generation.disclaimer.includes('فرضی/پیشنهادی'), 'counterfactual status must remain explicit in metadata');
assert(proposal.targetDecisions.budget.value === 'unknown', 'seller price must never become seeker budget');
assert(proposal.targetDecisions.transaction_type.value === 'buy', 'seller-side sell must become seeker-side buy for a sale category');
assert(proposal.targetDecisions.area.source === 'structured_listing_area_recast_as_hypothetical_preference', 'structured source area must be visibly recast as hypothetical');
assert(proposal.targetDecisions.rooms.source === 'structured_listing_rooms_recast_as_hypothetical_preference', 'structured room count must be visibly recast as hypothetical');
assert(proposal.targetDecisions.parking.source === 'structured_listing_feature_recast_as_hypothetical_preference', 'transformed feature needs field-level provenance');
assert(proposal.sourceOfferLocation.appNeighborhoodId === 'ونک', 'exact city-scoped neighborhood id should be retained');
const templateStates = new Set(Array.from({ length: 16 }, (_, index) => {
  const varied = buildDivarHypotheticalNeed({
    ...sourceRow,
    source: { ...sourceRow.source, normalizedTextGroupSha256: `offer-group-${index}` },
  });
  return varied?.state;
}));
assert(templateStates.size >= 3, 'stable hash selection should create multiple natural sentence shapes');
const stableAgain = buildDivarHypotheticalNeed(sourceRow);
assert(stableAgain?.state === proposal.state, 'the same source row must always receive the same natural template');
const conflictProposal = buildDivarHypotheticalNeed({
  ...sourceRow,
  state: 'آگهی آپارتمان ۱۳۰ متر دو خواب با پارکینگ و سند تک‌برگ در تهران',
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    area: { value: 150, sourceColumn: 'building_size' },
    rooms: { value: 3, sourceColumn: 'rooms_count' },
    deedType: { value: 'written_agreement', sourceColumn: 'deed_type' },
    amenities: { parking: { value: false, sourceColumn: 'has_parking' } },
  },
});
assert(conflictProposal !== null, 'a conflicting source row should remain auditable as a proposal');
assert(conflictProposal.targetDecisions.area.value === 'unknown', 'conflicting structured and textual area must be suppressed');
assert(conflictProposal.targetDecisions.rooms.value === 'unknown', 'conflicting structured and textual rooms must be suppressed');
assert(conflictProposal.targetDecisions.deed_type.value === 'unknown', 'conflicting deed evidence must be suppressed');
assert(conflictProposal.targetDecisions.parking.value === 'unknown', 'conflicting negative structured and positive text amenity must not become a preference');
assert(conflictProposal.sourceOfferConflicts.map((entry) => entry.field).sort().join(',') === 'deedType,parking,rooms,area'.split(',').sort().join(','), 'all conflicts must be recorded with field-level provenance');
assert(!/۱۳۰|۱۵۰|دو خواب|پارکینگ|تک.?برگ/u.test(conflictProposal.state), 'conflicting property facts must not leak into the hypothetical request text');
const zeroRoomProposal = buildDivarHypotheticalNeed({
  ...sourceRow,
  state: 'آگهی آپارتمان نوساز برای فروش در تهران',
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    rooms: { value: 0, sourceColumn: 'rooms_count' },
  },
});
assert(zeroRoomProposal !== null, 'zero-room offer should remain auditable');
assert(zeroRoomProposal.targetDecisions.rooms.value === 'unknown', 'zero-room offers must not invent a numeric seeker room preference unsupported by the form');
assert(!/بدون اتاق خواب/u.test(zeroRoomProposal.state), 'unrepresentable zero-room facts must not appear in the synthetic seeker wording');
const rentalProposal = buildDivarHypotheticalNeed({
  ...sourceRow,
  typedDecisions: {
    offer_category: { value: 'apartment-rent' },
    offer_property_kind: { value: 'apartment' },
    offer_transaction_type: { value: 'rent_rahn_full' },
  },
});
assert(rentalProposal?.targetDecisions.transaction_type.value === 'rent_monthly', 'specific seller rent terms must not become an unstated seeker preference');
assert(rentalProposal?.state.includes('اجارهٔ ماهانه'), 'rental request text must state the monthly intent represented by its target');
assert(divarAppCityPersianName('shahedshahr') === 'شاهدشهر', 'city names outside the major-city registry should resolve from the exact app catalog');
assert(divarAppCityPersianName('unknown-city-slug') === undefined, 'unknown city slugs must not be guessed');
assert(divarAppCityCatalog('tehran')?.cityId === 'tehran-city', 'normalized city slugs should resolve catalog ids with their canonical -city suffix');

const shopOffer = {
  ...sourceRow,
  exampleId: 'shop-offer',
  state: 'مغازه ۷۵ متری برای اجاره در محدوده فرامرزعباسی مشهد',
  source: { ...sourceRow.source, normalizedTextGroupSha256: 'shop-offer-group' },
  typedDecisions: {
    offer_category: { value: 'shop-rent' },
    offer_property_kind: { value: 'shop' },
    offer_transaction_type: { value: 'rent_rahn_ejare' },
  },
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    area: { value: 75, sourceColumn: 'building_size' },
    rooms: { value: 2, sourceColumn: 'rooms_count' },
  },
  offerLocation: {
    appCitySlug: 'mashhad',
    appNeighborhoodId: 'mashhad-faramarz-abbasi',
    appNeighborhoodName: 'فرامرزعباسی',
    neighborhoodMatch: 'exact_official_crosswalk',
  },
};
const deterministicShopProposal = buildDivarHypotheticalNeed(shopOffer);
assert(deterministicShopProposal !== null, 'a mapped shop offer should produce a deterministic reference');
const siShopProposal = buildSiDerivedHypotheticalNeed(shopOffer, deterministicShopProposal, {
  category_candidate: { choice: 'shop-rent', answer_confidence: 0.73 },
  property_kind: { choice: 'shop' },
  transaction_type: { choice: 'rent_rahn_ejare' },
});
assert(siShopProposal.state?.includes('مغازه') && siShopProposal.state.includes('فرامرزعباسی'), 'compatible Si decisions should render separately using exact mapped place facts');
assert(siShopProposal.state?.includes('۷۵ متر') && siShopProposal.state.includes('رهن و اجاره'), 'deterministic numeric facts and Si transaction decision should be combined in the generated proposal');
assert(siShopProposal.decisions.category_candidate.confidence === 0.73, 'valid model confidence metadata should be retained without thresholding');
assert(siShopProposal.decisions.category_candidate.accepted === false && siShopProposal.accepted === false, 'Si suggestions must remain unaccepted');
assert(siShopProposal.synthetic && !siShopProposal.realNeedGroundTruth && !siShopProposal.trainingEligible, 'Si-derived output must remain synthetic and training-ineligible');
assert(siShopProposal.conversionStatus === 'rendered_from_compatible_si_choices', 'compatible decisions must report a rendered conversion status');

const wrongTransaction = buildSiDerivedHypotheticalNeed(sourceRow, proposal, {
  category_candidate: { choice: 'apartment-sale' },
  property_kind: { choice: 'apartment' },
  transaction_type: { choice: 'sell' },
});
assert(wrongTransaction.state === null && wrongTransaction.conversionStatus === 'source_transaction_disagreement', 'seller-side sell must not be rewritten into a seeker request');
const wrongCategory = buildSiDerivedHypotheticalNeed(shopOffer, deterministicShopProposal!, {
  category_candidate: { choice: 'apartment-sale' },
  property_kind: { choice: 'apartment' },
  transaction_type: { choice: 'buy' },
});
assert(wrongCategory.state === null && wrongCategory.conversionStatus === 'source_category_disagreement', 'a Si category conflicting with the structured offer must not produce text');
const wrongPropertyKind = buildSiDerivedHypotheticalNeed(shopOffer, deterministicShopProposal!, {
  category_candidate: { choice: 'shop-rent' },
  property_kind: { choice: 'apartment' },
  transaction_type: { choice: 'rent_rahn_ejare' },
});
assert(wrongPropertyKind.state === null && wrongPropertyKind.conversionStatus === 'source_property_kind_disagreement', 'contradictory category and property kind must not produce request text');
const unsupportedAnswer = buildSiDerivedHypotheticalNeed(shopOffer, deterministicShopProposal!, {
  category_candidate: { choice: 'not-a-real-category' },
  property_kind: { choice: 'unknown' },
  transaction_type: { choice: 'rent_rahn_ejare' },
});
assert(unsupportedAnswer.state === null && unsupportedAnswer.decisions.category_candidate.value === 'unknown', 'unsupported Si choices must fail closed');
const invalidConfidence = buildSiDerivedHypotheticalNeed(shopOffer, deterministicShopProposal!, {
  category_candidate: { choice: 'shop-rent', answer_confidence: 1.4 },
  property_kind: { choice: 'shop' },
  transaction_type: { choice: 'rent_rahn_ejare' },
});
assert(invalidConfidence.decisions.category_candidate.confidence === undefined, 'invalid confidence metadata must not be propagated');

const unmapped = buildDivarHypotheticalNeed({
  ...sourceRow,
  offerLocation: { appCitySlug: 'tehran', appNeighborhoodId: 'fake', appNeighborhoodName: 'جعلی', neighborhoodMatch: 'fuzzy' },
});
assert(unmapped !== null, 'unmapped neighborhood should not block a proposal');
assert(!unmapped.state.includes('جعلی') && unmapped.targetDecisions.neighborhood.value === 'unknown', 'unverified neighborhood must stay unknown');

assert(buildDivarHypotheticalNeed({ ...sourceRow, synthetic: true }) === null, 'already synthetic source rows must fail closed');
assert(buildDivarHypotheticalNeed({ ...sourceRow, isNeedGroundTruth: true }) === null, 'contradictory source semantics must fail closed');
assert(buildDivarHypotheticalNeed({ ...sourceRow, taskType: 'other-task' }) === null, 'other task types must fail closed');

console.log('Divar hypothetical need transformation: deterministic and Si-derived proposal checks passed');
