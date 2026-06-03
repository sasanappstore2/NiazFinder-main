'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsEvents } from '@/components/admin/modules/shared/types';

export function ConversionsTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<TrafficAnalyticsEvents>('conversions');

  if (hub.isTabLoading('conversions') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-(--color-secondaryText)">
        مجموع رویدادها: {data.total.toLocaleString('fa-IR')}
      </p>

      <AdminChartCard title="روند رویدادهای تبدیل">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.timeline}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#a855f7" fill="#a855f733" name="رویداد" />
          </AreaChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard title="بر اساس نام رویداد">
          <AnalyticsDataTable<TrafficAnalyticsEvents['byName'][number]>
            rows={data.byName.map((r) => ({ ...r }))}
            columns={[
              { key: 'label', header: 'رویداد' },
              { key: 'value', header: 'تعداد', sortValue: (r) => r.value },
            ]}
            searchKeys={['label', 'key']}
            exportFilename="events-by-name.csv"
            showShare
            totalForShare={data.total}
          />
        </AdminChartCard>

        <AdminChartCard title="بر اساس مسیر">
          <AnalyticsDataTable<TrafficAnalyticsEvents['byPath'][number]>
            rows={data.byPath.map((r) => ({ ...r }))}
            columns={[
              { key: 'label', header: 'مسیر', className: 'font-mono text-xs ltr:text-left' },
              { key: 'value', header: 'تعداد', sortValue: (r) => r.value },
            ]}
            searchKeys={['label']}
            exportFilename="events-by-path.csv"
            showShare
            totalForShare={data.total}
          />
        </AdminChartCard>
      </div>
    </div>
  );
}
