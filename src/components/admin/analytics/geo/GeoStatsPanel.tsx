'use client';

import { AdminKpiCard } from '@/components/admin/ui';
import type { GeoDetailKpi } from '@/lib/geo/types';

export function GeoStatsPanel({
  title,
  detail,
  loading,
}: {
  title: string;
  detail: GeoDetailKpi | null;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ))}
      </div>
    );
  }

  if (!detail) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard title="نشست" value={detail.sessions.toLocaleString('fa-IR')} accent="sky" />
        <AdminKpiCard title="بازدید صفحه" value={detail.pageViews.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="نرخ پرش" value={`${detail.bounceRate.toLocaleString('fa-IR')}٪`} accent="amber" />
        <AdminKpiCard title="نرخ تبدیل" value={`${detail.conversionRate.toLocaleString('fa-IR')}٪`} accent="violet" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AdminKpiCard title="بازار نیاز" value={detail.needSessions.toLocaleString('fa-IR')} accent="sky" />
        <AdminKpiCard title="بازار کسب‌وکار" value={detail.businessSessions.toLocaleString('fa-IR')} accent="green" />
      </div>
      {detail.topPages.length > 0 && (
        <div className="rounded-xl border border-(--color-mainBorder) p-3 text-sm">
          <p className="mb-2 font-medium text-(--color-secondaryText)">برترین صفحات</p>
          <ul className="space-y-1">
            {detail.topPages.slice(0, 5).map((p) => (
              <li key={p.path} className="flex justify-between gap-2 font-mono text-xs">
                <span className="truncate ltr:text-left">{p.path}</span>
                <span>{p.views.toLocaleString('fa-IR')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
