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

      <AdminChartCard title="توزیع زمانی (در دست توسعه)" description="ماتریس بعد × زمان از داده واقعی analytics">
        <p className="py-6 text-center text-sm text-muted-foreground">
          نمودار heatmap زمانی پس از اتصال به{' '}
          <code dir="ltr" className="text-xs">/api/super-admin/analytics/timeline</code>{' '}
          در اینجا نمایش داده می‌شود.
        </p>
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
