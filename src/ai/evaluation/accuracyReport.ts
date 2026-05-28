import { evaluateKpiStatus } from '@/ai/evaluation/kpiTargets';

export interface FieldAccuracy {
  correct: number;
  total: number;
  accuracy: number;
}

export interface EvaluationMetrics {
  category: FieldAccuracy;
  city: FieldAccuracy;
  neighborhood: FieldAccuracy;
  transactionType: FieldAccuracy;
  averageLatencyMs: number;
  aiUsageRate: number;
  validationRejectRate: number;
  totalCases: number;
  aiInvocations: number;
  validationRejects: number;
  candidateCoverageRate: number;
  byVertical: Record<string, FieldAccuracy>;
}

export interface EvaluationCaseResult {
  text: string;
  expected: Record<string, string | null | undefined>;
  actual: Record<string, string | null | undefined>;
  vertical: string;
  candidateCoverage: boolean;
  aiInvoked: boolean;
  latencyMs: number;
  validationRejects: number;
  passed: boolean;
}

/** Infer evaluation vertical from expected/actual category slug. */
export function inferEvalVertical(
  expected: Record<string, string | null | undefined>,
  actual: Record<string, string | null | undefined>
): string {
  const v = expected.vertical ?? actual.vertical;
  if (v) return v;
  const cat = (expected.category ?? actual.category ?? '').toLowerCase();
  if (
    cat.includes('apartment') ||
    cat.includes('villa') ||
    cat.includes('land') ||
    cat.includes('office') ||
    cat.includes('shop') ||
    cat.includes('residential')
  ) {
    return 'real-estate';
  }
  if (cat.includes('car') || cat.includes('motor') || cat.includes('vehicle')) {
    return 'vehicles';
  }
  if (
    cat.includes('plumb') ||
    cat.includes('electrical') ||
    cat.includes('repair') ||
    cat.includes('clean') ||
    cat.includes('service') ||
    cat.includes('it-')
  ) {
    return 'services';
  }
  if (cat.includes('job') || cat.includes('hire') || cat.includes('admin')) {
    return 'jobs';
  }
  return 'general';
}

function pct(correct: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((correct / total) * 1000) / 10;
}

function fieldAccuracy(correct: number, total: number): FieldAccuracy {
  return { correct, total, accuracy: pct(correct, total) };
}

export function buildEvaluationMetrics(input: {
  caseResults: EvaluationCaseResult[];
  aiInvocations: number;
  validationRejects: number;
  totalLatencyMs: number;
}): EvaluationMetrics {
  let categoryCorrect = 0;
  let categoryTotal = 0;
  let cityCorrect = 0;
  let cityTotal = 0;
  let neighborhoodCorrect = 0;
  let neighborhoodTotal = 0;
  let transactionCorrect = 0;
  let transactionTotal = 0;
  let coverageHits = 0;
  let coverageTotal = 0;
  const verticalStats = new Map<string, { correct: number; total: number }>();

  for (const row of input.caseResults) {
    if (row.expected.category != null) {
      coverageTotal += 1;
      if (row.candidateCoverage) coverageHits += 1;

      categoryTotal += 1;
      const catOk = row.actual.category === row.expected.category;
      if (catOk) categoryCorrect += 1;

      const v = row.vertical;
      const bucket = verticalStats.get(v) ?? { correct: 0, total: 0 };
      bucket.total += 1;
      if (catOk) bucket.correct += 1;
      verticalStats.set(v, bucket);
    }
    if (row.expected.city != null) {
      cityTotal += 1;
      if (row.actual.city === row.expected.city) cityCorrect += 1;
    }
    if (row.expected.neighborhood != null) {
      neighborhoodTotal += 1;
      if (row.actual.neighborhood === row.expected.neighborhood) neighborhoodCorrect += 1;
    }
    if (row.expected.transactionType != null) {
      transactionTotal += 1;
      if (row.actual.transactionType === row.expected.transactionType) transactionCorrect += 1;
    }
  }

  const totalCases = input.caseResults.length;
  const aiInvocations = input.aiInvocations;
  const validationAttempts = input.caseResults.filter((r) => r.aiInvoked).length;

  const byVertical: Record<string, FieldAccuracy> = {};
  for (const [vertical, stats] of verticalStats.entries()) {
    byVertical[vertical] = fieldAccuracy(stats.correct, stats.total);
  }

  return {
    category: fieldAccuracy(categoryCorrect, categoryTotal),
    city: fieldAccuracy(cityCorrect, cityTotal),
    neighborhood: fieldAccuracy(neighborhoodCorrect, neighborhoodTotal),
    transactionType: fieldAccuracy(transactionCorrect, transactionTotal),
    averageLatencyMs:
      totalCases > 0 ? Math.round(input.totalLatencyMs / totalCases) : 0,
    aiUsageRate: totalCases > 0 ? pct(aiInvocations, totalCases) : 0,
    validationRejectRate:
      validationAttempts > 0
        ? pct(input.validationRejects, validationAttempts)
        : 0,
    totalCases,
    aiInvocations,
    validationRejects: input.validationRejects,
    candidateCoverageRate: coverageTotal > 0 ? pct(coverageHits, coverageTotal) : 100,
    byVertical,
  };
}

export function formatAccuracyReport(metrics: EvaluationMetrics): string {
  const kpiRows = evaluateKpiStatus(metrics);
  const lines = [
    '==================================',
    'INTAKE AI EVALUATION',
    '==================================',
    '',
    `Category Accuracy: ${metrics.category.accuracy}%`,
    `City Accuracy: ${metrics.city.accuracy}%`,
    `Neighborhood Accuracy: ${metrics.neighborhood.accuracy}%`,
    `Transaction Accuracy: ${metrics.transactionType.accuracy}%`,
    '',
    `Average Latency: ${metrics.averageLatencyMs}ms`,
    '',
    `AI Invocation Rate: ${metrics.aiUsageRate}%`,
    `Validation Reject Rate: ${metrics.validationRejectRate}%`,
    `Candidate Coverage Rate: ${metrics.candidateCoverageRate}%`,
    '',
    '--- Accuracy by Vertical ---',
    ...Object.entries(metrics.byVertical).map(
      ([v, f]) => `${v}: ${f.accuracy}% (${f.correct}/${f.total})`
    ),
    '',
    '--- KPI Targets ---',
    ...kpiRows.map((k) => {
      const mark = k.passed ? '✓' : '✗';
      const unit = k.unit === 'ms' ? 'ms' : '%';
      return `${mark} ${k.label}: ${k.actual}${unit} (target ${k.lowerIsBetter ? '≤' : '≥'} ${k.target}${unit})`;
    }),
    '',
    '==================================',
  ];
  return lines.join('\n');
}

export function printAccuracyReport(metrics: EvaluationMetrics): void {
  console.log(formatAccuracyReport(metrics));
}
