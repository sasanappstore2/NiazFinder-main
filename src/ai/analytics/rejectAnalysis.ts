import { db } from '@/lib/db';

export type RejectReasonCategory =
  | 'UNKNOWN_CATEGORY'
  | 'UNKNOWN_CITY'
  | 'UNKNOWN_NEIGHBORHOOD'
  | 'INVALID_TRANSACTION_TYPE'
  | 'INVALID_SLUG'
  | 'LOW_CONFIDENCE'
  | 'OTHER';

export function classifyRejectReason(
  field: string,
  reason: string,
  value?: unknown
): RejectReasonCategory {
  if (field === 'category') {
    if (reason === 'not_in_candidate_list') return 'INVALID_SLUG';
    return 'UNKNOWN_CATEGORY';
  }
  if (field === 'city') {
    if (reason === 'not_in_candidate_list') return 'INVALID_SLUG';
    return 'UNKNOWN_CITY';
  }
  if (field === 'neighborhood') {
    if (reason === 'not_in_candidate_list') return 'INVALID_SLUG';
    return 'UNKNOWN_NEIGHBORHOOD';
  }
  if (field === 'transactionType') {
    if (reason === 'not_allowed_for_vertical') return 'INVALID_TRANSACTION_TYPE';
    if (reason === 'invalid_transaction_type') return 'INVALID_TRANSACTION_TYPE';
    return 'INVALID_TRANSACTION_TYPE';
  }
  if (reason.includes('confidence')) return 'LOW_CONFIDENCE';
  if (typeof value === 'string' && value.includes('slug')) return 'INVALID_SLUG';
  return 'OTHER';
}

export interface RejectAnalysisRow {
  reason: RejectReasonCategory;
  count: number;
  percentage: number;
}

export interface RejectAnalysisReport {
  total: number;
  rows: RejectAnalysisRow[];
  windowHours: number;
}

function pct(count: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

export async function persistRejectEvent(input: {
  field: string;
  value: unknown;
  reason: string;
  provider?: string | null;
}): Promise<void> {
  try {
    const category = classifyRejectReason(input.field, input.reason, input.value);
    await db.intakeValidationRejectEvent.create({
      data: {
        reason: category,
        field: input.field,
        value: String(input.value ?? ''),
        detail: input.reason,
        provider: input.provider ?? null,
      },
    });
  } catch (error) {
    console.error('[RejectAnalysis] persist failed:', error);
  }
}

export function persistRejectEventAsync(input: {
  field: string;
  value: unknown;
  reason: string;
  provider?: string | null;
}): void {
  void persistRejectEvent(input);
}

export async function buildRejectAnalysisReport(
  windowHours: number
): Promise<RejectAnalysisReport> {
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
  const events = await db.intakeValidationRejectEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { reason: true },
  });

  const total = events.length;
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.reason, (counts.get(e.reason) ?? 0) + 1);
  }

  const rows: RejectAnalysisRow[] = [...counts.entries()]
    .map(([reason, count]) => ({
      reason: reason as RejectReasonCategory,
      count,
      percentage: pct(count, total),
    }))
    .sort((a, b) => b.count - a.count);

  return { total, rows, windowHours };
}

export async function buildRejectAnalysisDashboard() {
  const [h24, d7, d30] = await Promise.all([
    buildRejectAnalysisReport(24),
    buildRejectAnalysisReport(24 * 7),
    buildRejectAnalysisReport(24 * 30),
  ]);
  return { h24, d7, d30 };
}
