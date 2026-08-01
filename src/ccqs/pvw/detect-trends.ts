/**
 * Trend Detector — PVW §4. Deterministic BY CONSTRUCTION: takes an explicit `asOf` timestamp and
 * an explicit, caller-supplied snapshot list; never calls "now" internally. Same inputs →
 * byte-identical TrendReport, making every trend report a replayable artifact (PVW §4's
 * requirement, mirroring SEE INV-01's determinism at the trend layer).
 *
 * Control charts are deliberately absent (PVW §4.3's verdict: not appropriate for Pillar A at
 * all; premature for Pillar B until real per-day volume accumulates a baseline variance).
 */
import { WINDOW_SPEC_VERSION, type TrendReport, type TrendWindow } from './types';

export interface TrendInputSnapshot {
  snapshotId: string;
  /** Golden: replay completedAt. Production: bucketStart. ISO string. */
  at: string;
  /** Flat metric values extracted by the caller (e.g. {categoryAccuracy: 0.93, ambiguousRate: 0.04}). */
  values: Record<string, number | null>;
}

const WINDOWS: Array<{ label: TrendWindow['windowLabel']; ms: number }> = [
  { label: 'last-day', ms: 24 * 60 * 60 * 1000 },
  { label: 'last-week', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: 'last-month', ms: 30 * 24 * 60 * 60 * 1000 },
];
const ROLLING_N = 7;

export function detectTrends(
  pillar: 'golden' | 'production',
  snapshots: TrendInputSnapshot[],
  metricKeys: string[],
  asOf: string
): TrendReport {
  const asOfMs = new Date(asOf).getTime();
  if (Number.isNaN(asOfMs)) throw new Error(`Invalid asOf "${asOf}"`);
  const ordered = [...snapshots]
    .filter((s) => new Date(s.at).getTime() <= asOfMs)
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime() || (a.snapshotId < b.snapshotId ? -1 : 1));

  const windows: TrendWindow[] = [];
  for (const metricKey of metricKeys) {
    for (const w of WINDOWS) {
      const inWindow = ordered.filter((s) => new Date(s.at).getTime() > asOfMs - w.ms);
      const series = inWindow.map((s) => s.values[metricKey]).filter((v): v is number => v !== null && v !== undefined);
      const rollingSeries = ordered
        .map((s) => s.values[metricKey])
        .filter((v): v is number => v !== null && v !== undefined)
        .slice(-ROLLING_N);
      windows.push({
        metricKey,
        windowLabel: w.label,
        startValue: series.length ? series[0]! : null,
        endValue: series.length ? series[series.length - 1]! : null,
        delta: series.length >= 2 ? series[series.length - 1]! - series[0]! : null,
        rollingAverage: rollingSeries.length ? rollingSeries.reduce((a, b) => a + b, 0) / rollingSeries.length : null,
        sampleCount: series.length,
      });
    }
  }
  return { asOf, windowSpecVersion: WINDOW_SPEC_VERSION, pillar, windows };
}
