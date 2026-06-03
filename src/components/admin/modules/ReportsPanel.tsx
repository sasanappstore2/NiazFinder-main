'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminDetailDrawer,
  AdminFilterBar,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ReportRow = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'در انتظار',
  REVIEWING: 'در حال بررسی',
  RESOLVED: 'حل‌شده',
  DISMISSED: 'رد شده',
};

export function ReportsPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ reports: ReportRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/reports?${params}`
      );
      setRows(res.reports);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const resolve = async (status: 'RESOLVED' | 'DISMISSED' | 'REVIEWING') => {
    if (!selected) return;
    try {
      await apiFetch(`/api/super-admin/reports/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note }),
      });
      toast.success('به‌روزرسانی شد');
      setSelected(null);
      setNote('');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<ReportRow>[] = [
    { id: 'type', header: 'نوع', cell: (r) => r.targetType },
    { id: 'reason', header: 'دلیل', cell: (r) => r.reason },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'PENDING' ? 'warning' : 'neutral'}>{STATUS_LABELS[r.status] ?? r.status}</AdminBadge> },
    { id: 'at', header: 'تاریخ', cell: (r) => new Date(r.createdAt).toLocaleDateString('fa-IR') },
  ];

  return (
    <AdminPageShell section="reports" layout="table" description="صف رسیدگی به گزارش‌های تخلف">
      <AdminFilterBar
        search=""
        onSearchChange={() => {}}
        filters={
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="admin-input h-9 w-40"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="PENDING">در انتظار</SelectItem>
              <SelectItem value="REVIEWING">در حال بررسی</SelectItem>
              <SelectItem value="RESOLVED">حل‌شده</SelectItem>
              <SelectItem value="DISMISSED">رد شده</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        onRowClick={(r) => setSelected(r)}
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <AdminDetailDrawer
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="جزئیات گزارش"
        description={selected?.targetType}
        footer={
          hasPermission('content:reports:moderate') ? (
            <div className="space-y-3">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="یادداشت..." rows={3} />
              <div className="flex flex-wrap gap-2">
                <Button className="admin-btn-primary" onClick={() => resolve('RESOLVED')}>حل شد</Button>
                <Button variant="outline" onClick={() => resolve('DISMISSED')}>رد گزارش</Button>
                <Button variant="secondary" onClick={() => resolve('REVIEWING')}>در حال بررسی</Button>
              </div>
            </div>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-3 text-sm">
            <p><strong>هدف:</strong> {selected.targetId}</p>
            <p><strong>دلیل:</strong> {selected.reason}</p>
            <p><strong>توضیح:</strong> {selected.description || '—'}</p>
          </div>
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}
