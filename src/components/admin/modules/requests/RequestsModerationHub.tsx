'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useModerationQueue } from './useModerationQueue';
import { ModerationQueueList } from './ModerationQueueList';
import { ModerationDetailPanel } from './ModerationDetailPanel';
import { ModerationRejectDialog } from './ModerationRejectDialog';
import { RequestAdminModal } from './RequestAdminModal';
import { Button } from '@/components/ui/button';
import { CheckCheck, ListChecks, RefreshCcw } from 'lucide-react';

type ApiRequest = {
  id: string;
  title: string;
  status: string;
  moderationStatus: string;
  city: string | null;
  proposalCount: number;
  user: { displayName: string | null; firstName: string | null; lastName: string | null; phone: string };
  category: { name: string } | null;
};

const TABS = [
  { id: 'queue', label: 'صف بازبینی' },
  { id: 'all', label: 'همه نیازها' },
] as const;

function AllRequestsTab() {
  const { apiFetch } = useAdmin();
  const [rows, setRows] = useState<ApiRequest[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modStatus, setModStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      if (modStatus) params.set('moderationStatus', modStatus);
      const res = await apiFetch<{ requests: ApiRequest[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/requests?${params}`
      );
      setRows(res.requests);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, q, status, modStatus]);

  useEffect(() => { void load(); }, [load]);

  const handleRowClick = (row: ApiRequest) => {
    setSelectedRequestId(row.id);
    setModalOpen(true);
  };

  const handleModalChanged = () => {
    void load();
    window.dispatchEvent(new Event('admin-refresh'));
  };

  const userName = (r: ApiRequest) =>
    r.user.displayName || `${r.user.firstName ?? ''} ${r.user.lastName ?? ''}`.trim() || r.user.phone;

  const columns: AdminColumn<ApiRequest>[] = [
    { id: 'title', header: 'عنوان', cell: (r) => <span className="font-medium">{r.title}</span> },
    { id: 'mod', header: 'بازبینی', cell: (r) => <AdminBadge variant="info">{r.moderationStatus}</AdminBadge> },
    { id: 'category', header: 'دسته', cell: (r) => r.category?.name ?? '—' },
    { id: 'user', header: 'کاربر', cell: (r) => userName(r) },
    { id: 'city', header: 'شهر', cell: (r) => r.city ?? '—' },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant="neutral">{r.status}</AdminBadge> },
    { id: 'proposals', header: 'پیشنهاد', cell: (r) => r.proposalCount.toLocaleString('fa-IR') },
  ];

  return (
    <>
      <AdminFilterBar
        search={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="جستجو..."
        filters={
          <>
            <Select value={modStatus || 'all'} onValueChange={(v) => { setModStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-36"><SelectValue placeholder="بازبینی" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="PENDING">در صف</SelectItem>
                <SelectItem value="APPROVED">تأیید</SelectItem>
                <SelectItem value="REJECTED_SOFT">رد موقت</SelectItem>
                <SelectItem value="REJECTED_FINAL">رد نهایی</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status || 'all'} onValueChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-32"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="PENDING_REVIEW">صف</SelectItem>
                <SelectItem value="OPEN">باز</SelectItem>
                <SelectItem value="REJECTED">رد شده</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      <RequestAdminModal
        requestId={selectedRequestId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onChanged={handleModalChanged}
      />
    </>
  );
}

export function RequestsModerationHub() {
  const { hasPermission } = useAdmin();
  const canModerate = hasPermission('market:requests:moderate');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(canModerate ? 'queue' : 'all');
  const [rejectOpen, setRejectOpen] = useState(false);

  const queue = useModerationQueue();

  const handleApprove = async () => {
    if (!queue.selectedId) return;
    const ok = await queue.moderateOne(queue.selectedId, 'approve');
    if (ok) toast.success('تأیید شد');
  };

  const handleRejectConfirm = async (action: 'reject_soft' | 'reject_final', reason: string) => {
    if (!queue.selectedId) return;
    const ok = await queue.moderateOne(queue.selectedId, action, reason);
    if (ok) toast.success(action === 'reject_soft' ? 'رد موقت شد' : 'رد نهایی شد');
  };

  useEffect(() => {
    if (tab !== 'queue' || !canModerate) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        void handleApprove();
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRejectOpen(true);
      }
      if (e.key === 'j' || e.key === 'J') {
        const idx = queue.items.findIndex((x) => x.id === queue.selectedId);
        if (idx < queue.items.length - 1) queue.setSelectedId(queue.items[idx + 1].id);
      }
      if (e.key === 'k' || e.key === 'K') {
        const idx = queue.items.findIndex((x) => x.id === queue.selectedId);
        if (idx > 0) queue.setSelectedId(queue.items[idx - 1].id);
      }
      if (e.shiftKey && (e.key === 'A')) {
        e.preventDefault();
        void queue.moderateBulk([...queue.selectedIds], 'approve');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tab, canModerate, queue]);

  return (
    <AdminPageShell
      section="requests"
      layout={tab === 'all' ? 'table' : 'form'}
      description="بازبینی، تأیید و مدیریت آگهی‌های نیاز"
      actions={
        <Button variant="outline" size="sm" onClick={() => { void queue.reload(); }}>
          <RefreshCcw className="size-4" />
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2 border-b border-(--color-mainBorder) pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-(--color-navItemActiveBg) text-(--color-coloredText)'
                : 'text-(--color-secondaryText) hover:bg-(--color-navItemBgHover)'
            )}
          >
            {t.label}
            {t.id === 'queue' && queue.stats && queue.stats.pending > 0 && (
              <span className="ms-2 rounded-full bg-(--color-mainColor) px-1.5 py-0.5 text-[10px] text-white">
                {queue.stats.pending.toLocaleString('fa-IR')}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'queue' && canModerate && (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <AdminKpiCard title="در صف" value={(queue.stats?.pending ?? 0).toLocaleString('fa-IR')} icon={<ListChecks className="size-5" />} accent="amber" />
            <AdminKpiCard title="بازبینی امروز (من)" value={(queue.stats?.myReviewedToday ?? 0).toLocaleString('fa-IR')} icon={<CheckCheck className="size-5" />} />
            <AdminKpiCard title="کل امروز" value={(queue.stats?.reviewedToday ?? 0).toLocaleString('fa-IR')} icon={<CheckCheck className="size-5" />} accent="blue" />
          </div>

          {queue.selectedIds.size > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) px-3 py-2">
              <span className="text-sm">{queue.selectedIds.size.toLocaleString('fa-IR')} انتخاب</span>
              <Button size="sm" className="admin-btn-primary h-8" onClick={() => void queue.moderateBulk([...queue.selectedIds], 'approve')}>
                تأیید دسته‌ای
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={queue.clearSelection}>
                پاک کردن
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={queue.selectAll}>
                انتخاب همه
              </Button>
            </div>
          )}

          <div className="admin-paper grid min-h-[480px] overflow-hidden lg:grid-cols-[minmax(260px,320px)_1fr]">
            <ModerationQueueList
              items={queue.items}
              selectedId={queue.selectedId}
              selectedIds={queue.selectedIds}
              onSelect={queue.setSelectedId}
              onToggle={queue.toggleSelect}
            />
            <ModerationDetailPanel
              detail={queue.detail}
              isLoading={queue.isDetailLoading}
              canModerate={queue.canModerate}
              onApprove={() => void handleApprove()}
              onReject={() => setRejectOpen(true)}
              onClaim={() => queue.selectedId && void queue.claim(queue.selectedId)}
            />
          </div>

          <p className="mt-2 text-xs text-(--color-secondaryText)">
            میانبر: A تأیید · R رد · J/K بعدی/قبلی · Shift+A تأیید دسته‌ای
          </p>

          <ModerationRejectDialog
            open={rejectOpen}
            onOpenChange={setRejectOpen}
            onConfirm={handleRejectConfirm}
          />
        </>
      )}

      {(tab === 'all' || !canModerate) && <AllRequestsTab />}
    </AdminPageShell>
  );
}
