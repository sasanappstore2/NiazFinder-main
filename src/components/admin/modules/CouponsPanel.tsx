'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';

type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  usedCount: number;
  maxUses: number | null;
  isActive: boolean;
  expiresAt: string | null;
};

export function CouponsPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<CouponRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ coupons: CouponRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/coupons?page=${page}&limit=20`
      );
      setRows(res.coupons);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const columns: AdminColumn<CouponRow>[] = [
    { id: 'code', header: 'کد', cell: (r) => r.code },
    { id: 'type', header: 'نوع', cell: (r) => r.type },
    { id: 'value', header: 'مقدار', cell: (r) => r.value.toLocaleString('fa-IR') },
    { id: 'uses', header: 'استفاده', cell: (r) => `${r.usedCount}${r.maxUses ? ` / ${r.maxUses}` : ''}` },
    { id: 'active', header: 'فعال', cell: (r) => <AdminBadge variant={r.isActive ? 'success' : 'neutral'}>{r.isActive ? 'بله' : 'خیر'}</AdminBadge> },
  ];

  return (
    <AdminPageShell
      section="coupons"
      layout="table"
      description="مشاهده کوپن‌های فعال و تاریخچه استفاده"
      actions={<AdminBadge variant="neutral">فقط مشاهده</AdminBadge>}
    >
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
