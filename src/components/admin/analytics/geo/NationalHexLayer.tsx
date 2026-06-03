'use client';

import { heatColor } from '@/lib/geo/heatmap-scale';
import type { HeatmapMetric } from '@/lib/geo/types';
import type { HexCell } from '@/lib/geo/types';
import { buildCountMap } from '@/components/admin/analytics/geo/GeoMapTooltip';
import type { GeoCountRow } from '@/lib/geo/types';

export function NationalHexLayer({
  cells,
  rows,
  metric,
  selectedId,
  hoverId,
  compareMode,
  onSelect,
  onHover,
}: {
  cells: HexCell[];
  rows: GeoCountRow[];
  metric: HeatmapMetric;
  selectedId: string | null;
  hoverId: string | null;
  compareMode?: boolean;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}) {
  const countMap = buildCountMap(rows);
  const max = Math.max(...rows.map((r) => r.value), 1);

  return (
    <g>
      {cells.map((cell) => {
        const row = countMap.get(cell.id);
        const value = row?.value ?? 0;
        const active = selectedId === cell.id || hoverId === cell.id;
        const fill = compareMode
          ? heatColor(value, max, metric, row?.compareDelta)
          : heatColor(value, max, metric);

        return (
          <g key={cell.id}>
            <path
              d={cell.hexPath}
              fill={fill}
              stroke={active ? 'var(--color-primary)' : 'rgb(148 163 184)'}
              strokeWidth={active ? 2.5 : 1}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => onHover(cell.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(selectedId === cell.id ? null : cell.id)}
              role="button"
              tabIndex={0}
              aria-label={cell.name}
            />
            {active && (
              <text
                x={cell.cx}
                y={cell.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none fill-foreground text-[9px] font-medium"
              >
                {cell.name}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
