/**
 * I/O boundary: reads persisted `CcqsComparisonRecord` rows for a `ReplayRun` and parses their
 * JSON columns back into SEE/CCQS types. Kept separate from the pure aggregation/comparison
 * functions in `metrics/` and `compare/` on purpose — those never touch the database directly.
 */
import { db } from '@/lib/db';
import { comparisonReportSchema } from '@/semantic-evaluation-engine/types';
import { ruleTraceEntrySchema } from '../types';
import type { ParsedComparisonRecordForMetrics } from '../metrics/aggregate-quality-metrics';

export async function readReplayRecords(replayRunId: string): Promise<ParsedComparisonRecordForMetrics[]> {
  const rows = await db.ccqsComparisonRecord.findMany({
    where: { replayRunId },
    orderBy: { createdAt: 'asc' },
  });

  return rows.map((row) => ({
    caseId: row.caseId,
    comparisonReport: comparisonReportSchema.parse(JSON.parse(row.comparisonReport)),
    ruleTrace: JSON.parse(row.ruleTrace).map((rt: unknown) => ruleTraceEntrySchema.parse(rt)),
  }));
}
