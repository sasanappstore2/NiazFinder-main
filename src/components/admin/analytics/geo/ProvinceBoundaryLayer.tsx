'use client';

import type { HexCell } from '@/lib/geo/types';
import { heatColor } from '@/lib/geo/heatmap-scale';
import type { HeatmapMetric, GeoCountRow } from '@/lib/geo/types';
import { buildCountMap } from '@/components/admin/analytics/geo/GeoMapTooltip';

export function ProvinceBoundaryLayer({
  cell,
  rows,
  metric,
  compareMode,
  showBoundary,
}: {
  cell: HexCell;
  rows: GeoCountRow[];
  metric: HeatmapMetric;
  compareMode?: boolean;
  showBoundary: boolean;
}) {
  const countMap = buildCountMap(rows);
  const row = countMap.get(cell.id);
  const max = Math.max(...rows.map((r) => r.value), 1);
  const fill = compareMode
    ? heatColor(row?.value ?? 0, max, metric, row?.compareDelta)
    : heatColor(row?.value ?? 0, max, metric);

  if (!showBoundary) return null;

  const path = cell.hexLocalPath ?? cell.boundaryPath ?? cell.hexPath;

  return (
    <path
      d={path}
      fill={fill}
      stroke="var(--color-primary)"
      strokeWidth={2}
      className="transition-all duration-300 ease-out"
      style={{ transformOrigin: `${cell.cx}px ${cell.cy}px` }}
    />
  );
}
