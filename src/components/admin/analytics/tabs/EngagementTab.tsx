'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type {
  TrafficAnalyticsEngagement,
  TrafficAnalyticsPages,
  TrafficAnalyticsTimeline,
} from '@/components/admin/modules/shared/types';

type EngagementData = {
  timeline: TrafficAnalyticsTimeline;
  pages: TrafficAnalyticsPages;
  engagement: TrafficAnalyticsEngagement;
};

const METRICS = [
  ['pageViews', 'بازدید صفحه'],
  ['sessions', 'نشست'],
  ['events', 'رویداد'],
] as const;

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec.toLocaleString('fa-IR')} ث`;
  return `${Math.floor(sec / 60).toLocaleString('fa-IR')} دقیقه`;
}

export function EngagementTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<EngagementData>('engagement');
  const [metric, setMetric] = useState('pageViews');
  const [timeline, setTimeline] = useState<TrafficAnalyticsTimeline | null>(null);
  const [loadingMetric, setLoadingMetric] = useState(false);

  const handleMetricChange = async (m: string) => {
    setMetric(m);
    setLoadingMetric(true);
    try {
      const res = await hub.fetchTimelineMetric(m);
      setTimeline(res);
    } finally {
      setLoadingMetric(false);
    }
  };

  if (hub.isTabLoading('engagement') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  const chartData = timeline ?? data.timeline;
  const { pages, engagement } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {METRICS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={metric === id ? 'default' : 'outline'}
            disabled={loadingMetric}
            onClick={() => void handleMetricChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <AdminChartCard title="روند زمانی">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData.points}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f633" name="مقدار" />
          </AreaChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <AdminChartCard title="صفحات پربازدید">
        <AnalyticsDataTable<TrafficAnalyticsPages['rows'][number] & { value: number }>
          rows={pages.rows.map((r) => ({ ...r, value: r.views }))}
          columns={[
            { key: 'path', header: 'مسیر', className: 'font-mono text-xs ltr:text-left max-w-[220px] truncate' },
            { key: 'title', header: 'عنوان', render: (r) => r.title ?? '—' },
            { key: 'views', header: 'بازدید', sortValue: (r) => r.views },
            {
              key: 'avgDurationMs',
              header: 'میانگین زمان',
              render: (r) => formatDuration(r.avgDurationMs ?? 0),
            },
          ]}
          searchKeys={['path', 'title']}
          exportFilename="pages.csv"
          showShare
          totalForShare={pages.totalPageViews}
        />
      </AdminChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard title="توزیع مدت بازدید">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={engagement.durationHistogram}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<AnalyticsChartTooltip />} />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} name="بازدید" />
            </BarChart>
          </ResponsiveContainer>
        </AdminChartCard>

        <AdminChartCard title="نوع صفحه (pageKind)">
          <AnalyticsDataTable<TrafficAnalyticsEngagement['pageKind'][number]>
            rows={engagement.pageKind.map((r) => ({ ...r }))}
            columns={[
              { key: 'label', header: 'نوع' },
              { key: 'value', header: 'بازدید', sortValue: (r) => r.value },
            ]}
            exportFilename="page-kind.csv"
            showShare
            totalForShare={engagement.totalPageViews}
          />
        </AdminChartCard>
      </div>
    </div>
  );
}
