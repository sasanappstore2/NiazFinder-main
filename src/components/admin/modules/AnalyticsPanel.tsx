'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminChartCard,
  AdminKpiCard,
  AdminKpiSkeleton,
  AdminPageShell,
} from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';

type AnalyticsData = {
  timeline: Array<{ label: string; users: number; requests: number; proposals: number; transactions: number }>;
  requestStatus: Array<{ label: string; value: number; color: string }>;
  proposalStatus: Array<{ label: string; value: number; color: string }>;
  userRoles: Array<{ label: string; value: number; color: string }>;
  communications: { totalMessages: number; unreadMessages: number; totalNotifications: number };
};

const tooltipStyle = {
  background: 'var(--color-primaryBg)',
  border: '1px solid var(--color-mainBorder)',
  borderRadius: 8,
  fontSize: 12,
};

export function AnalyticsPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AnalyticsData>('/api/super-admin/analytics');
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { void load(); }, [load]);

  if (isLoading || !data) {
    return (
      <AdminPageShell section="analytics" layout="dashboard">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <AdminKpiSkeleton key={i} />
          ))}
        </div>
      </AdminPageShell>
    );
  }

  const quickLinks = [
    { label: 'نیازها', href: ADMIN_SECTION_ROUTES.requests },
    { label: 'پیشنهادها', href: ADMIN_SECTION_ROUTES.proposals },
    { label: 'کاربران', href: ADMIN_SECTION_ROUTES.users },
    { label: 'چت', href: ADMIN_SECTION_ROUTES.messages },
  ];

  return (
    <AdminPageShell section="analytics" layout="dashboard" description="تحلیل روند و KPIهای عملیاتی">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminKpiCard title="پیام‌ها" value={data.communications.totalMessages.toLocaleString('fa-IR')} changeLabel={`${data.communications.unreadMessages} خوانده‌نشده`} accent="sky" />
        <AdminKpiCard title="اعلان‌ها" value={data.communications.totalNotifications.toLocaleString('fa-IR')} accent="amber" />
        <AdminKpiCard title="نیاز (باز)" value={(data.requestStatus.find((x) => x.label === 'باز')?.value ?? 0).toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="پیشنهاد (انتظار)" value={(data.proposalStatus.find((x) => x.label === 'در انتظار')?.value ?? 0).toLocaleString('fa-IR')} accent="violet" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <AdminChartCard title="رشد ۱۲ ماه">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data.timeline}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="users" stackId="1" stroke="#10b981" fill="#10b98133" name="کاربر" />
              <Area type="monotone" dataKey="requests" stackId="2" stroke="#3b82f6" fill="#3b82f633" name="نیاز" />
            </AreaChart>
          </ResponsiveContainer>
        </AdminChartCard>
        <AdminChartCard title="وضعیت نیازها">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.requestStatus}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </AdminChartCard>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-(--color-mainBorder) px-3 py-2 text-sm hover:bg-(--color-navItemBgHover)">
            {link.label}
          </Link>
        ))}
      </div>
    </AdminPageShell>
  );
}
