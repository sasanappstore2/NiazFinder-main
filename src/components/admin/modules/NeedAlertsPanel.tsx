'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminFilterBar,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type AlertRow = {
  id: string;
  label: string;
  categorySlug: string | null;
  active: boolean;
  createdAt: string;
  user: { phone: string; displayName: string | null };
};

export function NeedAlertsPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ alerts: AlertRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/need-alerts?page=${page}&limit=20`
      );
      setRows(res.alerts);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const deactivate = async (id: string) => {
    try {
      await apiFetch('/api/super-admin/need-alerts', { method: 'PATCH', body: JSON.stringify({ id, active: false }) });
      toast.success('غیرفعال شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<AlertRow>[] = [
    { id: 'label', header: 'برچسب', cell: (r) => r.label },
    { id: 'cat', header: 'دسته', cell: (r) => r.categorySlug ?? '—' },
    { id: 'user', header: 'کاربر', cell: (r) => r.user.displayName ?? r.user.phone },
    { id: 'active', header: 'فعال', cell: (r) => <AdminBadge variant={r.active ? 'success' : 'neutral'}>{r.active ? 'بله' : 'خیر'}</AdminBadge> },
  ];

  return (
    <AdminPageShell section="need-alerts" layout="table" description="اشتراک‌های alert مرور نیاز">
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        rowActions={(r) => r.active ? <Button size="sm" variant="ghost" onClick={() => deactivate(r.id)}>غیرفعال</Button> : null}
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
