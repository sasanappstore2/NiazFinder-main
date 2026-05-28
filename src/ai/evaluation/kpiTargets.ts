import type { EvaluationMetrics } from '@/ai/evaluation/accuracyReport';

export interface KpiTarget {
  key: keyof Pick<
    EvaluationMetrics,
    | 'category'
    | 'city'
    | 'neighborhood'
    | 'transactionType'
    | 'averageLatencyMs'
    | 'aiUsageRate'
    | 'validationRejectRate'
  >;
  label: string;
  target: number;
  /** true when lower values are better (latency, reject rate, AI usage) */
  lowerIsBetter?: boolean;
  unit?: '%' | 'ms';
}

export const INTAKE_AI_KPI_TARGETS: KpiTarget[] = [
  { key: 'category', label: 'Category Accuracy', target: 95, unit: '%' },
  { key: 'city', label: 'City Accuracy', target: 99, unit: '%' },
  { key: 'neighborhood', label: 'Neighborhood Accuracy', target: 90, unit: '%' },
  { key: 'transactionType', label: 'Transaction Type Accuracy', target: 95, unit: '%' },
  { key: 'aiUsageRate', label: 'AI Invocation Rate', target: 30, lowerIsBetter: true, unit: '%' },
  { key: 'averageLatencyMs', label: 'Avg Latency', target: 500, lowerIsBetter: true, unit: 'ms' },
  { key: 'validationRejectRate', label: 'Validation Reject Rate', target: 5, lowerIsBetter: true, unit: '%' },
];

export interface KpiStatusRow {
  key: string;
  label: string;
  actual: number;
  target: number;
  unit: '%' | 'ms';
  passed: boolean;
  lowerIsBetter: boolean;
}

export function evaluateKpiStatus(metrics: EvaluationMetrics): KpiStatusRow[] {
  return INTAKE_AI_KPI_TARGETS.map((kpi) => {
    let actual: number;
    if (kpi.key === 'averageLatencyMs') {
      actual = metrics.averageLatencyMs;
    } else if (kpi.key === 'aiUsageRate') {
      actual = metrics.aiUsageRate;
    } else if (kpi.key === 'validationRejectRate') {
      actual = metrics.validationRejectRate;
    } else {
      actual = metrics[kpi.key].accuracy;
    }

    const lowerIsBetter = kpi.lowerIsBetter ?? false;
    const passed = lowerIsBetter ? actual <= kpi.target : actual >= kpi.target;

    return {
      key: kpi.key,
      label: kpi.label,
      actual,
      target: kpi.target,
      unit: kpi.unit ?? '%',
      passed,
      lowerIsBetter,
    };
  });
}

export function allKpisPassed(metrics: EvaluationMetrics): boolean {
  return evaluateKpiStatus(metrics).every((r) => r.passed);
}
