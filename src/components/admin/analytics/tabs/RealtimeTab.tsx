'use client';

import { useEffect } from 'react';
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
import { AdminChartCard, AdminKpiCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsRealtime } from '@/components/admin/modules/shared/types';
import { cn } from '@/lib/utils';

export function RealtimeTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<TrafficAnalyticsRealtime>('realtime');

  useEffect(() => {
    if (hub.activeTab !== 'realtime') return;
    const id = setInterval(() => {
      void hub.refreshTab('realtime');
    }, 30_000);
    return () => clearInterval(id);
  }, [hub.activeTab, hub.refreshTab]);

  if (hub.isTabLoading('realtime') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-sm font-medium text-emerald-600">زنده</span>
        <span className="text-xs text-(--color-secondaryText)">
          پنجره {data.windowMinutes.toLocaleString('fa-IR')} دقیقه
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminKpiCard
          title="فعال (۵ دقیقه)"
          value={data.activeUsers5m.toLocaleString('fa-IR')}
          accent="green"
        />
        <AdminKpiCard
          title="فعال (۳۰ دقیقه)"
          value={data.activeUsers.toLocaleString('fa-IR')}
          accent="sky"
        />
        <AdminKpiCard
          title="بازدید (۳۰ دقیقه)"
          value={data.pageViews.toLocaleString('fa-IR')}
          accent="violet"
        />
      </div>

      <AdminChartCard title="بازدید دقیقه‌ای">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data.minuteBuckets}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b98133" name="بازدید" />
          </AreaChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminChartCard title="تقسیم بازار">
          <div className="flex gap-4">
            {[
              { key: 'need', label: 'نیاز', color: 'bg-sky-500' },
              { key: 'business', label: 'کسب‌وکار', color: 'bg-emerald-500' },
              { key: 'other', label: 'سایر', color: 'bg-slate-400' },
            ].map(({ key, label, color }) => {
              const val = data.marketSplit[key as keyof typeof data.marketSplit];
              const total = data.marketSplit.need + data.marketSplit.business + data.marketSplit.other;
              const pct = total ? Math.round((val / total) * 100) : 0;
              return (
                <div key={key} className="flex-1 text-center">
                  <div className={cn('mx-auto mb-2 h-2 rounded-full', color)} style={{ width: `${Math.max(pct, 4)}%` }} />
                  <p className="text-xs text-(--color-secondaryText)">{label}</p>
                  <p className="font-semibold">{val.toLocaleString('fa-IR')}</p>
                </div>
              );
            })}
          </div>
        </AdminChartCard>

        <AdminChartCard title="صفحات پرترافیک (اکنون)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.topPages.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} hide />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip content={<AnalyticsChartTooltip />} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="بازدید" />
            </BarChart>
          </ResponsiveContainer>
        </AdminChartCard>
      </div>

      <AdminChartCard title="جریان رویداد">
        <div className="max-h-64 space-y-1 overflow-y-auto text-xs">
          {data.eventStream.length === 0 ? (
            <p className="py-4 text-center text-(--color-secondaryText)">رویدادی نیست</p>
          ) : (
            data.eventStream.map((e, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-(--color-mainBorder)/50 px-2 py-1.5"
              >
                <span className="shrink-0 text-(--color-tertiaryText)">
                  {new Date(e.at).toLocaleTimeString('fa-IR')}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {e.type === 'event' ? e.name : 'page_view'}
                </span>
                <span className="min-w-0 truncate font-mono ltr:text-left">{e.path}</span>
              </div>
            ))
          )}
        </div>
      </AdminChartCard>
    </div>
  );
}
