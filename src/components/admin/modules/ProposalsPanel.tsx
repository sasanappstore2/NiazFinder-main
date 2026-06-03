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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';
import { downloadCsv } from '@/lib/admin/export-csv';

type ProposalRow = {
  id: string;
  price: number;
  status: string;
  message: string;
  createdAt: string;
  user: { id: string; displayName: string | null; firstName: string; lastName: string; phone: string };
  request: { id: string; title: string };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  ACCEPTED: 'پذیرفته',
  REJECTED: 'رد شده',
  WITHDRAWN: 'پس‌گرفته',
};

export function ProposalsPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ProposalRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ proposals: ProposalRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/proposals?${params}`
      );
      setRows(res.proposals);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const rejectOne = async (id: string) => {
    try {
      await apiFetch(`/api/super-admin/proposals/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) });
      toast.success('رد شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const bulkReject = async () => {
    if (selected.size === 0) return;
    try {
      await apiFetch('/api/super-admin/proposals/moderate/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: [...selected] }),
      });
      toast.success('رد گروهی انجام شد');
      setSelected(new Set());
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const name = (u: ProposalRow['user']) => u.displayName || `${u.firstName} ${u.lastName}`.trim() || u.phone;

  const columns: AdminColumn<ProposalRow>[] = [
    { id: 'request', header: 'نیاز', cell: (r) => <Link href={ADMIN_SECTION_ROUTES.requests} className="text-(--color-coloredText) hover:underline">{r.request.title}</Link> },
    { id: 'user', header: 'متخصص', cell: (r) => name(r.user) },
    { id: 'price', header: 'قیمت', cell: (r) => r.price.toLocaleString('fa-IR') },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'PENDING' ? 'warning' : 'neutral'}>{STATUS_LABELS[r.status] ?? r.status}</AdminBadge> },
    { id: 'at', header: 'تاریخ', cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR') },
  ];

  return (
    <AdminPageShell
      section="proposals"
      layout="table"
      description="مدیریت پیشنهادهای متخصصان"
      actions={
        hasPermission('market:proposals:moderate') && selected.size > 0 ? (
          <Button size="sm" variant="destructive" onClick={bulkReject}>رد {selected.size} مورد</Button>
        ) : null
      }
    >
      <AdminFilterBar
        search=""
        onSearchChange={() => {}}
        onExport={() => downloadCsv('proposals.csv', ['نیاز', 'متخصص', 'قیمت', 'وضعیت'], rows.map((r) => [r.request.title, name(r.user), String(r.price), r.status]))}
        filters={
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="admin-input h-9 w-36"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="PENDING">در انتظار</SelectItem>
              <SelectItem value="ACCEPTED">پذیرفته</SelectItem>
              <SelectItem value="REJECTED">رد شده</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        selectable={hasPermission('market:proposals:moderate')}
        selectedIds={selected}
        onSelectionChange={setSelected}
        rowActions={
          hasPermission('market:proposals:moderate')
            ? (r) => r.status === 'PENDING' ? (
              <Button size="sm" variant="ghost" onClick={() => rejectOne(r.id)}>رد</Button>
            ) : null
            : undefined
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
