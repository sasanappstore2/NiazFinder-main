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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

type VoiceCallRow = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  caller: { displayName: string | null; firstName: string; lastName: string; phone: string };
  callee: { displayName: string | null; firstName: string; lastName: string; phone: string };
};

type CallDetail = {
  call: VoiceCallRow & {
    conversationId: string | null;
    janusRoomId: string | null;
  };
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
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CallDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        calls: VoiceCallRow[];
        stats: typeof stats;
        pagination: { totalPages: number; total: number };
      }>(`/api/super-admin/voice-calls?page=${page}&limit=20`);
      setRows(res.calls);
      setStats(res.stats);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await apiFetch<CallDetail>(`/api/super-admin/voice-calls/${id}`);
      setDetail(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627');
      setDetailId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: AdminColumn<VoiceCallRow>[] = [
    {
      id: 'caller',
      header: '\u062a\u0645\u0627\u0633\u200c\u06af\u06cc\u0631\u0646\u062f\u0647',
      cell: (r) => (
        <button type="button" className="hover:underline" onClick={() => void openDetail(r.id)}>
          {name(r.caller)}
        </button>
      ),
    },
    { id: 'callee', header: '\u06af\u06cc\u0631\u0646\u062f\u0647', cell: (r) => name(r.callee) },
    {
      id: 'status',
      header: '\u0648\u0636\u0639\u06cc\u062a',
      cell: (r) => (
        <AdminBadge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</AdminBadge>
      ),
    },
    {
      id: 'dur',
      header: '\u0645\u062f\u062a',
      cell: (r) => (r.durationSec ? `${r.durationSec}s` : '\u2014'),
    },
    {
      id: 'at',
      header: '\u0632\u0645\u0627\u0646',
      cell: (r) => new Date(r.startedAt).toLocaleString('fa-IR'),
    },
  ];

  return (
    <AdminPageShell section="voice-calls" layout="table" description={'\u0645\u0627\u0646\u06cc\u062a\u0648\u0631\u06cc\u0646\u06af \u062a\u0645\u0627\u0633\u200c\u0647\u0627\u06cc \u0635\u0648\u062a\u06cc'}>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <AdminKpiCard title={'\u062a\u0645\u0627\u0633 \u0641\u0639\u0627\u0644'} value={stats.activeCount.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title={'\u0627\u0632 \u062f\u0633\u062a \u0631\u0641\u062a\u0647 (\u0662\u0664\u0633)'} value={stats.missed24h.toLocaleString('fa-IR')} accent="amber" />
      </div>
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      <p className="mt-2 text-xs text-(--color-secondaryText)">
        <Link href={ADMIN_SECTION_ROUTES.messages} className="text-(--color-coloredText)">
          {'\u0628\u0627\u0632\u0628\u06cc\u0646\u06cc \u0686\u062a'}
        </Link>
      </p>

      <Sheet open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="left" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{'\u062c\u0632\u0626\u06cc\u0627\u062a \u062a\u0645\u0627\u0633'}</SheetTitle>
          </SheetHeader>
          {detailLoading ? (
            <p className="py-8 text-sm text-muted-foreground">{'\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc\u2026'}</p>
          ) : detail ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div>
                <dt className="text-muted-foreground">ID</dt>
                <dd dir="ltr">{detail.call.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{'\u0648\u0636\u0639\u06cc\u062a'}</dt>
                <dd>{detail.call.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{'\u062a\u0645\u0627\u0633\u200c\u06af\u06cc\u0631\u0646\u062f\u0647'}</dt>
                <dd>{name(detail.call.caller)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">{'\u06af\u06cc\u0631\u0646\u062f\u0647'}</dt>
                <dd>{name(detail.call.callee)}</dd>
              </div>
              {detail.call.conversationId && (
                <div>
                  <dt className="text-muted-foreground">{'\u06af\u0641\u062a\u06af\u0648'}</dt>
                  <dd>
                    <Link href={`/chat/${detail.call.conversationId}`} className="text-(--color-coloredText)">
                      {detail.call.conversationId}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}
