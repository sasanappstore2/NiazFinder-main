import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const targetDecisions = Object.fromEntries([
  ['category_candidate', 'apartment-sale'],
  ['property_kind', 'apartment'],
  ['transaction_type', 'buy'],
  ['usage', 'unknown'],
  ['city', 'unknown'],
  ['neighborhood', 'unknown'],
  ['area', 'unknown'],
  ['rooms', 'unknown'],
  ['deed_type', 'unknown'],
  ['parking', 'unknown'],
  ['elevator', 'unknown'],
  ['storage', 'unknown'],
  ['budget', 'unknown'],
  ['monthly_rent', 'unknown'],
  ['deposit', 'unknown'],
].map(([key, value]) => [key, { value, source: 'fixture', humanReviewed: false }]));

const row = {
  schemaVersion: 5,
  taskType: 'divar-counterfactual-post-need-laya-proposal/v5',
  synthetic: true,
  realNeedGroundTruth: false,
  trainingEligible: false,
  state: 'متن فرضی نیاز: آپارتمان برای خرید می‌خواهم.',
  stateTruncated: false,
  sourceOfferFacts: {
    offer_category: { value: 'shop-sale', source: 'fixture' },
    offer_property_kind: { value: 'shop', source: 'fixture' },
    offer_transaction_type: { value: 'rent_short_term', source: 'fixture' },
  },
  hypotheticalNeed: {
    taskType: 'divar-counterfactual-post-need-proposal/v5',
    schemaVersion: 5,
    exampleId: 'fixture:counterfactual-v5',
    realNeedGroundTruth: false,
    trainingEligible: false,
    generation: { method: 'deterministic-counterfactual-template', version: 5 },
    targetDecisions,
    sourceOfferLocation: { appCitySlug: null, neighborhoodMatch: 'unresolved_or_not_stated' },
  },
  laya: {
    model: 'convaiinnovations/laya-multilingual',
    inputStateKind: 'original_divar_offer_text',
    inputStateSha256: 'a'.repeat(64),
    answers: {
      category_candidate: { type: 'choice', choice: 'shop-sale' },
      property_kind: { type: 'choice', choice: 'shop' },
      transaction_type: { type: 'choice', choice: 'rent_short_term' },
      parking: { type: 'choice', choice: 'yes' },
    },
  },
};

const temp = mkdtempSync(join(tmpdir(), 'divar-laya-evaluation-test-'));
try {
  const input = join(temp, 'fixture.jsonl');
  writeFileSync(input, `${JSON.stringify(row)}\n`, { flag: 'wx' });
  const evaluator = resolve('scripts/datasets/evaluate-divar-hypothetical.ts');
  const result = spawnSync(process.execPath, [
    '--conditions=react-server', evaluator, input, '--max-rows', '1',
  ], { encoding: 'utf8' });
  assert(result.status === 0, `evaluation fixture should run: ${result.stderr}`);
  const report = JSON.parse(result.stdout) as Record<string, any>;
  assert(report.layaCategorySourceOfferAgreement?.perExpectedCategory?.['shop-sale']?.exact === 1,
    'Laya category must be scored against Divar offer category, not synthetic need category');
  assert(report.layaSourceOfferFieldAgreement?.fields?.transaction_type?.exact === 1,
    'Laya transaction must be scored against source offer-derived transaction');
  assert(report.layaSourceOfferFieldAgreement?.fields?.parking?.compared === 0,
    'amenities without persisted source labels must not be scored against synthetic unknown');
  assert(report.layaSourceOfferFieldAgreement?.fields?.parking?.unscoredNoSourceLabel === 1,
    'unlabeled source fields must be explicitly counted as unscored');
  assert(report.runtimeCategoryCounterfactualAgreement?.expectedKnown === 1,
    'deterministic generated-need evaluation must retain its own seeker-side target');
  assert(report.trainingEligibleRows === 0, 'Divar-derived rows must remain ineligible for training');
  console.log('Divar/Laya evaluator: 6 checks passed; offer labels and synthetic-need targets remain separate');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
