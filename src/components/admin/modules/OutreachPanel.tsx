'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OutreachRow = {
  id: string;
  status: string;
  matchScore: number;
  matchReasonFa: string;
  requestId: string;
  conversationId: string | null;
  createdAt: string;
  request: { id: string; title: string };
  business: { id: string; name: string; slug: string };
};

export function OutreachPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<OutreachRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [dispatchRequestId, setDispatchRequestId] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ outreach: OutreachRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/outreach?page=${page}&limit=20`
      );
      setRows(res.outreach);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const dispatch = async () => {
    if (!dispatchRequestId.trim()) return;
    try {
      await apiFetch('/api/super-admin/outreach/dispatch', {
        method: 'POST',
        body: JSON.stringify({ requestId: dispatchRequestId.trim() }),
      });
      toast.success('dispatch اجرا شد');
      setDispatchRequestId('');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const retry = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/outreach/${id}/retry`, { method: 'POST' });
      toast.success('retry اجرا شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<OutreachRow>[] = [
    { id: 'request', header: 'نیاز', cell: (r) => r.request.title },
    { id: 'business', header: 'کسب‌وکار', cell: (r) => (
      <Link
        href={`${ADMIN_SECTION_ROUTES.businesses}?id=${r.business.id}`}
        className="text-(--color-coloredText) hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {r.business.name}
      </Link>
    ) },
    { id: 'score', header: 'امتیاز', cell: (r) => r.matchScore.toFixed(2) },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'FAILED' ? 'danger' : 'neutral'}>{r.status}</AdminBadge> },
    { id: 'at', header: 'تاریخ', cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR') },
  ];

  return (
    <AdminPageShell section="outreach" layout="table" description="صف و dispatch outreach نیازها">
      {hasPermission('market:outreach:write') && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Input value={dispatchRequestId} onChange={(e) => setDispatchRequestId(e.target.value)} placeholder="requestId" className="max-w-xs" />
          <Button className="admin-btn-primary" onClick={dispatch}>Dispatch</Button>
        </div>
      )}
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        rowActions={
          hasPermission('market:outreach:write')
            ? (r) => r.status === 'FAILED' ? <Button size="sm" variant="ghost" onClick={() => retry(r.id)}>Retry</Button> : null
            : undefined
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
