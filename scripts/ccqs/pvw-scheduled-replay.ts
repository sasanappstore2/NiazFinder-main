/**
 * PVW Pillar A — Scheduled Golden Replay (PVW §2.1/§2.2 module 1; closes gap G9: the first real
 * caller of `triggeredBy: 'scheduled'`). Runs the unchanged golden replay, persists the run,
 * gate verdict (MEI-01), and a golden CcqsMetricSnapshot; then release-compares against the
 * previous golden run (same datasetRef — MEI-03) and evaluates/persists Pillar-A alerts
 * ('category-accuracy-drop', 'rule-regression' — PVW §5).
 *
 * Invocation mechanism (cron / launchd / CI schedule) is deployment infrastructure, out of scope
 * by design (PVW §2.2): this script only needs to be callable from one.
 *
 * Run via: npm run ccqs:pvw:scheduled-replay
 */
import { execSync } from 'child_process';
import { db } from '@/lib/db';
import { GOLDEN_DATASET_V1, GOLDEN_DATASET_REF } from '@/ccqs/golden-dataset';
import { currentEngineVersionManifest } from '@/ccqs/engine-version/current-engine-version';
import { runGoldenReplay } from '@/ccqs/replay/run-golden-replay';
import { readReplayRecords } from '@/ccqs/replay/read-replay-records';
import { aggregateQualityMetrics } from '@/ccqs/metrics/aggregate-quality-metrics';
import { compareReplayRuns } from '@/ccqs/compare/compare-replay-runs';
import { evaluateGate } from '@/ccqs/gate/evaluate-gate';
import { DEFAULT_GATE_POLICY } from '@/ccqs/gate/default-gate-policy';
import { persistGateVerdict } from '@/ccqs/gate/persist-gate-verdict';
import { checkRunCompleteness } from '@/ccqs/gate/run-integrity';
import { DEFAULT_ALERT_POLICY, evaluateGoldenAlerts } from '@/ccqs/pvw/evaluate-alerts';
import { persistGoldenSnapshot, persistAlertDrafts } from '@/ccqs/pvw/pvw-io';

function gitCommit(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const now = new Date().toISOString();
  const label = `scheduled-${now.slice(0, 10)}`;
  const engineVersion = currentEngineVersionManifest({ label, gitCommit: gitCommit(), now });

  console.log(`[pvw-pillar-a] scheduled replay "${label}"`);
  const { replayRunId, recordCount, skippedCaseIds } = await runGoldenReplay({
    engineVersion,
    dataset: GOLDEN_DATASET_V1,
    datasetRef: GOLDEN_DATASET_REF,
    triggeredBy: 'scheduled',
  });
  console.log(`[pvw-pillar-a] ReplayRun ${replayRunId}: ${recordCount} recorded, ${skippedCaseIds.length} skipped`);

  const completeness = checkRunCompleteness(skippedCaseIds);
  console.log(`[${completeness.meiId}] ${completeness.passed ? 'OK' : 'BLOCKED'}: ${completeness.detail}`);
  if (!completeness.passed) {
    // Scheduled runs never "disclose" skips — an unattended run with skips is a signal, not a
    // judgment call. The run stays persisted for investigation; no snapshot, no gate, exit 2.
    process.exitCode = 2;
    return;
  }

  const records = await readReplayRecords(replayRunId);
  const metrics = aggregateQualityMetrics(replayRunId, records, new Date().toISOString());
  const verdict = evaluateGate(metrics, DEFAULT_GATE_POLICY, { replayRunId, decidedAt: new Date().toISOString() });
  const verdictRowId = await persistGateVerdict(verdict, DEFAULT_GATE_POLICY);
  const snapshotId = await persistGoldenSnapshot(metrics, engineVersion);
  console.log(`[pvw-pillar-a] verdict=${verdict.verdict} (row ${verdictRowId}), golden snapshot ${snapshotId}`);

  // Release comparison vs. the previous completed golden run on the SAME dataset (MEI-03 by query).
  const prevRun = await db.ccqsReplayRun.findFirst({
    where: { status: 'completed', datasetRef: GOLDEN_DATASET_REF, id: { not: replayRunId } },
    orderBy: { completedAt: 'desc' },
  });
  if (!prevRun) {
    console.log('[pvw-pillar-a] no prior run to compare against — first scheduled run, no alerts evaluable.');
    return;
  }
  const prevRecords = await readReplayRecords(prevRun.id);
  const prevMetrics = aggregateQualityMetrics(prevRun.id, prevRecords, new Date().toISOString());
  const comparison = compareReplayRuns(prevRun.id, prevRecords, prevMetrics, replayRunId, records, metrics);
  console.log(`[pvw-pillar-a] vs ${prevRun.id}: improved=${comparison.improvedCount} regressed=${comparison.regressedCount}`);

  const prevSnapshot = await db.ccqsMetricSnapshot.findFirst({ where: { pillar: 'golden', replayRunId: prevRun.id }, orderBy: { computedAt: 'desc' } });
  const alerts = evaluateGoldenAlerts(
    DEFAULT_ALERT_POLICY,
    { snapshotId, metrics },
    { snapshotId: prevSnapshot?.id ?? prevRun.id, metrics: prevMetrics },
    comparison
  );
  if (alerts.length) {
    const ids = await persistAlertDrafts(alerts);
    for (let i = 0; i < alerts.length; i++) console.log(`[pvw-pillar-a] ALERT ${alerts[i]!.severity.toUpperCase()} ${alerts[i]!.alertKey} → CcqsAlertEvent ${ids[i]}`);
    process.exitCode = 1;
  } else {
    console.log('[pvw-pillar-a] no alerts.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
