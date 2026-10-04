import {
  classifyCorpusTaskRow,
  manifestSourceUseEligible,
  manifestTargetsPostNeedIntent,
  POST_REAL_ESTATE_NEED_TASK,
  rowSourceUseEvidence,
} from './laya-corpus-eligibility';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const accepted = classifyCorpusTaskRow({
  taskType: POST_REAL_ESTATE_NEED_TASK,
  synthetic: false,
  source: { sourceType: 'first_party_user_need' },
});
assert(accepted.eligibleForPostNeedIntent, 'explicit real need row should pass the semantic gate');

assert(
  !classifyCorpusTaskRow({ taskType: POST_REAL_ESTATE_NEED_TASK, source: { sourceType: 'first_party_user_need' } })
    .eligibleForPostNeedIntent,
  'missing synthetic status must fail closed',
);
assert(
  !classifyCorpusTaskRow({ taskType: POST_REAL_ESTATE_NEED_TASK, synthetic: true })
    .eligibleForPostNeedIntent,
  'synthetic row must fail the real-need task gate',
);
assert(
  !classifyCorpusTaskRow({ taskType: 'property-listing-facts/v1', synthetic: false })
    .eligibleForPostNeedIntent,
  'auxiliary task must not qualify as post need-intent data',
);
assert(
  !classifyCorpusTaskRow({
    taskType: POST_REAL_ESTATE_NEED_TASK,
    synthetic: false,
    source: { sourceType: 'seller_or_agent_property_offer' },
  }).eligibleForPostNeedIntent,
  'supply-side property listing must not qualify as a genuine need',
);
assert(
  !classifyCorpusTaskRow({
    taskType: 'divar-property-offer-classification/v1',
    synthetic: true,
    source: { sourceType: 'seller_or_agent_property_offer' },
  }).eligibleForPostNeedIntent,
  'Divar offer proxy task must remain separate from need-intent training',
);
const generatedHypothesis = classifyCorpusTaskRow({
  taskType: 'divar-counterfactual-post-need-laya-proposal/v3',
  synthetic: true,
  derivedFromSupplyListing: true,
  isNeedGroundTruth: false,
  realNeedGroundTruth: false,
  trainingEligible: false,
  source: { sourceType: 'seller_or_agent_property_offer' },
});
assert(!generatedHypothesis.eligibleForPostNeedIntent, 'Divar-derived proposals must never pass as real-need labels');
assert(generatedHypothesis.isSupplyListing, 'the generated proposal must retain its supply-side provenance');
assert(
  manifestTargetsPostNeedIntent({
    targetTask: POST_REAL_ESTATE_NEED_TASK,
    containsSyntheticData: false,
  }),
  'correct versioned target manifest should pass',
);
assert(
  !manifestTargetsPostNeedIntent({ targetTask: 'property-listing-facts/v1', containsSyntheticData: false }),
  'manifest with another task must fail',
);
assert(
  rowSourceUseEvidence({
    consent: {
      modelTraining: true,
      scope: 'model-training',
      policyVersion: 'v1',
      consentRecordHash: 'record-hash',
    },
  }) === 'first-party-consented',
  'first-party row with versioned consent evidence should qualify its source-use path',
);
assert(
  rowSourceUseEvidence({ consent: { modelTraining: true, scope: 'model-training', policyVersion: 'v1' } }) === null,
  'first-party consent without a durable record hash must fail',
);
assert(
  rowSourceUseEvidence({
    provenance: { kind: 'license-cleared', licenseId: 'ODbL-1.0', licenseEvidenceRef: 'license-card' },
  }) === 'license-cleared',
  'licensed row with source license evidence should qualify its source-use path',
);
assert(
  rowSourceUseEvidence({ provenance: { kind: 'license-cleared', licenseId: 'ODbL-1.0' } }) === null,
  'licensed row without license evidence must fail',
);
assert(
  manifestSourceUseEligible({
    dataProvenance: {
      verified: true,
      kind: 'first-party-consented',
      evidenceRef: 'policy-evidence',
    },
    consent: { explicitModelTraining: true, scope: 'model-training', policyVersion: 'v1' },
  }),
  'first-party manifest with versioned consent should qualify',
);
assert(
  !manifestSourceUseEligible({
    dataProvenance: {
      verified: true,
      kind: 'first-party-consented',
      evidenceRef: 'policy-evidence',
    },
    consent: { explicitModelTraining: true, scope: 'model-training' },
  }),
  'first-party manifest without policy version must fail',
);
assert(
  manifestSourceUseEligible({
    dataProvenance: {
      verified: true,
      kind: 'license-cleared',
      evidenceRef: 'dataset-source',
      licenseId: 'ODbL-1.0',
      licenseEvidenceRef: 'official-license',
      attribution: 'required attribution text',
      shareAlikePlan: 'local model artifact disposition reviewed',
      contentRightsReviewEvidenceRef: 'content-rights-review',
      downstreamUseReviewEvidenceRef: 'deployment-review',
    },
  }),
  'licensed data may qualify without individual user consent when all clearance evidence exists',
);
assert(
  !manifestSourceUseEligible({
    dataProvenance: {
      verified: true,
      kind: 'license-cleared',
      evidenceRef: 'dataset-source',
      licenseId: 'ODbL-1.0',
      licenseEvidenceRef: 'official-license',
      attribution: 'required attribution text',
      shareAlikePlan: 'local model artifact disposition reviewed',
      contentRightsReviewEvidenceRef: 'content-rights-review',
    },
  }),
  'license without downstream-use review must fail',
);

console.log('Laya corpus semantic eligibility: 18 checks passed');
