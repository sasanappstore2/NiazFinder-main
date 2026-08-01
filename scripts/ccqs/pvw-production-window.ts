/**
 * PVW Pillar B — Continuous Production Shadow Aggregation (PVW §2.1/§2.2 module 2; closes gaps
 * G1/G3/G6/G7 for the production side). Buckets one UTC day of CognitiveEngineShadowComparison
 * events into a ProductionMetricSnapshot (ground-truth-free AGREEMENT metrics, never "accuracy" —
 * PVW §2.1), persists it, prints the deterministic trend report, evaluates and persists Pillar-B
 * alerts against the rolling window (PVW §5).
 *
 * Run via: npm run ccqs:pvw:production-window            (defaults to yesterday UTC)
 *          npm run ccqs:pvw:production-window -- 2026-07-08
 */
import { db } from '@/lib/db';
import { utcDayBucket, WINDOW_SPEC_VERSION, type ProductionMetricSnapshot } from '@/ccqs/pvw/types';
import { bucketProductionMetrics } from '@/ccqs/pvw/bucket-production-metrics';
import { detectTrends, type TrendInputSnapshot } from '@/ccqs/pvw/detect-trends';
import { DEFAULT_ALERT_POLICY, evaluateProductionAlerts } from '@/ccqs/pvw/evaluate-alerts';
import { persistAlertDrafts, persistProductionSnapshot, readMetricSnapshots, readShadowEventsForWindow } from '@/ccqs/pvw/pvw-io';

function defaultDay(): string {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const day = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2]) ? process.argv[2] : defaultDay();
  const { bucketStart, bucketEnd } = utcDayBucket(day);

  const { events, rawCount, excludedNoReport, excludedMalformed } = await readShadowEventsForWindow(bucketStart, bucketEnd);
  const snapshot = bucketProductionMetrics(events, bucketStart, bucketEnd);
  console.log(
    `[pvw-pillar-b] ${day}: ${rawCount} raw events, ${snapshot.totalEvents} usable` +
      (excludedNoReport ? `, ${excludedNoReport} pre-SEE-rewire (no comparisonReport)` : '') +
      (excludedMalformed ? `, ${excludedMalformed} malformed` : '') +
      ` (windowSpec ${WINDOW_SPEC_VERSION})`
  );
  console.log(JSON.stringify({ agreementRateByField: snapshot.agreementRateByField, ambiguousRate: snapshot.ambiguousRate, mismatchRate: snapshot.mismatchRate, refinementRate: snapshot.refinementRate, topFailureReasons: snapshot.topFailureReasons, engineLabelsSeen: snapshot.engineLabelsSeen }, null, 2));

  const snapshotId = await persistProductionSnapshot(snapshot);
  console.log(`[pvw-pillar-b] production snapshot persisted: ${snapshotId}`);

  // Prior daily snapshots (ascending), excluding the one just written.
  const rows = (await readMetricSnapshots('production', 60)).filter((r) => r.id !== snapshotId);
  const prior = rows
    .filter((r) => r.bucketStart !== null && r.bucketStart < bucketStart)
    .map((r) => ({ snapshotId: r.id, metrics: JSON.parse(r.metrics) as ProductionMetricSnapshot }));

  // Deterministic trend report (explicit asOf = this bucket's end — replayable, PVW §4).
  const trendInputs: TrendInputSnapshot[] = [...prior, { snapshotId, metrics: snapshot }].map((s) => ({
    snapshotId: s.snapshotId,
    at: s.metrics.bucketStart,
    values: {
      ambiguousRate: s.metrics.ambiguousRate,
      mismatchRate: s.metrics.mismatchRate,
      refinementRate: s.metrics.refinementRate,
      categoryAgreement: s.metrics.agreementRateByField['category'] ?? null,
      locationAgreement: s.metrics.agreementRateByField['location'] ?? null,
    },
  }));
  const trends = detectTrends('production', trendInputs, ['ambiguousRate', 'mismatchRate', 'categoryAgreement', 'locationAgreement'], snapshot.bucketEnd);
  console.log('\n=== TrendReport ===');
  for (const w of trends.windows.filter((w) => w.sampleCount > 0)) {
    console.log(`  ${w.metricKey} [${w.windowLabel}] start=${w.startValue?.toFixed(4) ?? '—'} end=${w.endValue?.toFixed(4) ?? '—'} delta=${w.delta?.toFixed(4) ?? '—'} rolling7=${w.rollingAverage?.toFixed(4) ?? '—'} n=${w.sampleCount}`);
  }

  const alerts = evaluateProductionAlerts(DEFAULT_ALERT_POLICY, { snapshotId, metrics: snapshot }, prior);
  if (alerts.length) {
    const ids = await persistAlertDrafts(alerts);
    for (let i = 0; i < alerts.length; i++) console.log(`[pvw-pillar-b] ALERT ${alerts[i]!.severity.toUpperCase()} ${alerts[i]!.alertKey} → CcqsAlertEvent ${ids[i]}`);
    process.exitCode = 1;
  } else {
    console.log('\n[pvw-pillar-b] no alerts.');
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
