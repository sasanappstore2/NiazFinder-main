#!/usr/bin/env bun
import { buildDivarHypotheticalNeed } from './divar-hypothetical-need';
import { buildDivarHypotheticalNeedV6 } from './divar-hypothetical-need-v6';
import { baseRow, labelFingerprint, observeTrainingStateGroup, sourceGroup, stateGroup, trainingSplitForState, type TrainingStateGroup } from './build-divar-laya-training-corpus';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const source = {
  taskType: 'divar-property-offer-facts/v2',
  exampleId: 'example-hash',
  synthetic: false,
  isNeedGroundTruth: false,
  state: 'آگهی آپارتمان ۱۳۰ متر دو خواب با پارکینگ برای فروش در تهران',
  split: 'train',
  splitGroup: 'a'.repeat(64),
  source: {
    dataset: 'divarofficial/real_estate_ads',
    datasetSha256: 'dataset-hash',
    rowOrdinal: 4,
    normalizedTextGroupSha256: 'a'.repeat(64),
    sourceType: 'seller_or_agent_property_offer',
  },
  sourceOfferAttributes: {
    version: 1,
    perspective: 'seller_or_agent_supply_offer',
    area: { value: 130, sourceColumn: 'building_size' },
    rooms: { value: 2, sourceColumn: 'rooms_count' },
    amenities: { parking: { value: true, sourceColumn: 'has_parking' } },
  },
  typedDecisions: {
    offer_category: { value: 'apartment-sale' },
    offer_property_kind: { value: 'apartment' },
  },
  offerLocation: { appCitySlug: 'tehran', neighborhoodMatch: 'unresolved' },
};
const hypothetical = buildDivarHypotheticalNeed(source);
assert(hypothetical, 'valid normalized source listing should produce a hypothetical');
const result = baseRow(source, hypothetical, 'b'.repeat(64));
assert(result.synthetic && result.derivedFromSupplyListing, 'derived rows must stay explicitly synthetic');
assert(result.realNeedGroundTruth === false && result.trainingEligible === false, 'no derived row may claim real need ground truth or eligibility');
assert(result.state.includes('تهران') && result.state.includes('آپارتمان') && result.state.includes('۱۳۰ متر'), 'counterfactual text should use only supported source facts');
assert(!result.state.includes('آگهی آپارتمان') && !('laya' in result), 'raw ad text and Laya predictions must not become corpus text or labels');
assert(result.hypotheticalNeed.questionSchemaSha256 === 'b'.repeat(64), 'exact Laya question schema hash must be pinned');
assert(result.hypotheticalNeed.targetDecisions.budget.value === 'unknown', 'seller prices must never transfer to seeker budget');
const explicitRentV6 = buildDivarHypotheticalNeedV6({
  ...source,
  typedDecisions: {
    offer_category: { value: 'apartment-rent' },
    offer_property_kind: { value: 'apartment' },
    offer_transaction_type: { value: 'rent_rahn_full' },
  },
});
assert(explicitRentV6, 'v6 builder should accept the same audited source contract');
const resultV6 = baseRow(source, explicitRentV6, 'c'.repeat(64));
assert(resultV6.schemaVersion === 6 && resultV6.taskType === 'divar-counterfactual-post-need-laya-proposal/v6', 'the corpus wrapper must preserve the explicit v6 task identity');
assert(resultV6.hypotheticalNeed.targetDecisions.transaction_type.value === 'rent_rahn_full', 'the corpus wrapper must preserve v6 transaction labels');
assert(resultV6.hypotheticalNeed.generation.version === 6, 'the corpus wrapper must preserve v6 generation provenance');
assert(sourceGroup(result) === 'a'.repeat(64), 'source grouping must be stable and auditable');
assert(stateGroup({ state: 'آپارتمان ۱۲۳ متر، ونک.' }) === stateGroup({ state: 'آپارتمان 123 متر ونک' }), 'model-input grouping must use the same Persian normalization as the corpus audit');
assert(trainingSplitForState('آپارتمان ۱۲۳ متر، ونک.') === trainingSplitForState('آپارتمان 123 متر ونک'), 'normalized duplicate states must receive one deterministic partition');
assert(['train', 'calibration', 'test'].includes(trainingSplitForState(result.state)), 'every normalized state must map to a supported held-out partition');
const groupedStates = new Map<string, TrainingStateGroup>();
result.state = 'آپارتمان 123 متر ونک';
const equivalentState = structuredClone(result);
equivalentState.state = 'آپارتمان ۱۲۳ متر، ونک.';
observeTrainingStateGroup(groupedStates, result);
observeTrainingStateGroup(groupedStates, equivalentState);
assert(groupedStates.size === 1 && [...groupedStates.values()][0]?.rows === 2, 'equivalent generated texts from separate offers must collapse into one state group');
equivalentState.hypotheticalNeed.targetDecisions.category_candidate.value = 'apartment-rent';
observeTrainingStateGroup(groupedStates, equivalentState);
assert([...groupedStates.values()][0]?.conflicting === true, 'disagreeing targets for one normalized text must quarantine the entire group');
assert(labelFingerprint(result) === labelFingerprint(structuredClone(result)), 'target fingerprint must be deterministic');
const conflicting = structuredClone(result);
conflicting.hypotheticalNeed.targetDecisions.category_candidate.value = 'apartment-rent';
assert(labelFingerprint(result) !== labelFingerprint(conflicting), 'same text with conflicting target values must be quarantinable');

console.log('Divar synthetic Laya training-corpus contract: 14 checks passed');
