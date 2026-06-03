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

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: string;
  ip: string | null;
  createdAt: string;
  actor: {
    id: string;
    phone: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

function actorName(a: AuditRow['actor']) {
  return a.displayName || `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || a.phone;
}

export function AuditLogPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [q, setQ] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (q) params.set('q', q);
      if (entityType) params.set('entityType', entityType);
      const res = await apiFetch<{ logs: AuditRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/audit?${params}`
      );
      setRows(res.logs);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, q, entityType]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = () => { void load(); };
    window.addEventListener('admin-refresh', h);
    return () => window.removeEventListener('admin-refresh', h);
  }, [load]);

  const columns: AdminColumn<AuditRow>[] = [
    { id: 'action', header: 'عمل', cell: (r) => <AdminBadge variant="info">{r.action}</AdminBadge> },
    { id: 'entity', header: 'موجودیت', cell: (r) => <span className="text-xs">{r.entityType}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ''}</span> },
    { id: 'actor', header: 'کارمند', cell: (r) => actorName(r.actor) },
    { id: 'ip', header: 'IP', cell: (r) => <span dir="ltr" className="text-xs">{r.ip ?? '—'}</span> },
    { id: 'at', header: 'زمان', cell: (r) => new Date(r.createdAt).toLocaleString('fa-IR') },
  ];

  return (
    <AdminPageShell section="audit" layout="table" description="ردیابی اقدامات کارمندان در پنل">
      <AdminFilterBar
        search={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="جستجو action، entity، کارمند..."
      />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
