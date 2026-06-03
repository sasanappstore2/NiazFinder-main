'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { AdminChartCard } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { IranHoneycombMap } from '@/components/admin/analytics/geo/IranHoneycombMap';
import { GeoStatsPanel } from '@/components/admin/analytics/geo/GeoStatsPanel';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { GeoDetailKpi, HeatmapMetric } from '@/lib/geo/types';
import { HEATMAP_METRIC_LABELS } from '@/lib/geo/types';
import type { TrafficAnalyticsCountRow, TrafficAnalyticsGeo } from '@/components/admin/modules/shared/types';
import { labelForProvince, labelForCity } from '@/lib/geo/geo-index';

type GeoData = {
  province: TrafficAnalyticsGeo;
  city: TrafficAnalyticsGeo;
};

const METRICS: HeatmapMetric[] = ['sessions', 'pageViews', 'uniqueVisitors', 'bounceRate', 'conversionRate'];

export function GeoTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<GeoData>('geo');
  const [metric, setMetric] = useState<HeatmapMetric>('sessions');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [cityRows, setCityRows] = useState<TrafficAnalyticsGeo | null>(null);
  const [loadingCity, setLoadingCity] = useState(false);
  const [detail, setDetail] = useState<GeoDetailKpi | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCities = useCallback(
    async (provinceId: string) => {
      setLoadingCity(true);
      try {
        const res = await hub.fetchGeoCitiesFull(provinceId, metric);
        setCityRows(res);
      } finally {
        setLoadingCity(false);
      }
    },
    [hub, metric]
  );

  const loadDetail = useCallback(
    async (province: string | null, city: string | null) => {
      setLoadingDetail(true);
      try {
        const kpi = await hub.fetchGeoDetail(province, city);
        setDetail(kpi);
      } finally {
        setLoadingDetail(false);
      }
    },
    [hub]
  );

  useEffect(() => {
    if (selectedProvince) void loadCities(selectedProvince);
    else setCityRows(null);
  }, [selectedProvince, metric, loadCities]);

  useEffect(() => {
    void loadDetail(selectedProvince, selectedCity);
  }, [selectedProvince, selectedCity, hub.filters, loadDetail]);

  const handleProvinceSelect = (id: string | null) => {
    setSelectedProvince(id);
    setSelectedCity(null);
  };

  const exportMapPng = () => {
    const svg = document.querySelector('[aria-label*="نقشه"]') as SVGSVGElement | null;
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iran-geo-map.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (hub.isTabLoading('geo') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  const tableRows = cityRows?.rows ?? (selectedProvince ? [] : data.city.rows.slice(0, 50));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {METRICS.map((m) => (
          <Button
            key={m}
            size="sm"
            variant={metric === m ? 'default' : 'outline'}
            onClick={() => setMetric(m)}
          >
            {HEATMAP_METRIC_LABELS[m]}
          </Button>
        ))}
        <Button size="sm" variant="ghost" className="mr-auto gap-1.5" onClick={exportMapPng}>
          <Download className="size-4" />
          SVG
        </Button>
      </div>

      <IranHoneycombMap
        rows={data.province.rows.map((r) => ({ ...r }))}
        cityRows={(cityRows?.rows ?? []).map((r) => ({ ...r }))}
        metric={metric}
        compareMode={hub.filters.compare}
        marketOverlay={hub.filters.market}
        selectedProvince={selectedProvince}
        selectedCity={selectedCity}
        onProvinceSelect={handleProvinceSelect}
        onCitySelect={setSelectedCity}
      />

      <GeoStatsPanel
        title={
          selectedCity
            ? labelForCity(selectedCity)
            : selectedProvince
              ? labelForProvince(selectedProvince)
              : 'کل ایران'
        }
        detail={detail}
        loading={loadingDetail}
      />

      <AdminChartCard
        title={selectedProvince ? 'شهرهای استان' : 'برترین شهرها'}
        description={loadingCity ? 'در حال بارگذاری...' : undefined}
      >
        <AnalyticsDataTable<TrafficAnalyticsCountRow>
          rows={tableRows.map((r) => ({ ...r }))}
          columns={[
            { key: 'label', header: 'مکان' },
            { key: 'value', header: HEATMAP_METRIC_LABELS[metric], sortValue: (r) => r.value },
          ]}
          searchKeys={['label', 'key']}
          exportFilename="geo-cities.csv"
          showShare
        />
      </AdminChartCard>
    </div>
  );
}
