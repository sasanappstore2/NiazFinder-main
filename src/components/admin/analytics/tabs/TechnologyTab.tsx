'use client';

import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsTechnology, TrafficAnalyticsCountRow } from '@/components/admin/modules/shared/types';

type TechnologyData = {
  device: TrafficAnalyticsTechnology;
  browser: TrafficAnalyticsTechnology;
  os: TrafficAnalyticsTechnology;
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#64748b'];

function TechPanel({ data, title }: { data: TrafficAnalyticsTechnology; title: string }) {
  if (!data.rows.length) return <AnalyticsEmptyState />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AdminChartCard title={`${title} — نمودار`}>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data.rows.slice(0, 8)} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={90}>
              {data.rows.slice(0, 8).map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<AnalyticsChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </AdminChartCard>
      <AdminChartCard title={`${title} — جدول`}>
        <AnalyticsDataTable<TrafficAnalyticsCountRow>
          rows={data.rows.map((r) => ({ ...r }))}
          columns={[
            { key: 'label', header: title },
            { key: 'value', header: 'نشست', sortValue: (r) => r.value },
          ]}
          exportFilename={`tech-${title}.csv`}
          showShare
          totalForShare={data.total}
        />
      </AdminChartCard>
    </div>
  );
}

export function TechnologyTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<TechnologyData>('technology');
  const [subTab, setSubTab] = useState('device');

  if (hub.isTabLoading('technology') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <Tabs value={subTab} onValueChange={setSubTab}>
      <TabsList>
        <TabsTrigger value="device">دستگاه</TabsTrigger>
        <TabsTrigger value="browser">مرورگر</TabsTrigger>
        <TabsTrigger value="os">سیستم‌عامل</TabsTrigger>
      </TabsList>
      <TabsContent value="device" className="mt-4">
        <TechPanel data={data.device} title="دستگاه" />
      </TabsContent>
      <TabsContent value="browser" className="mt-4">
        <TechPanel data={data.browser} title="مرورگر" />
      </TabsContent>
      <TabsContent value="os" className="mt-4">
        <TechPanel data={data.os} title="سیستم‌عامل" />
      </TabsContent>
    </Tabs>
  );
}
