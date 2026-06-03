'use client';

import { cn } from '@/lib/utils';
import { heatColor, formatMetricValue } from '@/lib/geo/heatmap-scale';
import type { HeatmapMetric } from '@/lib/geo/types';
import type { GeoCountRow } from '@/lib/geo/types';

export function GeoMapTooltip({
  label,
  value,
  sharePct,
  metric = 'sessions',
  compareDelta,
  className,
}: {
  label: string;
  value: number;
  sharePct?: number;
  metric?: HeatmapMetric;
  compareDelta?: number | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-(--color-mainBorder) bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm',
        className
      )}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-0.5 tabular-nums">{formatMetricValue(value, metric)}</p>
      {sharePct != null && (
        <p className="text-(--color-secondaryText)">{sharePct.toLocaleString('fa-IR')}٪ از کل</p>
      )}
      {compareDelta != null && (
        <p className={compareDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
          {compareDelta >= 0 ? '+' : ''}
          {compareDelta.toLocaleString('fa-IR')}٪ نسبت به دوره قبل
        </p>
      )}
    </div>
  );
}

export function GeoMapLegend({
  min,
  max,
  metric = 'sessions',
  compareMode,
  className,
}: {
  min: number;
  max: number;
  metric?: HeatmapMetric;
  compareMode?: boolean;
  className?: string;
}) {
  if (compareMode) {
    return (
      <div className={cn('flex items-center gap-3 text-xs text-(--color-secondaryText)', className)}>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-emerald-500" /> رشد
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-rose-500" /> افت
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-3 rounded bg-slate-200" /> بدون تغییر
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <span>{formatMetricValue(min, metric)}</span>
      <div
        className="h-2 flex-1 rounded-full"
        style={{
          background: `linear-gradient(to left, ${heatColor(max, max, metric)}, ${heatColor(0, max, metric)})`,
        }}
      />
      <span>{formatMetricValue(max, metric)}</span>
    </div>
  );
}

export function buildCountMap(rows: GeoCountRow[]): Map<string, GeoCountRow> {
  const map = new Map<string, GeoCountRow>();
  for (const row of rows) {
    map.set(row.key, row);
    map.set(row.label, row);
  }
  return map;
}
