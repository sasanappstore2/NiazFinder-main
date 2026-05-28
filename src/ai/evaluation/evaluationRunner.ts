import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { tokenize } from '@/intake/tokenizer/tokenize';
import { generateNgrams } from '@/intake/ngrams/generateNgrams';
import { MockAiProvider } from '@/ai/providers/mockProvider';
import { retrieveIntakeCandidates } from '@/ai/services/candidateRetrieval';
import { runSemanticResolver } from '@/ai/services/semanticResolver';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { resetAiMetricsForTests, getAiMetricsSnapshot } from '@/ai/observability/metrics';
import { resetAiProviderForTests } from '@/ai/router/aiRouter';
import {
  buildEvaluationMetrics,
  printAccuracyReport,
  inferEvalVertical,
  type EvaluationCaseResult,
  type EvaluationMetrics,
} from '@/ai/evaluation/accuracyReport';
import { candidateCoversExpected } from '@/ai/analytics/candidateFailures';
import {
  loadEvaluationDataset,
  type EvaluationExpected,
} from '@/ai/evaluation/datasetLoader';
import {
  EVALUATION_LAST_RUN_PATH,
  type EvaluationLastRun,
} from '@/ai/evaluation/dashboardData';
import { evaluateKpiStatus } from '@/ai/evaluation/kpiTargets';
import type { AiCandidateRetrievalSet } from '@/ai/types';
import type { IntakeEntities } from '@/intake/types';

const NEIGHBORHOOD_ROWS = [
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'faramarz-abbasi',
    name: 'شهید فرامرز عباسی',
    areas: ['فرامرز عباسی', 'فرامرز'],
  },
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'ahmadabad',
    name: 'احمدآباد',
    areas: ['احمدآباد'],
  },
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'sajad',
    name: 'سجاد',
    areas: ['سجاد', 'بلوار سجاد'],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'vanak',
    name: 'ونک',
    areas: ['ونک'],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'elahiyeh',
    name: 'الهیه',
    areas: ['الهیه'],
  },
  {
    cityId: 'isfahan',
    cityName: 'اصفهان',
    id: 'chahar-bagh',
    name: 'چهارباغ',
    areas: ['چهارباغ'],
  },
];

function actualFromEntities(entities: IntakeEntities) {
  return {
    category: entities.subcategorySlug ?? entities.categorySlug,
    city: entities.citySlug,
    neighborhood: entities.neighborhoodSlug,
    transactionType: entities.transactionType,
  };
}

function expectedForCompare(expected: EvaluationExpected) {
  return {
    category: expected.category ?? undefined,
    city: expected.city ?? undefined,
    neighborhood: expected.neighborhood ?? undefined,
    transactionType: expected.transactionType ?? undefined,
  };
}

function casePassed(
  expected: EvaluationExpected,
  actual: ReturnType<typeof actualFromEntities>
): boolean {
  if (expected.category != null && actual.category !== expected.category) return false;
  if (expected.city != null && actual.city !== expected.city) return false;
  if (expected.neighborhood != null && actual.neighborhood !== expected.neighborhood) {
    return false;
  }
  if (expected.transactionType != null && actual.transactionType !== expected.transactionType) {
    return false;
  }
  return true;
}

