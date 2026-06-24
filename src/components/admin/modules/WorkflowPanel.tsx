'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { AdminKpiCard, AdminPageShell } from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';

type WorkflowData = {
  counts: {
    pendingRequests: number;
    pendingReports: number;
    failedOutreach: number;
    pendingProposals: number;
    bannedUsers: number;
    unreadMessages: number;
    inactiveBusinesses: number;
  };
};

const LINKS = [
  { key: 'pendingRequests' as const, label: 'نیاز در انتظار بازبینی', href: ADMIN_SECTION_ROUTES.requests },
  { key: 'pendingReports' as const, label: 'گزارش تخلف', href: ADMIN_SECTION_ROUTES.reports },
  { key: 'failedOutreach' as const, label: 'Outreach ناموفق', href: ADMIN_SECTION_ROUTES.outreach },
  { key: 'pendingProposals' as const, label: 'پیشنهاد در انتظار', href: ADMIN_SECTION_ROUTES.proposals },
  { key: 'unreadMessages' as const, label: 'پیام خوانده‌نشده', href: ADMIN_SECTION_ROUTES.messages },
  {
    key: 'inactiveBusinesses' as const,
    label: 'کسب‌وکار در انتظار',
    href: `${ADMIN_SECTION_ROUTES.businesses}?status=INACTIVE&verified=false`,
  },
];

export function WorkflowPanel() {
  const { apiFetch } = useAdmin();
  const [data, setData] = useState<WorkflowData | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<WorkflowData>('/api/super-admin/workflow');
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  }, [apiFetch]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminPageShell section="workflow" layout="dashboard" description="نمای یکپارچه صف‌های کاری">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((item) => (
          <Link key={item.key} href={item.href} className="block">
            <AdminKpiCard
              title={item.label}
              value={(data?.counts?.[item.key] ?? 0).toLocaleString('fa-IR')}
              accent={data?.counts?.[item.key] ? 'amber' : 'green'}
            />
          </Link>
        ))}
        <AdminKpiCard title="کاربران مسدود" value={(data?.counts?.bannedUsers ?? 0).toLocaleString('fa-IR')} accent="violet" />
      </div>
    </AdminPageShell>
  );
}
