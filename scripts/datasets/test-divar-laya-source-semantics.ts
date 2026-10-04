import { extractPostNaturalFields } from '@/lib/need-intake/laya/post-natural-extractor';
import { buildDivarLayaBatchQuestions } from './divar-laya-question-factory';
import { canResumeWithBatchSize, prepareDivarOfferAnalysis } from './run-divar-laya-shadow';
import { createHash } from 'node:crypto';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const row = {
  taskType: 'divar-property-offer-facts/v2',
  exampleId: 'offer-source-semantics',
  synthetic: false,
  isNeedGroundTruth: false,
  state: 'آپارتمان فروشی ۱۳۰ متر دو خواب با پارکینگ، سند تک‌برگ، در محدوده ونک. متن آگهی اصلی.',
  split: 'test',
  splitGroup: 'source-group-1',
  source: {
    dataset: 'divarofficial/real_estate_ads',
    datasetSha256: 'source-hash',
    rowOrdinal: 7,
    normalizedTextGroupSha256: 'source-group-1',
    sourceType: 'seller_or_agent_property_offer',
  },
  typedDecisions: {
    offer_category: { value: 'apartment-sale' },
    offer_property_kind: { value: 'apartment' },
    offer_transaction_type: { value: 'sell' },
  },
  offerLocation: { appCitySlug: 'tehran', neighborhoodMatch: 'unresolved_or_not_stated' },
};

const analysis = prepareDivarOfferAnalysis(row, true);
assert(analysis !== null, 'a valid Divar offer must produce an analysis item');
assert(analysis.sourceText === row.state, 'Laya input must be the original source offer text');
assert(analysis.proposalText === analysis.hypotheticalNeed?.state, 'the generated hypothetical request must stay separate');
assert(analysis.sourceText !== analysis.proposalText, 'the offer and hypothetical need must never share one ambiguous state');
assert(!analysis.proposalText.includes('متن آگهی اصلی'), 'source prose must not leak into the generated need');
assert(analysis.questions.category_candidate?.type === 'choice' && analysis.questions.category_candidate.instructions.includes('آگهی'), 'Laya must receive offer-side category criteria');
assert(analysis.deterministic.normalizedText === extractPostNaturalFields(analysis.proposalText).normalizedText, 'parser evaluation must run on the generated need text');
assert(analysis.sourceDeterministic.normalizedText === extractPostNaturalFields(row.state).normalizedText, 'Laya request metadata must normalize the original offer text');
assert(analysis.proposalQuestionSchemaSha256 === createHash('sha256').update(JSON.stringify(buildDivarLayaBatchQuestions())).digest('hex'), 'training question schema must remain separately pinned to the generated need task');
assert(canResumeWithBatchSize(32, 8), 'a failed run may resume with a smaller batch');
assert(canResumeWithBatchSize(8, 8), 'a failed run may resume with the same batch');
assert(!canResumeWithBatchSize(8, 32), 'a resume must not increase the batch size');
assert(!canResumeWithBatchSize(0, 1), 'invalid prior batch metadata must be rejected');

console.log('Divar Laya input semantics: 13 checks passed; source separation and safe batch-resume invariants hold');
