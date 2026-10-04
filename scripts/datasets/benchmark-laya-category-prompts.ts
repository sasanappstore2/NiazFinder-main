#!/usr/bin/env bun
/**
 * Small, authored-only A/B evaluation of real-estate category question wording.
 * This is an evaluation fixture, not real-user data and never training data.
 * It calls only the loopback Laya Multilingual worker and writes no files.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPostDecisionQuestions } from '@/lib/need-intake/laya/post-decision-questions';
import { extractPostNaturalFields } from '@/lib/need-intake/laya/post-natural-extractor';
import { buildDivarLayaBatchQuestions } from './divar-laya-question-factory';

type Json = Record<string, any>;
type Case = { expected: string; text: string };

const APPROVED_MODEL = 'convaiinnovations/laya-multilingual';
const LAYA_LOOPBACK = 'http://127.0.0.1:8111';
const DEFAULT_BASELINE_MANIFEST = resolve(
  'data/divar/divar-hypothetical-needs-laya-full-v5-2026-09-26.jsonl.manifest.json',
);

// Authored as a one-example-per-leaf diagnostic plus one underspecified case.
// These examples are deliberately excluded from both training and gold-data counts.
const CASES: Case[] = [
  { expected: 'apartment-sale', text: 'یک آپارتمان حدود ۱۳۰ متر برای خرید در تهران می‌خواهم.' },
  { expected: 'apartment-rent', text: 'واحد آپارتمانی در مشهد برای اجاره ماهانه می‌خواهم.' },
  { expected: 'villa-sale', text: 'خانه ویلایی در شیراز برای خرید می‌خواهم.' },
  { expected: 'villa-rent', text: 'خانه ویلایی در کرج برای اجاره بلندمدت می‌خواهم.' },
  { expected: 'land-sale', text: 'یک قطعه زمین در اصفهان برای خرید نیاز دارم.' },
  { expected: 'land-rent', text: 'یک زمین برای اجاره بلندمدت در یزد می‌خواهم.' },
  { expected: 'office-sale', text: 'دفتر کار در تهران برای خرید می‌خواهم.' },
  { expected: 'office-rent', text: 'دفتر کار در تهران برای اجاره ماهانه می‌خواهم.' },
  { expected: 'shop-sale', text: 'مغازه در شیراز برای خرید می‌خواهم.' },
  { expected: 'shop-rent', text: 'مغازه در مشهد برای اجاره می‌خواهم.' },
  { expected: 'industrial-sale', text: 'سوله صنعتی در تبریز برای خرید می‌خواهم.' },
  { expected: 'industrial-rent', text: 'کارگاه صنعتی برای اجاره می‌خواهم.' },
  { expected: 'suite-apartment-rent', text: 'سوئیت مبله در تهران برای اجاره چند شب می‌خواهم.' },
  { expected: 'villa-short-rent', text: 'ویلا و باغ برای تعطیلات یک هفته‌ای اجاره می‌خواهم.' },
  { expected: 'workspace-short-rent', text: 'فضای کلاس یا دفتر برای چند روز اجاره می‌خواهم.' },
  { expected: 'pre-sale-services', text: 'به دنبال پیش‌خرید واحدی هستم که هنوز در حال ساخت است.' },
  { expected: 'construction-partnership', text: 'شریک سازنده برای مشارکت در ساخت در تهران می‌خواهم.' },
  { expected: 'agency-services', text: 'برای پیدا کردن ملک در تهران به خدمات مشاور یا آژانس املاک نیاز دارم.' },
  { expected: 'unknown', text: 'یک ملک حدود ۱۳۰ متر حوالی ونک می‌خواهم، نوع معامله را هنوز نمی‌دانم.' },
];

const EXPECTED_DIMENSIONS: Record<string, { propertyKind: string; transactionType: string }> = {
  'apartment-sale': { propertyKind: 'apartment', transactionType: 'buy' },
  'apartment-rent': { propertyKind: 'apartment', transactionType: 'rent_monthly' },
  'villa-sale': { propertyKind: 'villa', transactionType: 'buy' },
  'villa-rent': { propertyKind: 'villa', transactionType: 'rent_monthly' },
  'land-sale': { propertyKind: 'land', transactionType: 'buy' },
  'land-rent': { propertyKind: 'land', transactionType: 'rent_monthly' },
  'office-sale': { propertyKind: 'office', transactionType: 'buy' },
  'office-rent': { propertyKind: 'office', transactionType: 'rent_monthly' },
  'shop-sale': { propertyKind: 'shop', transactionType: 'buy' },
  'shop-rent': { propertyKind: 'shop', transactionType: 'rent_monthly' },
  'industrial-sale': { propertyKind: 'industrial', transactionType: 'buy' },
  'industrial-rent': { propertyKind: 'industrial', transactionType: 'rent_monthly' },
  'suite-apartment-rent': { propertyKind: 'apartment', transactionType: 'rent_short_term' },
  'villa-short-rent': { propertyKind: 'villa', transactionType: 'rent_short_term' },
  'workspace-short-rent': { propertyKind: 'office', transactionType: 'rent_short_term' },
  'pre-sale-services': { propertyKind: 'apartment', transactionType: 'buy' },
  'construction-partnership': { propertyKind: 'unknown', transactionType: 'unknown' },
  'agency-services': { propertyKind: 'unknown', transactionType: 'unknown' },
  unknown: { propertyKind: 'unknown', transactionType: 'unknown' },
};

const DIMENSION_DERIVED_CATEGORY: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  apartment: {
    buy: 'apartment-sale', sell: 'apartment-sale', rent: 'apartment-rent',
    rent_short_term: 'suite-apartment-rent',
  },
  villa: {
    buy: 'villa-sale', sell: 'villa-sale', rent: 'villa-rent',
    rent_short_term: 'villa-short-rent',
  },
  land: { buy: 'land-sale', sell: 'land-sale', rent: 'land-rent' },
  office: {
    buy: 'office-sale', sell: 'office-sale', rent: 'office-rent',
    rent_short_term: 'workspace-short-rent',
  },
  shop: { buy: 'shop-sale', sell: 'shop-sale', rent: 'shop-rent' },
  industrial: { buy: 'industrial-sale', sell: 'industrial-sale', rent: 'industrial-rent' },
};

function parseBaselineQuestion(path: string): Json {
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as Json;
  if (
    manifest.model !== APPROVED_MODEL ||
    manifest.status === 'failed' ||
    ![
      'divar-counterfactual-post-need-laya-proposal/v1',
      'divar-counterfactual-post-need-laya-proposal/v2',
      'divar-counterfactual-post-need-laya-proposal/v3',
    ].includes(manifest.taskType)
  ) throw new Error('Baseline manifest does not belong to the approved proposal-only Laya run.');
  const question = manifest.questionFactory?.questions?.category_candidate;
  if (question?.type !== 'choice' || !question.criteria || typeof question.criteria !== 'object') {
    throw new Error('Baseline manifest has no category choice question.');
  }
  return question;
}

async function postJson(path: string, payload: Json): Promise<Json> {
  const response = await fetch(`${LAYA_LOOPBACK}${path}`, {
    method: path === '/health' ? 'GET' : 'POST',
    headers: path === '/health' ? undefined : { 'content-type': 'application/json' },
    body: path === '/health' ? undefined : JSON.stringify(payload),
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw new Error(`Loopback Laya returned HTTP ${response.status}.`);
  return await response.json() as Json;
}

async function predict(question: Json): Promise<{ answers: Json[]; latencyMs: number }> {
  const result = await postJson('/predict-batch', {
    states: CASES.map(({ text }) => ({ text })),
    questions: { category_candidate: question },
  });
  if (
    result.model !== APPROVED_MODEL ||
    !Array.isArray(result.results) ||
    result.results.length !== CASES.length ||
    result.results.some((row: Json) => !row || typeof row.answers?.category_candidate !== 'object')
  ) throw new Error('Loopback Laya returned an invalid typed-decision batch.');
  return {
    answers: result.results.map((row: Json) => row.answers.category_candidate),
    latencyMs: Number(result.latencyMs ?? 0),
  };
}

async function predictDimensions(): Promise<{ answers: Json[]; latencyMs: number }> {
  const questions = buildPostDecisionQuestions({ includePropertyFields: true });
  const result = await postJson('/predict-batch', {
    states: CASES.map(({ text }) => ({ text })),
    questions,
  });
  if (
    result.model !== APPROVED_MODEL ||
    !Array.isArray(result.results) ||
    result.results.length !== CASES.length ||
    result.results.some((row: Json) => !row || typeof row.answers?.property_kind !== 'object' ||
      typeof row.answers?.transaction_type !== 'object')
  ) throw new Error('Loopback Laya returned invalid dimensional decisions.');
  return {
    answers: result.results.map((row: Json) => row.answers),
    latencyMs: Number(result.latencyMs ?? 0),
  };
}

async function predictRuntimeNarrowed(): Promise<{ decisions: Json[]; latencyMs: number }> {
  const started = performance.now();
  const decisions: Json[] = [];
  for (const item of CASES) {
    const deterministic = extractPostNaturalFields(item.text);
    const candidates = deterministic.categoryCandidates;
    if (candidates.length < 2) {
      decisions.push({
        value: candidates.length === 1 ? candidates[0]!.slug : 'unknown',
        source: candidates.length === 1 ? 'deterministic-single-candidate' : 'rules-no-candidate',
        candidateCount: candidates.length,
      });
      continue;
    }

    const questions = buildPostDecisionQuestions({
      categoryCandidates: candidates,
      includePropertyFields: deterministic.includePropertyFields,
    });
    const result = await postJson('/predict', {
      state: {
        text: item.text,
        normalized_text: deterministic.normalizedText,
        context: {
          city: deterministic.cityCandidate ?? null,
          city_locked_by_user: false,
          category: null,
          category_locked_by_user: false,
          neighborhood_candidates: [],
        },
      },
      questions,
    });
    if (result.model !== APPROVED_MODEL || !result.answers?.category_candidate) {
      throw new Error('Loopback Laya returned an invalid runtime-narrowed category decision.');
    }
    decisions.push({
      value: choice(result.answers.category_candidate),
      confidence: result.answers.category_candidate.answer_confidence ??
        result.answers.category_candidate.confidence ?? null,
      source: 'laya-from-deterministic-candidate-set',
      candidateCount: candidates.length,
    });
  }
  return { decisions, latencyMs: Math.round(performance.now() - started) };
}

function choice(answer: Json): string {
  return String(answer.choice ?? answer.noul ?? answer.value ?? 'unknown');
}

function deriveCategoryFromDimensions(propertyKind: string, transactionType: string): string {
  const normalizedTransaction = ['rent_monthly', 'rent_rahn_full', 'rent_rahn_ejare'].includes(transactionType)
    ? 'rent'
    : transactionType;
  return DIMENSION_DERIVED_CATEGORY[propertyKind]?.[normalizedTransaction] ?? 'unknown';
}

function exactAgreement(answers: Json[]): { exact: number; total: number; percent: number } {
  const exact = answers.reduce(
    (count, answer, index) => count + Number(choice(answer) === CASES[index]!.expected),
    0,
  );
  return { exact, total: CASES.length, percent: Math.round((exact / CASES.length) * 10_000) / 100 };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length > 2 || (args.length > 0 && args[0] !== '--baseline-manifest')) {
    throw new Error('Usage: bun scripts/datasets/benchmark-laya-category-prompts.ts [--baseline-manifest <path>]');
  }
  const baselinePath = args.length === 2 ? resolve(args[1]!) : DEFAULT_BASELINE_MANIFEST;
  const health = await postJson('/health', {});
  if (health.model_name !== APPROVED_MODEL || health.model_loaded !== true) {
    throw new Error('The exact approved Laya Multilingual checkpoint is not ready on loopback.');
  }

  const baselineQuestion = parseBaselineQuestion(baselinePath);
  const descriptiveQuestion = buildDivarLayaBatchQuestions().category_candidate;
  if (descriptiveQuestion?.type !== 'choice') throw new Error('Current category question is not a choice.');
  const baselineKeys = Object.keys(baselineQuestion.criteria).sort();
  const descriptiveKeys = Object.keys(descriptiveQuestion.criteria).sort();
  if (JSON.stringify(baselineKeys) !== JSON.stringify(descriptiveKeys)) {
    throw new Error('A/B prompts must expose exactly the same category options.');
  }
  const expectedKeys = [...new Set(CASES.map(({ expected }) => expected))].sort();
  if (JSON.stringify(expectedKeys) !== JSON.stringify(baselineKeys)) {
    throw new Error('Authored cases must cover every option exactly once, including unknown.');
  }

  // Sequential calls preserve the shared local worker's own request lock.
  const baseline = await predict(baselineQuestion);
  const descriptive = await predict(descriptiveQuestion);
  const dimensions = await predictDimensions();
  const runtimeNarrowed = await predictRuntimeNarrowed();
  const deterministic = CASES.map(({ text }) => extractPostNaturalFields(text));
  const cases = CASES.map((item, index) => ({
    expected: item.expected,
    baseline: {
      value: choice(baseline.answers[index]!),
      confidence: baseline.answers[index]!.answer_confidence ?? baseline.answers[index]!.confidence ?? null,
    },
    descriptive: {
      value: choice(descriptive.answers[index]!),
      confidence: descriptive.answers[index]!.answer_confidence ?? descriptive.answers[index]!.confidence ?? null,
    },
    dimensions: {
      propertyKind: choice(dimensions.answers[index]!.property_kind),
      transactionType: choice(dimensions.answers[index]!.transaction_type),
      derivedCategory: deriveCategoryFromDimensions(
        choice(dimensions.answers[index]!.property_kind),
        choice(dimensions.answers[index]!.transaction_type),
      ),
    },
    deterministicCandidates: deterministic[index]!.categoryCandidates.map((candidate) => candidate.slug),
    runtimeNarrowed: runtimeNarrowed.decisions[index],
  }));
  const unknownCase = cases.find((item) => item.expected === 'unknown');
  const dimensionCases = cases.filter((item) =>
    ['apartment-sale', 'apartment-rent', 'villa-sale', 'villa-rent', 'land-sale', 'land-rent',
      'office-sale', 'office-rent', 'shop-sale', 'shop-rent', 'industrial-sale', 'industrial-rent',
      'suite-apartment-rent', 'villa-short-rent', 'workspace-short-rent', 'unknown'].includes(item.expected)
  );
  const dimensionsExact = dimensionCases.reduce(
    (count, item) => count + Number(item.dimensions.derivedCategory === item.expected), 0,
  );
  const propertyKindCases = cases.filter((item) => EXPECTED_DIMENSIONS[item.expected]);
  const propertyKindExact = propertyKindCases.reduce(
    (count, item, index) => count + Number(
      choice(dimensions.answers[index]!.property_kind) === EXPECTED_DIMENSIONS[item.expected]!.propertyKind,
    ), 0,
  );
  const transactionExact = propertyKindCases.reduce(
    (count, item, index) => count + Number(
      choice(dimensions.answers[index]!.transaction_type) === EXPECTED_DIMENSIONS[item.expected]!.transactionType,
    ), 0,
  );
  const runtimeNarrowedExact = runtimeNarrowed.decisions.reduce(
    (count, decision, index) => count + Number(decision.value === CASES[index]!.expected), 0,
  );
  const rulesCandidateRecall = CASES.reduce((count, item, index) => count + Number(
    deterministic[index]!.categoryCandidates.some((candidate) => candidate.slug === item.expected),
  ), 0);
  const rulesSingletonExact = CASES.reduce((count, item, index) => {
    const candidates = deterministic[index]!.categoryCandidates;
    return count + Number(candidates.length === 1 && candidates[0]!.slug === item.expected);
  }, 0);

  console.log(JSON.stringify({
    model: APPROVED_MODEL,
    device: health.device,
    fixtureStatus: 'authored-diagnostic-only-not-training-data',
    cases: CASES.length,
    baselineManifest: baselinePath,
    baselineLatencyMs: baseline.latencyMs,
    descriptiveLatencyMs: descriptive.latencyMs,
    dimensionalLatencyMs: dimensions.latencyMs,
    runtimeNarrowedLatencyMs: runtimeNarrowed.latencyMs,
    baselineExactAgreement: exactAgreement(baseline.answers),
    descriptiveExactAgreement: exactAgreement(descriptive.answers),
    rulesCandidateRecall: { exact: rulesCandidateRecall, total: CASES.length },
    rulesSingletonExact: { exact: rulesSingletonExact, total: CASES.length },
    runtimeNarrowedAgreement: { exact: runtimeNarrowedExact, total: CASES.length },
    dimensionalDerivation: {
      exactCategoryAgreement: { exact: dimensionsExact, total: dimensionCases.length },
      propertyKindAgreement: { exact: propertyKindExact, total: propertyKindCases.length },
      transactionTypeAgreement: { exact: transactionExact, total: propertyKindCases.length },
      caveat: 'Derived from Laya property_kind and transaction_type; authored diagnostic only, with no service-category inference.',
    },
    unknownCase: unknownCase ? {
      baseline: unknownCase.baseline,
      descriptive: unknownCase.descriptive,
    } : null,
    results: cases,
  }, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Laya category prompt benchmark failed.');
  process.exitCode = 1;
});