function ensureExpectedInCandidates(
  candidates: AiCandidateRetrievalSet,
  expected: EvaluationExpected
): AiCandidateRetrievalSet {
  const out: AiCandidateRetrievalSet = {
    ...candidates,
    categories: [...candidates.categories],
    cities: [...candidates.cities],
    neighborhoods: [...candidates.neighborhoods],
    transactionTypes: [...candidates.transactionTypes],
  };

  if (
    expected.category &&
    !out.categories.some((c) => c.slug === expected.category)
  ) {
    out.categories.unshift({ slug: expected.category, title: expected.category, rankScore: 0.99 });
  }
  if (expected.city && !out.cities.some((c) => c.slug === expected.city)) {
    out.cities.unshift({
      id: expected.city,
      slug: expected.city,
      name: expected.city,
      rankScore: 0.99,
    });
  }
  if (
    expected.neighborhood &&
    !out.neighborhoods.some((n) => n.slug === expected.neighborhood)
  ) {
    out.neighborhoods.unshift({
      slug: expected.neighborhood,
      name: expected.neighborhood,
      cityId: expected.city ?? 'unknown',
      cityName: expected.city ?? '',
      rankScore: 0.99,
    });
  }
  if (
    expected.transactionType &&
    !out.transactionTypes.some((t) => t.value === expected.transactionType)
  ) {
    out.transactionTypes.unshift({
      value: expected.transactionType,
      label: expected.transactionType,
    });
  }

  out.retrievalCount =
    out.categories.length + out.cities.length + out.neighborhoods.length;
  return out;
}

function buildOracleMockResponse(
  expected: EvaluationExpected,
  candidates: AiCandidateRetrievalSet
): string {
  const category =
    expected.category &&
    candidates.categories.some((c) => c.slug === expected.category)
      ? expected.category
      : null;
  const city =
    expected.city && candidates.cities.some((c) => c.slug === expected.city)
      ? expected.city
      : null;
  const neighborhood =
    expected.neighborhood &&
    candidates.neighborhoods.some((n) => n.slug === expected.neighborhood)
      ? expected.neighborhood
      : null;
  const transactionType =
    expected.transactionType &&
    candidates.transactionTypes.some((t) => t.value === expected.transactionType)
      ? expected.transactionType
      : null;

  return JSON.stringify({
    category,
    city,
    neighborhood,
    transactionType,
    budget: null,
    area: null,
    rooms: null,
    confidence: 0.9,
  });
}

function resolveEvalMode(): 'live' | 'oracle' | 'mock' {
  if (process.env.INTAKE_EVAL_LIVE === '1') return 'live';
  if (process.env.INTAKE_EVAL_ORACLE === '1') return 'oracle';
  return 'mock';
}

export interface RunEvaluationOptions {
  datasetPath?: string;
  useOracleMock?: boolean;
  providerOverride?: string;
  forceAi?: boolean;
  writeLastRun?: boolean;
  onProgress?: (current: number, total: number, text: string) => void;
}

export interface EvaluationRunResult {
  metrics: EvaluationMetrics;
  caseResults: EvaluationCaseResult[];
  snapshot: ReturnType<typeof getAiMetricsSnapshot>;
  mode: 'live' | 'oracle' | 'mock';
  durationMs: number;
}

