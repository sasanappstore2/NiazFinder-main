'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminFilterBar,
  AdminKpiCard,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { ADMIN_SECTION_ROUTES } from '@/config/admin-routes';

type VoiceCallRow = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  caller: { displayName: string | null; firstName: string; lastName: string; phone: string };
  callee: { displayName: string | null; firstName: string; lastName: string; phone: string };
};

function name(u: VoiceCallRow['caller']) {
  return u.displayName || `${u.firstName} ${u.lastName}`.trim() || u.phone;
}

export function VoiceCallsPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<VoiceCallRow[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, missed24h: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ calls: VoiceCallRow[]; stats: typeof stats; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/voice-calls?page=${page}&limit=20`
      );
      setRows(res.calls);
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

  const columns: AdminColumn<VoiceCallRow>[] = [
    { id: 'caller', header: 'تماس‌گیرنده', cell: (r) => name(r.caller) },
    { id: 'callee', header: 'گیرنده', cell: (r) => name(r.callee) },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</AdminBadge> },
    { id: 'dur', header: 'مدت', cell: (r) => (r.durationSec ? `${r.durationSec}s` : '—') },
    { id: 'at', header: 'زمان', cell: (r) => new Date(r.startedAt).toLocaleString('fa-IR') },
  ];

  return (
    <AdminPageShell section="voice-calls" layout="table" description="مانیتoring تماس‌های صوتی">
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <AdminKpiCard title="تماس فعال" value={stats.activeCount.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="از دست رفته (۲۴س)" value={stats.missed24h.toLocaleString('fa-IR')} accent="amber" />
      </div>
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      <p className="mt-2 text-xs text-(--color-secondaryText)">
        <Link href={ADMIN_SECTION_ROUTES.messages} className="text-(--color-coloredText)">بازبینی چت</Link>
      </p>
    </AdminPageShell>
  );
}
