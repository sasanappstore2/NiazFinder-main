'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsDimensions, TrafficAnalyticsCountRow } from '@/components/admin/modules/shared/types';

type BusinessData = Record<
  'market' | 'city' | 'needCategory' | 'occupation' | 'onlineStore' | 'pageKind',
  TrafficAnalyticsDimensions
>;

const DIM_TABS = [
  ['market', 'بازار'],
  ['city', 'شهر'],
  ['needCategory', 'دسته نیاز'],
  ['occupation', 'حرفه'],
  ['onlineStore', 'فروشگاه آنلاین'],
  ['pageKind', 'نوع صفحه'],
] as const;

function DimensionPanel({ data, label }: { data: TrafficAnalyticsDimensions; label: string }) {
  if (!data.rows.length) return <AnalyticsEmptyState title={`${label} — بدون داده`} />;

  return (
    <div className="space-y-4">
      <AnalyticsDataTable<TrafficAnalyticsCountRow>
        rows={data.rows.map((r) => ({ ...r }))}
        columns={[
          { key: 'label', header: label },
          { key: 'value', header: 'بازدید', sortValue: (r) => r.value },
        ]}
        searchKeys={['label', 'key']}
        exportFilename={`dim-${label}.csv`}
        showShare
        totalForShare={data.total}
      />

      <AdminChartCard title="Heatmap (placeholder)" description="ماتریس بعد × زمان — به‌زودی">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-(--color-mainBorder)">
                <th className="p-2 text-right">بعد</th>
                {['هفته ۱', 'هفته ۲', 'هفته ۳', 'هفته ۴'].map((w) => (
                  <th key={w} className="p-2 text-center">
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 6).map((row) => (
                <tr key={row.key} className="border-b border-(--color-mainBorder)/50">
                  <td className="p-2 font-medium">{row.label}</td>
                  {[0, 1, 2, 3].map((ci) => {
                    const fake = Math.round((row.value / (ci + 2)) % (row.value + 1));
                    const intensity = row.value ? fake / row.value : 0;
                    return (
                      <td key={ci} className="p-1">
                        <div
                          className="rounded px-1 py-2 text-center tabular-nums"
                          style={{
                            background: `rgba(16, 185, 129, ${Math.max(0.1, intensity * 0.7)})`,
                          }}
                        >
                          {fake.toLocaleString('fa-IR')}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminChartCard>
    </div>
  );
}

export function BusinessTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<BusinessData>('business');
  const [subTab, setSubTab] = useState<string>('market');

  if (hub.isTabLoading('business') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList className="flex h-auto flex-wrap gap-1">
        {DIM_TABS.map(([id, label]) => (
          <TabsTrigger key={id} value={id}>
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      {DIM_TABS.map(([id, label]) => (
        <TabsContent key={id} value={id} className="mt-4">
          <DimensionPanel data={data[id]} label={label} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
