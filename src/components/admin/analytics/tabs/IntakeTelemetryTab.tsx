'use client';

import { AdminChartCard, AdminKpiCard } from '@/components/admin/ui';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { useAnalyticsHub } from '@/components/admin/analytics/useAnalyticsHub';

export interface IntakeTelemetryData {
  events: number;
  memoryBufferSize: number;
  totalSessions: number;
  eventsByType: Record<string, number>;
  funnelReach: Record<string, number>;
  dropoffsByStep: Record<string, number>;
  publish: { success: number; fail: number };
  topValidationErrors: Array<{ field: string; count: number }>;
  topFieldChanges: Array<{ field: string; count: number }>;
  sinceDays: number;
}

interface IntakeTelemetryTabProps {
  hub: ReturnType<typeof useAnalyticsHub>;
}

const FUNNEL_LABELS: Record<string, string> = {
  need: 'نیاز',
  details: 'جزئیات',
  location: 'مکان',
  preview: 'پیش‌نمایش',
};

export function IntakeTelemetryTab({ hub }: IntakeTelemetryTabProps) {
  const error = hub.tabError('intake');
  const data = hub.getTabData<IntakeTelemetryData>('intake');

  if (hub.isTabLoading('intake') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (error) {
    return <AnalyticsEmptyState title="خطا در بارگذاری telemetry" description={error} />;
  }

  if (!data || data.events === 0) {
    return (
      <AnalyticsEmptyState
        title="telemetry ثبت نیاز"
        description="پس از چند جلسه در /post داده اینجا نمایش داده می‌شود."
      />
    );
  }

  const funnelRows = Object.entries(data.funnelReach).map(([step, count]) => ({
    id: step,
    step: FUNNEL_LABELS[step] ?? step,
    sessions: count,
    dropoffs: data.dropoffsByStep[step] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminKpiCard title="رویدادها" value={data.events.toLocaleString('fa-IR')} accent="sky" />
        <AdminKpiCard title="نشست‌ها" value={data.totalSessions.toLocaleString('fa-IR')} accent="violet" />
        <AdminKpiCard title="انتشار موفق" value={data.publish.success.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="انتشار ناموفق" value={data.publish.fail.toLocaleString('fa-IR')} accent="amber" />
      </div>

      <AdminChartCard
        title="قیف wizard /post"
        description={`${data.sinceDays} روز اخیر — buffer حافظه: ${data.memoryBufferSize}`}
      >
        <AnalyticsDataTable
          rows={funnelRows}
          columns={[
            { key: 'step', header: 'مرحله' },
            { key: 'sessions', header: 'رسیده', sortValue: (r) => r.sessions },
            { key: 'dropoffs', header: 'رها شده', sortValue: (r) => r.dropoffs },
          ]}
        />
      </AdminChartCard>

      {data.topValidationErrors.length > 0 ? (
        <AdminChartCard title="خطاهای اعتبارسنجی پرتکرار">
          <AnalyticsDataTable
            rows={data.topValidationErrors.map((r) => ({ ...r, id: r.field }))}
            columns={[
              { key: 'field', header: 'فیلد' },
              { key: 'count', header: 'تعداد', sortValue: (r) => r.count },
            ]}
          />
        </AdminChartCard>
      ) : null}
    </div>
  );
}
