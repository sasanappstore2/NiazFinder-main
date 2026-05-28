import type { AiMetricsSnapshot, AiProviderName } from '@/ai/types';

export interface ExtendedAiMetrics extends AiMetricsSnapshot {
  validationRejects: number;
  candidateRetrievalCount: number;
  topFailedCategories: Record<string, number>;
  topFailedNeighborhoods: Record<string, number>;
}

const metrics: ExtendedAiMetrics = {
  requests: 0,
  successes: 0,
  failures: 0,
  totalLatencyMs: 0,
  byProvider: {},
  validationRejects: 0,
  candidateRetrievalCount: 0,
  topFailedCategories: {},
  topFailedNeighborhoods: {},
};

function ensureProvider(name: string) {
  if (!metrics.byProvider[name]) {
    metrics.byProvider[name] = { requests: 0, successes: 0, failures: 0 };
  }
  return metrics.byProvider[name];
}

export function recordCandidateRetrieval(count: number): void {
  metrics.candidateRetrievalCount += count;
}

export function recordValidationReject(field: string, value: string): void {
  metrics.validationRejects += 1;
  if (field === 'category' && value) {
    metrics.topFailedCategories[value] = (metrics.topFailedCategories[value] ?? 0) + 1;
  }
  if (field === 'neighborhood' && value) {
    metrics.topFailedNeighborhoods[value] = (metrics.topFailedNeighborhoods[value] ?? 0) + 1;
  }
}

export function recordAiRequest(provider: AiProviderName, latencyMs: number, success: boolean): void {
  metrics.requests += 1;
  metrics.totalLatencyMs += latencyMs;
  const row = ensureProvider(provider);
  row.requests += 1;
  if (success) {
    metrics.successes += 1;
    row.successes += 1;
  } else {
    metrics.failures += 1;
    row.failures += 1;
  }

  console.info('[AI_METRICS]', {
    provider,
    success,
    latencyMs,
    requests: metrics.requests,
    successes: metrics.successes,
    failures: metrics.failures,
    validationRejects: metrics.validationRejects,
    candidateRetrievalCount: metrics.candidateRetrievalCount,
    avgLatencyMs:
      metrics.requests > 0 ? Math.round(metrics.totalLatencyMs / metrics.requests) : 0,
  });
}

export function getAiMetricsSnapshot(): ExtendedAiMetrics {
  return {
    ...metrics,
    byProvider: { ...metrics.byProvider },
    topFailedCategories: { ...metrics.topFailedCategories },
    topFailedNeighborhoods: { ...metrics.topFailedNeighborhoods },
  };
}

export function resetAiMetricsForTests(): void {
  metrics.requests = 0;
  metrics.successes = 0;
  metrics.failures = 0;
  metrics.totalLatencyMs = 0;
  metrics.byProvider = {};
  metrics.validationRejects = 0;
  metrics.candidateRetrievalCount = 0;
  metrics.topFailedCategories = {};
  metrics.topFailedNeighborhoods = {};
}
