'use client';

import Link from 'next/link';
import { AdminChartCard, AdminKpiCard } from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { AnalyticsMetricCard } from '@/components/admin/analytics/charts/AnalyticsMetricCard';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { PlatformAnalyticsData, TrafficAnalyticsSparklines, TrafficAnalyticsSummary } from '@/components/admin/modules/shared/types';

type ExecutiveData = {
  summary: TrafficAnalyticsSummary;
  sparklines: TrafficAnalyticsSparklines;
  platform: PlatformAnalyticsData;
};

function formatDuration(ms: number): string {
  if (!ms) return '۰ ثانیه';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec.toLocaleString('fa-IR')} ثانیه`;
  return `${Math.floor(sec / 60).toLocaleString('fa-IR')} دقیقه`;
}

export function ExecutiveTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<ExecutiveData>('executive');

  if (hub.isTabLoading('executive') && !data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!data?.summary) {
    return <AnalyticsEmptyState />;
  }

  const { summary, sparklines, platform } = data;
  const kpis = summary.kpis;
  const compare = summary.compare;

  const insights: string[] = [];
  if (compare?.sessions != null && compare.sessions > 10) {
    insights.push(`نشست‌ها ${compare.sessions.toLocaleString('fa-IR')}٪ نسبت به دوره قبل رشد داشته‌اند.`);
  } else if (compare?.sessions != null && compare.sessions < -10) {
    insights.push(`نشست‌ها ${Math.abs(compare.sessions).toLocaleString('fa-IR')}٪ کاهش یافته‌اند.`);
  }
  if (kpis.bounceRate > 60) {
    insights.push('نرخ پرش بالاست — صفحات فرود را بررسی کنید.');
  }
  if (kpis.conversionRate && kpis.conversionRate < 2) {
    insights.push('نرخ تبدیل پایین است — قیف‌های need و signup را مرور کنید.');
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AnalyticsMetricCard
          title="نشست‌ها"
          value={kpis.sessions.toLocaleString('fa-IR')}
          delta={compare?.sessions}
          sparkline={sparklines.series.sessions}
          accent="sky"
        />
        <AnalyticsMetricCard
          title="بازدید صفحه"
          value={kpis.pageViews.toLocaleString('fa-IR')}
          delta={compare?.pageViews}
          sparkline={sparklines.series.pageViews}
          accent="green"
        />
        <AnalyticsMetricCard
          title="بازدیدکننده یکتا"
          value={kpis.uniqueVisitors.toLocaleString('fa-IR')}
          delta={compare?.uniqueVisitors}
          sparkline={sparklines.series.uniqueVisitors}
          accent="violet"
        />
        <AnalyticsMetricCard
          title="نرخ پرش"
          value={`${kpis.bounceRate.toLocaleString('fa-IR')}٪`}
          delta={compare?.bounceRate}
          deltaLabel={formatDuration(kpis.avgDurationMs)}
          sparkline={sparklines.series.bounceRate}
          accent="amber"
        />
        <AnalyticsMetricCard
          title="نرخ تبدیل"
          value={`${(kpis.conversionRate ?? 0).toLocaleString('fa-IR')}٪`}
          delta={compare?.conversionRate}
          sparkline={sparklines.series.conversionRate}
          accent="rose"
        />
      </div>

      {insights.length > 0 && (
        <AdminChartCard title="بینش‌های خودکار">
          <ul className="space-y-2 text-sm">
            {insights.map((text, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--color-mainColor)" />
                {text}
              </li>
            ))}
          </ul>
        </AdminChartCard>
      )}

      {platform && (
        <>
          <h3 className="text-sm font-semibold text-(--color-secondaryText)">KPI عملیاتی پلتفرم</h3>
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
        </>
      )}
    </div>
  );
}
