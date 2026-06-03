'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminDetailDrawer,
  AdminFilterBar,
  AdminKpiCard,
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
import { downloadCsv } from '@/lib/admin/export-csv';

type BusinessRow = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  status: string;
  verified: boolean;
  onboardingCompletedAt: string | null;
  rating: number;
  reviewCount: number;
  user: { id: string; phone: string; displayName: string | null };
};

type BusinessDetail = BusinessRow & {
  description: string | null;
  leadAlertsEnabled: boolean;
  _count: { offers: number; portfolioItems: number; profileReviews: number; leadOutreach: number };
};

export function BusinessesPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [stats, setStats] = useState({ active: 0, inactive: 0, pendingOnboarding: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [moderateReason, setModerateReason] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{
        businesses: BusinessRow[];
        stats: typeof stats;
        pagination: { totalPages: number; total: number };
      }>(`/api/super-admin/businesses?${params}`);
      setRows(res.businesses);
      setStats(res.stats);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    try {
      const res = await apiFetch<{ business: BusinessDetail }>(`/api/super-admin/businesses/${id}`);
      setDetail(res.business);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const moderate = async (action: 'approve' | 'reject' | 'suspend') => {
    if (!selectedId) return;
    try {
      await apiFetch(`/api/super-admin/businesses/${selectedId}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, reason: moderateReason }),
      });
      toast.success('اقدام ثبت شد');
      setSelectedId(null);
      setDetail(null);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'businesses.csv',
      ['نام', 'slug', 'شهر', 'وضعیت', 'تأیید'],
      rows.map((r) => [r.name, r.slug, r.city ?? '', r.status, r.verified ? 'بله' : 'خیر'])
    );
  };

  const columns: AdminColumn<BusinessRow>[] = [
    { id: 'name', header: 'نام', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'city', header: 'شهر', cell: (r) => r.city ?? '—' },
    { id: 'status', header: 'وضعیت', cell: (r) => <AdminBadge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</AdminBadge> },
    { id: 'verified', header: 'تأیید', cell: (r) => r.verified ? <AdminBadge variant="success">بله</AdminBadge> : <AdminBadge variant="warning">خیر</AdminBadge> },
    { id: 'rating', header: 'امتیاز', cell: (r) => r.rating.toFixed(1) },
    {
      id: 'link',
      header: '',
      cell: (r) => (
        <Link href={`/b/${r.slug}`} className="text-(--color-coloredText)"><ExternalLink className="size-4" /></Link>
      ),
    },
  ];

  return (
    <AdminPageShell section="businesses" layout="table" description="مدیریت و moderation پروفایل کسب‌وکار">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <AdminKpiCard title="فعال" value={stats.active.toLocaleString('fa-IR')} accent="green" />
        <AdminKpiCard title="غیرفعال" value={stats.inactive.toLocaleString('fa-IR')} accent="amber" />
        <AdminKpiCard title="onboarding ناقص" value={stats.pendingOnboarding.toLocaleString('fa-IR')} accent="blue" />
      </div>
      <AdminFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="جستجو نام، slug..."
        onExport={exportCsv}
        filters={
          <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="admin-input h-9 w-32"><SelectValue placeholder="وضعیت" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="ACTIVE">فعال</SelectItem>
              <SelectItem value="INACTIVE">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        }
      />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} onRowClick={(r) => void openDetail(r.id)} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <AdminDetailDrawer
        open={Boolean(selectedId && detail)}
        onClose={() => { setSelectedId(null); setDetail(null); }}
        title={detail?.name ?? 'کسب‌وکار'}
        description={detail?.slug}
        footer={
          hasPermission('market:businesses:moderate') ? (
            <div className="space-y-3">
              <Textarea value={moderateReason} onChange={(e) => setModerateReason(e.target.value)} placeholder="دلیل (اختیاری)" rows={2} />
              <div className="flex flex-wrap gap-2">
                <Button className="admin-btn-primary" onClick={() => moderate('approve')}>تأیید</Button>
                <Button variant="destructive" onClick={() => moderate('reject')}>رد</Button>
                <Button variant="outline" onClick={() => moderate('suspend')}>تعلیق</Button>
              </div>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-2 text-sm">
            <p>شهر: {detail.city ?? '—'}</p>
            <p>امتیاز: {detail.rating} ({detail.reviewCount} نظر)</p>
            <p>پیشنهادها: {detail._count.offers} · نمونه‌کار: {detail._count.portfolioItems}</p>
            <p>Outreach: {detail._count.leadOutreach}</p>
            <p className="text-(--color-secondaryText)">{detail.description || '—'}</p>
          </div>
        ) : null}
      </AdminDetailDrawer>
    </AdminPageShell>
  );
}
