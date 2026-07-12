/**
 * PVW I/O boundary — the only writer of CcqsMetricSnapshot/CcqsAlertEvent rows and the reader of
 * shadow events for Pillar B. Pure modules (bucketer/trends/alerts) never touch the database;
 * this file never computes a metric (the same split as read-replay-records.ts vs. the aggregator).
 * Append-only: no UPDATE statement exists in this file, and must never (CCQS §9 / MEI-08).
 */
import { db } from '@/lib/db';
import { comparisonReportSchema } from '@/semantic-evaluation-engine/types';
import type { EngineVersionManifest, QualityMetricSnapshot } from '../types';
import type { ParsedShadowEventForMetrics } from './bucket-production-metrics';
import { WINDOW_SPEC_VERSION, type AlertDraft, type ProductionMetricSnapshot } from './types';

/** Pillar B input: parse CognitiveEngineShadowComparison events in [bucketStart, bucketEnd).
 *  "No silent caps" (workflow discipline + PVW's own honesty rules): raw/usable/excluded counts
 *  are returned so a bucket over pre-SEE-rewire history (payloads without a comparisonReport)
 *  reads as "41 raw, 0 usable", never as a fabricated-clean "0 events". */
export async function readShadowEventsForWindow(
  bucketStart: Date,
  bucketEnd: Date
): Promise<{ events: ParsedShadowEventForMetrics[]; rawCount: number; excludedNoReport: number; excludedMalformed: number }> {
  const rows = await db.intakeMigrationEvent.findMany({
    where: { type: 'CognitiveEngineShadowComparison', createdAt: { gte: bucketStart, lt: bucketEnd } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // deterministic total order (audit §1.2's createdAt-tie caution)
    select: { payload: true },
  });
  const events: ParsedShadowEventForMetrics[] = [];
  let excludedNoReport = 0;
  let excludedMalformed = 0;
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as { comparisonReport?: unknown; engineVersion?: { label?: string } };
      if (!parsed.comparisonReport) {
        excludedNoReport++; // pre-SEE-rewire events carry no report
        continue;
      }
      events.push({
        comparisonReport: comparisonReportSchema.parse(parsed.comparisonReport),
        engineLabel: parsed.engineVersion?.label ?? null,
      });
    } catch {
      excludedMalformed++; // excluded, not repaired
    }
  }
  return { events, rawCount: rows.length, excludedNoReport, excludedMalformed };
}

export async function persistGoldenSnapshot(
  metrics: QualityMetricSnapshot,
  manifest: EngineVersionManifest
): Promise<string> {
  const row = await db.ccqsMetricSnapshot.create({
    data: {
      pillar: 'golden',
      windowSpecVersion: WINDOW_SPEC_VERSION,
      replayRunId: metrics.replayRunId,
      metrics: JSON.stringify(metrics),
      engineLabel: manifest.label,
      cognitiveEngineVersion: manifest.cognitiveEngineVersion,
      rulesRegistryVersion: manifest.rulesRegistryVersion,
      comparatorEngineVersion: manifest.comparatorEngineVersion,
    },
  });
  return row.id;
}

export async function persistProductionSnapshot(snapshot: ProductionMetricSnapshot): Promise<string> {
  const row = await db.ccqsMetricSnapshot.create({
    data: {
      pillar: 'production',
      windowSpecVersion: snapshot.windowSpecVersion,
      bucketStart: snapshot.bucketStart,
      bucketEnd: snapshot.bucketEnd,
      metrics: JSON.stringify(snapshot),
      // Engine lineage columns stay null unless the bucket saw exactly one stamped label —
      // a bucket spanning a deploy genuinely has no single version (PVW §2.3's honest nullability).
      engineLabel: snapshot.engineLabelsSeen.length === 1 ? snapshot.engineLabelsSeen[0] : null,
    },
  });
  return row.id;
}

export async function persistAlertDrafts(drafts: AlertDraft[]): Promise<string[]> {
  const ids: string[] = [];
  for (const d of drafts) {
    const row = await db.ccqsAlertEvent.create({
      data: {
        alertPolicyId: d.alertPolicyId,
        alertPolicyVersion: d.alertPolicyVersion,
        alertKey: d.alertKey,
        severity: d.severity,
        detail: JSON.stringify(d.detail),
        sourceSnapshotIds: JSON.stringify(d.sourceSnapshotIds),
      },
    });
    ids.push(row.id);
  }
  return ids;
}

/** Read persisted snapshots for trend/alert evaluation (ascending, deterministic order). */
export async function readMetricSnapshots(pillar: 'golden' | 'production', limit = 60) {
  return db.ccqsMetricSnapshot.findMany({
    where: { pillar },
    orderBy: [{ computedAt: 'asc' }, { id: 'asc' }],
    take: -limit,
  });
}
