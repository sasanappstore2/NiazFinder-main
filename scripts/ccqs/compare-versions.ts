/**
 * Permanent CCQS CLI entry point — CCQS §5/§11 (`PLAN/ccqs-architecture.md`). Compares two
 * ReplayRuns and prints a VersionComparisonReport — the automated version of this session's manual
 * before/after analysis.
 *
 * Run via: npm run ccqs:compare -- <replayRunIdA> <replayRunIdB>
 */
import { db } from '@/lib/db';
import { readReplayRecords } from '@/ccqs/replay/read-replay-records';
import { aggregateQualityMetrics } from '@/ccqs/metrics/aggregate-quality-metrics';
import { compareReplayRuns } from '@/ccqs/compare/compare-replay-runs';
import { checkDatasetRefEquality } from '@/ccqs/gate/run-integrity';

async function main(): Promise<void> {
  const [runAId, runBId] = process.argv.slice(2);
  if (!runAId || !runBId) {
    console.error('Usage: npm run ccqs:compare -- <replayRunIdA> <replayRunIdB>');
    process.exit(1);
  }

  // MEI-03 (RFC-005 §17 / CIF-INV-07): deltas across different datasets are non-comparable.
  const [runA, runB] = await Promise.all([
    db.ccqsReplayRun.findUniqueOrThrow({ where: { id: runAId }, select: { datasetRef: true } }),
    db.ccqsReplayRun.findUniqueOrThrow({ where: { id: runBId }, select: { datasetRef: true } }),
  ]);
  const refCheck = checkDatasetRefEquality(runA.datasetRef, runB.datasetRef);
  console.log(`[${refCheck.meiId}] ${refCheck.passed ? 'OK' : 'BLOCKED'}: ${refCheck.detail}`);
  if (!refCheck.passed) {
    process.exit(2);
  }

  const [recordsA, recordsB] = await Promise.all([readReplayRecords(runAId!), readReplayRecords(runBId!)]);
  const metricsA = aggregateQualityMetrics(runAId!, recordsA, new Date().toISOString());
  const metricsB = aggregateQualityMetrics(runBId!, recordsB, new Date().toISOString());

  const report = compareReplayRuns(runAId!, recordsA, metricsA, runBId!, recordsB, metricsB);

  console.log('=== VersionComparisonReport ===');
  console.log(`improved=${report.improvedCount} regressed=${report.regressedCount} unchanged=${report.unchangedCount}`);
  console.log('\nMetric deltas:');
  console.log(JSON.stringify(report.metricDeltas, null, 2));

  const interesting = report.caseDiffs.filter((d) => d.classification !== 'unchanged');
  console.log(`\n${interesting.length} case/field diffs (excluding unchanged):`);
  for (const d of interesting) {
    console.log(`  [${d.classification}] ${d.caseId}/${d.fieldId}: ${d.before?.reasonCode ?? '—'} -> ${d.after?.reasonCode ?? '—'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