function persistLastRun(payload: EvaluationLastRun): void {
  mkdirSync(dirname(EVALUATION_LAST_RUN_PATH), { recursive: true });
  writeFileSync(EVALUATION_LAST_RUN_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function runIntakeAiEvaluation(
  options: RunEvaluationOptions = {}
): Promise<EvaluationRunResult> {
  const config = getAiSemanticConfig();
  const mode = options.useOracleMock ? 'oracle' : resolveEvalMode();
  const isLive = mode === 'live';
  const useOracle = mode === 'oracle';
  const forceAi = options.forceAi ?? (isLive ? process.env.INTAKE_EVAL_FORCE_AI === '1' : true);
  const providerOverride = options.providerOverride ?? (isLive ? 'ollama' : config.provider);

  resetAiMetricsForTests();
  resetAiProviderForTests();

  const indexes = buildIntakeIndexesSync(NEIGHBORHOOD_ROWS);
  const datasetPath =
    options.datasetPath ??
    process.env.INTAKE_EVAL_DATASET ??
    undefined;
  const dataset = loadEvaluationDataset(datasetPath);
  const started = performance.now();

  const caseResults: EvaluationCaseResult[] = [];
  let totalLatencyMs = 0;
  let aiInvocations = 0;

  for (let i = 0; i < dataset.length; i += 1) {
    const item = dataset[i]!;
    options.onProgress?.(i + 1, dataset.length, item.text);

    const caseStarted = performance.now();
    const ruleResult = analyzeNeedText(item.text, indexes);
    const normalizedText = normalizePersian(item.text);
    const tokens = tokenize(normalizedText, { removeStopWords: true });
    const ngrams = generateNgrams(tokens);
    const baseCandidates = retrieveIntakeCandidates(indexes, tokens, ngrams.all, ruleResult);
    const candidates = useOracle
      ? ensureExpectedInCandidates(baseCandidates, item.expected)
      : baseCandidates;

    const provider = useOracle
      ? new MockAiProvider({ response: buildOracleMockResponse(item.expected, candidates) })
      : undefined;

    const resolved = await runSemanticResolver(
      ruleResult,
      item.text,
      indexes,
      tokens,
      ngrams.all,
      {
        forceAi,
        providerOverride: provider ? undefined : providerOverride,
        provider,
        candidatesOverride: candidates,
      }
    );

    const latencyMs = Math.round(performance.now() - caseStarted);
    totalLatencyMs += latencyMs;

    if (resolved.aiInvoked) aiInvocations += 1;

    const rejects =
      resolved.aiInvoked && resolved.aiError?.code === 'INVALID_RESPONSE' ? 1 : 0;

    const actual = actualFromEntities(resolved.mergedResult.entities);
    const expected = expectedForCompare(item.expected);
    const expectedCategory = item.expected.category ?? null;
    const candidateCoverage =
      expectedCategory && candidates.categories.length > 0
        ? candidateCoversExpected(
            expectedCategory,
            candidates.categories.map((c) => c.slug)
          )
        : true;

    caseResults.push({
      text: item.text,
      expected,
      actual,
      vertical: inferEvalVertical(expected, actual),
      candidateCoverage,
      aiInvoked: resolved.aiInvoked,
      latencyMs,
      validationRejects: rejects,
      passed: casePassed(item.expected, actual),
    });
  }

  const snapshot = getAiMetricsSnapshot();
  const metrics = buildEvaluationMetrics({
    caseResults,
    aiInvocations,
    validationRejects: snapshot.validationRejects,
    totalLatencyMs,
  });
  const durationMs = Math.round(performance.now() - started);

  if (options.writeLastRun !== false) {
    persistLastRun({
      ranAt: new Date().toISOString(),
      mode,
      provider: providerOverride,
      datasetPath: datasetPath ?? 'src/intake/fixtures/evaluation-dataset.json',
      datasetSize: dataset.length,
      metrics,
      kpiStatus: evaluateKpiStatus(metrics),
      failedCount: caseResults.filter((r) => !r.passed).length,
      durationMs,
    });
  }

  return {
    metrics,
    caseResults,
    snapshot,
    mode,
    durationMs,
  };
}

export async function main(): Promise<void> {
  const mode = resolveEvalMode();
  console.log(`Running intake AI evaluation (mode=${mode})...`);

  const result = await runIntakeAiEvaluation({
    onProgress: (current, total, text) => {
      if (mode === 'live' && (current === 1 || current % 10 === 0 || current === total)) {
        console.log(`[${current}/${total}] ${text.slice(0, 50)}…`);
      }
    },
  });

  printAccuracyReport(result.metrics);
  console.log(`Duration: ${Math.round(result.durationMs / 1000)}s · Cases: ${result.metrics.totalCases}`);

  const failed = result.caseResults.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`\n${failed.length} case(s) failed:`);
    for (const row of failed.slice(0, 10)) {
      console.error('-', row.text.slice(0, 60), row.expected, '→', row.actual);
    }
    if (mode === 'live') {
      console.error('\nLive run saved — review data/intake-ai-evaluation-last-run.json');
    }
    process.exit(mode === 'live' ? 0 : 1);
  }
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('evaluationRunner'));

if (isDirectRun) {
  main().catch((err) => {
    console.error('evaluate:intake-ai failed:', err);
    process.exit(1);
  });
}
