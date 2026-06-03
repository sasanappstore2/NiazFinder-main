'use client';

import Link from 'next/link';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AdminChartCard, AdminKpiCard } from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { PlatformAnalyticsData, TrafficAnalyticsCorrelation } from '@/components/admin/modules/shared/types';

type PlatformData = {
  platform: PlatformAnalyticsData;
  correlation: TrafficAnalyticsCorrelation;
};

export function PlatformTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<PlatformData>('platform');

  if (hub.isTabLoading('platform') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data?.platform) return <AnalyticsEmptyState />;

  const { platform, correlation } = data;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard
          title="پیام‌ها"
          value={platform.communications.totalMessages.toLocaleString('fa-IR')}
          changeLabel={`${platform.communications.unreadMessages} خوانده‌نشده`}
          accent="sky"
        />
        <AdminKpiCard
          title="اعلان‌ها"
          value={platform.communications.totalNotifications.toLocaleString('fa-IR')}
          accent="amber"
        />
        <AdminKpiCard
          title="نیاز (باز)"
          value={(platform.requestStatus.find((x) => x.label === 'باز')?.value ?? 0).toLocaleString('fa-IR')}
          accent="green"
        />
        <AdminKpiCard
          title="پیشنهاد (انتظار)"
          value={(platform.proposalStatus.find((x) => x.label === 'در انتظار')?.value ?? 0).toLocaleString('fa-IR')}
          accent="violet"
        />
      </div>

      <AdminChartCard title="رشد عملیاتی ۱۲ ماه">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={platform.timeline}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Area type="monotone" dataKey="users" stackId="1" stroke="#10b981" fill="#10b98133" name="کاربر" />
            <Area type="monotone" dataKey="requests" stackId="2" stroke="#3b82f6" fill="#3b82f633" name="نیاز" />
          </AreaChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <AdminChartCard title="همبستگی ترافیک و رشد پلتفرم">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={correlation.points}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="left" tick={{ fontSize: 11 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="pageViews" stroke="#3b82f6" name="بازدید" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="newUsers" stroke="#10b981" name="کاربر جدید" dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="newRequests" stroke="#a855f7" name="نیاز جدید" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <div className="flex flex-wrap gap-2">
        {[
          { label: 'نیازها', href: ADMIN_SECTION_ROUTES.requests },
          { label: 'پیشنهادها', href: ADMIN_SECTION_ROUTES.proposals },
          { label: 'کاربران', href: ADMIN_SECTION_ROUTES.users },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-(--color-mainBorder) px-3 py-2 text-sm hover:bg-(--color-navItemBgHover)"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
