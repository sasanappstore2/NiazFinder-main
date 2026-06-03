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

type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
  user: { phone: string; displayName: string | null };
};

export function BillingPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ transactions: TransactionRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/transactions?page=${page}&limit=20`
      );
      setRows(res.transactions);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const refund = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/transactions/${id}/refund`, { method: 'POST' });
      toast.success('refund ثبت شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<TransactionRow>[] = [
    { id: 'type', header: 'نوع', cell: (r) => r.type },
    { id: 'amount', header: 'مبلغ', cell: (r) => r.amount.toLocaleString('fa-IR') },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'COMPLETED' ? 'success' : 'warning'}>{r.status}</AdminBadge> },
    { id: 'user', header: 'کاربر', cell: (r) => r.user.displayName ?? r.user.phone },
    { id: 'at', header: 'تاریخ', cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR') },
  ];

  return (
    <AdminPageShell section="billing" layout="table" description="تراکنش‌ها و کیف پول">
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        rowActions={
          hasPermission('billing:transactions:write')
            ? (r) => r.status === 'COMPLETED' ? <Button size="sm" variant="ghost" onClick={() => refund(r.id)}>Refund</Button> : null
            : undefined
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
