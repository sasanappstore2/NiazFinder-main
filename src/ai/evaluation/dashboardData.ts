import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { EvaluationMetrics } from '@/ai/evaluation/accuracyReport';
import { evaluateKpiStatus, type KpiStatusRow } from '@/ai/evaluation/kpiTargets';
import { getAiMetricsSnapshot } from '@/ai/observability/metrics';
import { getAiSemanticConfig } from '@/ai/config/feature-flags';
import { db } from '@/lib/db';
import { computeCandidateCoverageRate } from '@/ai/analytics/candidateFailures';
import { buildRejectAnalysisDashboard } from '@/ai/analytics/rejectAnalysis';

const EMPTY_METRICS: EvaluationMetrics = {
  category: { correct: 0, total: 0, accuracy: 0 },
  city: { correct: 0, total: 0, accuracy: 0 },
  neighborhood: { correct: 0, total: 0, accuracy: 0 },
  transactionType: { correct: 0, total: 0, accuracy: 0 },
  averageLatencyMs: 0,
  aiUsageRate: 0,
  validationRejectRate: 0,
  totalCases: 0,
  aiInvocations: 0,
  validationRejects: 0,
  candidateCoverageRate: 0,
  byVertical: {},
};

export const EVALUATION_LAST_RUN_PATH = join(
  process.cwd(),
  'data/intake-ai-evaluation-last-run.json'
);

export interface EvaluationLastRun {
  ranAt: string;
  mode: 'live' | 'oracle' | 'mock';
  provider: string;
  datasetPath: string;
  datasetSize: number;
  metrics: EvaluationMetrics;
  kpiStatus: KpiStatusRow[];
  failedCount: number;
  durationMs: number;
}

export function loadEvaluationLastRun(): EvaluationLastRun | null {
  if (!existsSync(EVALUATION_LAST_RUN_PATH)) return null;
  try {
    const raw = readFileSync(EVALUATION_LAST_RUN_PATH, 'utf8');
    return JSON.parse(raw) as EvaluationLastRun;
  } catch {
    return null;
  }
}

export async function buildIntakeAiEvaluationDashboard() {
  const lastRun = loadEvaluationLastRun();
  const runtimeMetrics = getAiMetricsSnapshot();
  const config = getAiSemanticConfig();

  let trainingCounts = {
    trainingExamples: 0,
    reviewedExamples: 0,
    goldDatasetSize: 0,
  };
  let candidateCoverage = { rate: 0, total: 0, covered: 0 };
  let rejectAnalysis = null as Awaited<ReturnType<typeof buildRejectAnalysisDashboard>> | null;

  try {
    const [total, reviewed, coverage, rejects] = await Promise.all([
      db.intakeTrainingExample.count(),
      db.intakeTrainingExample.count({ where: { reviewed: true } }),
      computeCandidateCoverageRate(24 * 7),
      buildRejectAnalysisDashboard(),
    ]);
    trainingCounts = {
      trainingExamples: total,
      reviewedExamples: reviewed,
      goldDatasetSize: reviewed,
    };
    candidateCoverage = coverage;
    rejectAnalysis = rejects;
  } catch {
    // DB may be unavailable in dev — dashboard still renders eval metrics
  }

  return {
    config: {
      enabled: config.enabled,
      provider: config.provider,
      confidenceThreshold: config.confidenceThreshold,
      ollamaModel: config.ollamaModel,
    },
    runtimeMetrics,
    lastRun,
    trainingCounts,
    candidateCoverage,
    rejectAnalysis,
    kpiTargets: evaluateKpiStatus(lastRun?.metrics ?? EMPTY_METRICS),
    hasLiveRun: lastRun?.mode === 'live',
  };
}

export type IntakeAiEvaluationDashboardData = Awaited<
  ReturnType<typeof buildIntakeAiEvaluationDashboard>
>;
