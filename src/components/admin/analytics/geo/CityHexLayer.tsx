'use client';

import { heatColor } from '@/lib/geo/heatmap-scale';
import type { CityHexCell, HeatmapMetric, GeoCountRow } from '@/lib/geo/types';
import { buildCountMap } from '@/components/admin/analytics/geo/GeoMapTooltip';

export function CityHexLayer({
  cities,
  rows,
  metric,
  selectedId,
  hoverId,
  compareMode,
  onSelect,
  onHover,
}: {
  cities: CityHexCell[];
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
      {cities.map((city) => {
        const row = countMap.get(city.id);
        const value = row?.value ?? 0;
        const active = selectedId === city.id || hoverId === city.id;
        const fill = compareMode
          ? heatColor(value, max, metric, row?.compareDelta)
          : heatColor(value, max, metric);

        return (
          <path
            key={city.id}
            d={city.hexPath}
            fill={fill}
            stroke={active ? 'var(--color-primary)' : 'rgb(148 163 184)'}
            strokeWidth={active ? 2 : 0.8}
            className="cursor-pointer transition-all"
            onMouseEnter={() => onHover(city.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(selectedId === city.id ? null : city.id)}
          />
        );
      })}
    </g>
  );
}
