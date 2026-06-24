'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminKpiCard,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';

type ReferralRow = {
  id: string;
  code: string;
  reward: number;
  isClaimed: boolean;
  createdAt: string;
};

export function ReferralsPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [stats, setStats] = useState({ totalReward: 0, claimed: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ referrals: ReferralRow[]; stats: typeof stats; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/referrals?page=${page}&limit=20`
      );
      setRows(res.referrals);
      setStats(res.stats);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const columns: AdminColumn<ReferralRow>[] = [
    { id: 'code', header: 'کد', cell: (r) => r.code },
    { id: 'reward', header: 'پاداش', cell: (r) => r.reward.toLocaleString('fa-IR') },
    { id: 'claimed', header: 'دریافت', cell: (r) => (r.isClaimed ? 'بله' : 'خیر') },
    { id: 'at', header: 'تاریخ', cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR') },
  ];

  return (
    <AdminPageShell
      section="referrals"
      layout="table"
      description="آمار و لیست کدهای ارجاع"
      actions={<AdminBadge variant="neutral">فقط مشاهده</AdminBadge>}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <AdminKpiCard title="مجموع پاداش" value={stats.totalReward.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="دریافت‌شده" value={stats.claimed.toLocaleString('fa-IR')} accent="sky" />
      </div>
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
