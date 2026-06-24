'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type {
  TrafficAnalyticsDimensions,
  TrafficAnalyticsCountRow,
  TrafficAnalyticsTimeline,
} from '@/components/admin/modules/shared/types';

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

function TimelineChart({ timeline, loading }: { timeline: TrafficAnalyticsTimeline | null; loading: boolean }) {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/30" />;
  }
  if (!timeline?.points?.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">بدون داده زمانی</p>;
  }

  return (
    <div className="h-52 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={timeline.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="bizTimelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip content={<AnalyticsChartTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--color-primary)"
            fill="url(#bizTimelineFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DimensionPanel({
  data,
  label,
  hub,
}: {
  data: TrafficAnalyticsDimensions;
  label: string;
  hub: AnalyticsHubContext;
}) {
  const [timeline, setTimeline] = useState<TrafficAnalyticsTimeline | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingTimeline(true);
    void hub
      .fetchTimelineMetric('pageViews')
      .then((res) => {
        if (!cancelled) setTimeline(res);
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hub]);

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

      <AdminChartCard title="روند بازدید در بازه انتخاب‌شده" description="از timeline واقعی analytics">
        <TimelineChart timeline={timeline} loading={loadingTimeline} />
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
          <DimensionPanel data={data[id]} label={label} hub={hub} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
