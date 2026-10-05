#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import {
  buildDivarSiBatchQuestions,
  buildDivarOfferInspectionQuestions,
} from './divar-si-question-factory';
import { buildSupervisionCandidate } from './prepare-divar-counterfactual-supervision';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rejects(action: () => unknown, message: string): void {
  let rejected = false;
  try {
    action();
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

const model = 'convaiinnovations/si-multilingual';
const questions = buildDivarSiBatchQuestions();
const questionHash = createHash('sha256').update(JSON.stringify(questions)).digest('hex');
const offerQuestionHash = createHash('sha256').update(JSON.stringify(buildDivarOfferInspectionQuestions())).digest('hex');
const target = (value: string, source: string) => ({ value, source, humanReviewed: false });
const row = {
  schemaVersion: 5,
  taskType: 'divar-counterfactual-post-need-si-proposal/v5',
  exampleId: 'offer-1:counterfactual-v5',
  synthetic: true,
  isNeedGroundTruth: false,
  realNeedGroundTruth: false,
  trainingEligible: false,
  shadowOnly: true,
  state: 'برای خرید دنبال یک آپارتمان در تهران هستم.',
  source: {
    dataset: 'divarofficial/real_estate_ads',
    datasetSha256: 'fixture-hash',
    sourceType: 'seller_or_agent_property_offer',
    sourceRowOrdinal: 1,
    sourceExampleId: 'offer-1',
    normalizedTextGroupSha256: 'group-1',
  },
  hypotheticalNeed: {
    taskType: 'divar-counterfactual-post-need-proposal/v5',
    schemaVersion: 5,
    realNeedGroundTruth: false,
    trainingEligible: false,
    originalSplit: 'train',
    exampleId: 'offer-1:counterfactual-v5',
    generation: { method: 'deterministic-counterfactual-template', version: 5 },
    targetDecisions: {
      category_candidate: target('apartment-sale', 'source_offer_category_counterfactual'),
      property_kind: target('apartment', 'source_offer_category_counterfactual'),
      transaction_type: target('buy', 'source_offer_transaction_counterfactual'),
      deed_type: target('unknown', 'not_stated'),
      usage: target('unknown', 'not_inferred_from_offer'),
      parking: target('yes', 'listing_feature_recast_as_hypothetical_preference'),
      elevator: target('unknown', 'not_stated'),
      storage: target('unknown', 'not_stated'),
    },
    questionSchemaSha256: questionHash,
  },
  si: {
    model,
    inputStateKind: 'original_divar_offer_text',
    inputStateSha256: 'a'.repeat(64),
    questionSchemaSha256: offerQuestionHash,
    answers: { transaction_type: { choice: 'sell' } },
  },
};

const candidate = buildSupervisionCandidate(row, questions, questionHash);
assert(candidate.trainingEligible === false, 'synthetic candidate must never become production-eligible');
assert(candidate.realNeedGroundTruth === false && candidate.humanReviewed === false, 'counterfactual and unreviewed provenance must survive');
assert(candidate.auxiliaryResearchCandidate === true, 'candidate must be explicitly scoped to auxiliary research');
assert(candidate.source.targetOrigin === 'deterministic_source_facts_not_si_output', 'targets must identify non-Si provenance');
assert(candidate.decisions.transaction_type.target === 'buy', 'Si prediction must not replace the source-derived target');
assert(candidate.decisions.usage.probabilities.unknown === 1, 'unmentioned usage must remain unknown');
assert(candidate.decisions.parking.probabilities.yes === 1, 'positive stated feature must become a one-hot typed target');
assert(candidate.questionsSchemaSha256 === questionHash, 'candidate must pin the exact question schema');

const unsupported = structuredClone(row);
unsupported.hypotheticalNeed.targetDecisions.category_candidate.value = 'not-a-catalog-category';
rejects(() => buildSupervisionCandidate(unsupported, questions, questionHash), 'unsupported labels must fail closed');

const wrongQuestionHash = structuredClone(row);
wrongQuestionHash.hypotheticalNeed.questionSchemaSha256 = 'stale-schema';
rejects(() => buildSupervisionCandidate(wrongQuestionHash, questions, questionHash), 'stale question schema must fail closed');

console.log('Divar counterfactual supervision adapter: 10 checks passed; Si predictions never used as targets');
