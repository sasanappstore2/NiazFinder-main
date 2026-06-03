'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { getNationalLayout, loadProvinceCityLayout } from '@/lib/geo/geo-index';
import type { GeoCountRow, GeoMapLevel, HeatmapMetric, ProvinceCityLayout } from '@/lib/geo/types';
import { IRAN_VIEW } from '@/lib/geo/types';
import { NationalHexLayer } from '@/components/admin/analytics/geo/NationalHexLayer';
import { ProvinceBoundaryLayer } from '@/components/admin/analytics/geo/ProvinceBoundaryLayer';
import { CityHexLayer } from '@/components/admin/analytics/geo/CityHexLayer';
import { GeoMapTooltip, GeoMapLegend, buildCountMap } from '@/components/admin/analytics/geo/GeoMapTooltip';
import { GeoBreadcrumb } from '@/components/admin/analytics/geo/GeoBreadcrumb';
import { labelForProvince, labelForCity } from '@/lib/geo/geo-index';

export function IranHoneycombMap({
  rows,
  cityRows = [],
  metric = 'sessions',
  compareMode = false,
  marketOverlay = 'all',
  selectedProvince,
  selectedCity,
  onProvinceSelect,
  onCitySelect,
  onLevelChange,
  className,
}: {
  rows: GeoCountRow[];
  cityRows?: GeoCountRow[];
  metric?: HeatmapMetric;
  compareMode?: boolean;
  marketOverlay?: 'all' | 'need' | 'business';
  selectedProvince: string | null;
  selectedCity: string | null;
  onProvinceSelect: (id: string | null) => void;
  onCitySelect: (id: string | null) => void;
  onLevelChange?: (level: GeoMapLevel) => void;
  className?: string;
}) {
  const layout = useMemo(() => getNationalLayout(), []);
  const [hoverProvince, setHoverProvince] = useState<string | null>(null);
  const [hoverCity, setHoverCity] = useState<string | null>(null);
  const [provinceLayout, setProvinceLayout] = useState<ProvinceCityLayout | null>(null);
  const [loadingProvince, setLoadingProvince] = useState(false);

  const level: GeoMapLevel = selectedCity ? 'city' : selectedProvince ? 'province' : 'country';

  useEffect(() => {
    onLevelChange?.(level);
  }, [level, onLevelChange]);

  useEffect(() => {
    if (!selectedProvince) {
      setProvinceLayout(null);
      return;
    }
    setLoadingProvince(true);
    void loadProvinceCityLayout(selectedProvince).then((l) => {
      setProvinceLayout(l);
      setLoadingProvince(false);
    });
  }, [selectedProvince]);

  const countMap = buildCountMap(rows);
  const cityCountMap = buildCountMap(cityRows);
  const max = Math.max(...rows.map((r) => r.value), 1);

  const activeProvince = selectedProvince ?? hoverProvince;
  const activeCell = activeProvince ? layout.cells.find((c) => c.id === activeProvince) : null;

  const tooltipRow = hoverCity
    ? cityCountMap.get(hoverCity)
    : activeProvince
      ? countMap.get(activeProvince)
      : hoverProvince
        ? countMap.get(hoverProvince)
        : null;

  const tooltipLabel = hoverCity
    ? labelForCity(hoverCity)
    : activeProvince
      ? labelForProvince(activeProvince)
      : hoverProvince
        ? labelForProvince(hoverProvince)
        : '';

  const handleNavigate = (target: GeoMapLevel, province?: string | null, city?: string | null) => {
    if (target === 'country') {
      onProvinceSelect(null);
      onCitySelect(null);
    } else if (target === 'province') {
      onProvinceSelect(province ?? null);
      onCitySelect(null);
    }
  };

  const provinceViewBox = provinceLayout?.viewBox ?? { width: 600, height: 400 };

  return (
    <div className={cn('space-y-3', className)}>
      <GeoBreadcrumb
        level={level}
        provinceId={selectedProvince}
        cityId={selectedCity}
        onNavigate={handleNavigate}
      />

      <div className="relative">
        {level === 'province' && provinceLayout ? (
          <svg
            viewBox={`0 0 ${provinceViewBox.width} ${provinceViewBox.height}`}
            className="h-auto w-full max-h-[420px] rounded-xl border border-(--color-mainBorder) bg-slate-50/50 dark:bg-slate-900/30"
            role="img"
            aria-label={`نقشه شهرهای ${labelForProvince(selectedProvince!)}`}
          >
            {provinceLayout.boundaryPath && (
              <path
                d={provinceLayout.boundaryPath}
                fill="rgb(226 232 240 / 0.4)"
                stroke="rgb(148 163 184)"
                strokeWidth={1}
                transform={`scale(${IRAN_VIEW.width / provinceViewBox.width}, ${IRAN_VIEW.height / provinceViewBox.height})`}
              />
            )}
            <CityHexLayer
              cities={provinceLayout.cities}
              rows={cityRows}
              metric={metric}
              selectedId={selectedCity}
              hoverId={hoverCity}
              compareMode={compareMode}
              onSelect={onCitySelect}
              onHover={setHoverCity}
            />
          </svg>
        ) : (
          <svg
            viewBox={`0 0 ${IRAN_VIEW.width} ${IRAN_VIEW.height}`}
            className="h-auto w-full max-h-[420px] rounded-xl border border-(--color-mainBorder) bg-slate-50/50 dark:bg-slate-900/30"
            role="img"
            aria-label="نقشه لانه‌زنبوری استان‌های ایران"
          >
            <NationalHexLayer
              cells={layout.cells}
              rows={rows}
              metric={metric}
              selectedId={selectedProvince}
              hoverId={hoverProvince}
              compareMode={compareMode}
              onSelect={(id) => {
                onProvinceSelect(id);
                onCitySelect(null);
              }}
              onHover={setHoverProvince}
            />
            {selectedProvince && activeCell && (
              <ProvinceBoundaryLayer
                cell={activeCell}
                rows={rows}
                metric={metric}
                compareMode={compareMode}
                showBoundary
              />
            )}
          </svg>
        )}

        {loadingProvince && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/50 text-sm">
            در حال بارگذاری شهرها…
          </div>
        )}

        {tooltipRow && tooltipLabel && (
          <GeoMapTooltip
            className="absolute bottom-2 left-2"
            label={tooltipLabel}
            value={tooltipRow.value}
            sharePct={tooltipRow.sharePct}
            metric={metric}
            compareDelta={tooltipRow.compareDelta}
          />
        )}
      </div>

      <GeoMapLegend min={0} max={max} metric={metric} compareMode={compareMode} />

      {marketOverlay !== 'all' && (
        <p className="text-xs text-(--color-secondaryText)">
          فیلتر بازار: {marketOverlay === 'need' ? 'نیاز' : 'کسب‌وکار'}
        </p>
      )}
    </div>
  );
}
