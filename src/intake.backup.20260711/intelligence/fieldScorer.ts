import type { FieldStats } from '@/intake/intelligence/types';
import type { SessionAggregationResult } from '@/intake/intelligence/types';

export interface FieldScorerInput {
  aggregation: SessionAggregationResult;
  schemaFieldKeys: readonly string[];
  observedFieldKeys: readonly string[];
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function percentileNormalize(values: number[], value: number): number {
  if (values.length === 0) return 0;
  const max = Math.max(...values, 1);
  return clamp01(value / max);
}

export function scoreFields(input: FieldScorerInput): Record<string, FieldStats> {
  const { aggregation, schemaFieldKeys, observedFieldKeys } = input;
  const totalSessions = Math.max(aggregation.totalSessions, 1);
  const allKeys = new Set([...schemaFieldKeys, ...observedFieldKeys]);

  const avgTimes: number[] = [];
  const keyMeta = new Map<
    string,
    {
      sessionsWithField: number;
      changeCount: number;
      totalTimeMs: number;
      errorCount: number;
      publishSuccess: number;
      publishFail: number;
    }
  >();

  for (const key of allKeys) {
    keyMeta.set(key, {
      sessionsWithField: 0,
      changeCount: 0,
      totalTimeMs: 0,
      errorCount: aggregation.globalValidationErrors.get(key) ?? 0,
      publishSuccess: 0,
      publishFail: 0,
    });
  }

  for (const session of aggregation.sessions) {
    for (const [fieldKey, touch] of session.fieldsTouched) {
      const row = keyMeta.get(fieldKey) ?? {
        sessionsWithField: 0,
        changeCount: 0,
        totalTimeMs: 0,
        errorCount: aggregation.globalValidationErrors.get(fieldKey) ?? 0,
        publishSuccess: 0,
        publishFail: 0,
      };
      row.sessionsWithField += 1;
      row.changeCount += touch.changes;
      row.totalTimeMs += touch.totalTimeMs;
      if (session.publishOutcome === 'success') row.publishSuccess += 1;
      if (session.publishOutcome === 'fail') row.publishFail += 1;
      keyMeta.set(fieldKey, row);
    }
  }

  for (const row of keyMeta.values()) {
    if (row.changeCount > 0) {
      avgTimes.push(row.totalTimeMs / row.changeCount);
    }
  }

  const stats: Record<string, FieldStats> = {};

  for (const [fieldKey, row] of keyMeta) {
    const usageRate = row.sessionsWithField / totalSessions;
    const avgTimeSpent = row.changeCount > 0 ? row.totalTimeMs / row.changeCount : 0;
    const errorRate = row.errorCount / Math.max(row.changeCount, 1);
    const touchedPublish = row.publishSuccess + row.publishFail;
    const publishSuccessCorrelation =
      touchedPublish > 0 ? row.publishSuccess / touchedPublish : usageRate;

    const importanceScore = clamp01(usageRate * 0.6 + publishSuccessCorrelation * 0.4);
    const frictionScore = clamp01(
      errorRate * 0.5 + percentileNormalize(avgTimes, avgTimeSpent) * 0.5
    );

    stats[fieldKey] = {
      usageRate,
      avgTimeSpent,
      errorRate,
      importanceScore,
      frictionScore,
      sessionTouchCount: row.sessionsWithField,
      changeCount: row.changeCount,
    };
  }

  return stats;
}
