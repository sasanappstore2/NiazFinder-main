'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, MoreHorizontal } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadCsv } from '@/lib/admin/export-csv';
import { BusinessAdminModal } from './businesses/BusinessAdminModal';
import type { BusinessTabId } from './businesses/types';

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
  user: { id: string; phone: string; displayName: string | null; firstName: string | null; lastName: string | null };
};

function ownerLabel(u: BusinessRow['user']) {
  return u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.phone;
}

export function BusinessesPanel() {
  const searchParams = useSearchParams();
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<BusinessRow[]>([]);
  const [stats, setStats] = useState({ active: 0, inactive: 0, pendingOnboarding: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [onboardingFilter, setOnboardingFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [modalBusinessId, setModalBusinessId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<BusinessTabId>('overview');

  useEffect(() => {
    const id = searchParams.get('id')?.trim();
    const status = searchParams.get('status')?.trim();
    const verified = searchParams.get('verified')?.trim();
    const onboarding = searchParams.get('onboarding')?.trim();
    if (status) setStatusFilter(status);
    if (verified === 'true' || verified === 'false') setVerifiedFilter(verified);
    if (onboarding === 'pending' || onboarding === 'complete') setOnboardingFilter(onboarding);
    if (id) {
      setModalBusinessId(id);
      setModalOpen(true);
    }
  }, [searchParams]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('q', search);
      if (statusFilter) params.set('status', statusFilter);
      if (verifiedFilter) params.set('verified', verifiedFilter);
      if (onboardingFilter) params.set('onboarding', onboardingFilter);
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
  }, [apiFetch, page, search, statusFilter, verifiedFilter, onboardingFilter]);

  useEffect(() => { void load(); }, [load]);

  const openModal = (id: string, tab: BusinessTabId = 'overview') => {
    setModalBusinessId(id);
    setModalTab(tab);
    setModalOpen(true);
  };

  const patchVerified = async (id: string, verified: boolean) => {
    try {
      await apiFetch(`/api/super-admin/businesses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ verified }),
      });
      toast.success('به‌روزرسانی شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const exportCsv = () => {
    downloadCsv(
      'businesses.csv',
      ['نام', 'slug', 'مالک', 'شماره', 'شهر', 'وضعیت', 'تأیید'],
      rows.map((r) => [
        r.name,
        r.slug,
        ownerLabel(r.user),
        r.user.phone,
        r.city ?? '',
        r.status,
        r.verified ? 'بله' : 'خیر',
      ])
    );
  };

  const applyPreset = (preset: 'active' | 'inactive' | 'pendingOnboarding') => {
    setPage(1);
    if (preset === 'active') {
      setStatusFilter('ACTIVE');
      setVerifiedFilter('');
      setOnboardingFilter('');
    } else if (preset === 'inactive') {
      setStatusFilter('INACTIVE');
      setVerifiedFilter('');
      setOnboardingFilter('');
    } else {
      setStatusFilter('');
      setVerifiedFilter('');
      setOnboardingFilter('pending');
    }
  };

  const columns: AdminColumn<BusinessRow>[] = [
    { id: 'name', header: 'نام', cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      id: 'owner',
      header: 'مالک',
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate">{ownerLabel(r.user)}</p>
          <p dir="ltr" className="text-xs text-(--color-secondaryText)">{r.user.phone}</p>
        </div>
      ),
    },
    { id: 'city', header: 'شهر', cell: (r) => r.city ?? '—' },
    {
      id: 'status',
      header: 'وضعیت',
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <AdminBadge variant={r.status === 'ACTIVE' ? 'success' : 'neutral'}>{r.status}</AdminBadge>
          {!r.onboardingCompletedAt && <AdminBadge variant="warning">onboarding</AdminBadge>}
        </div>
      ),
    },
    {
      id: 'verified',
      header: 'تأیید',
      cell: (r) =>
        r.verified ? <AdminBadge variant="success">بله</AdminBadge> : <AdminBadge variant="warning">خیر</AdminBadge>,
    },
    { id: 'rating', header: 'امتیاز', cell: (r) => r.rating.toFixed(1) },
  ];

  return (
    <AdminPageShell section="businesses" layout="table" description="مدیریت کامل پروفایل، تیم، کاتالوگ و moderation">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <button type="button" className="text-right" onClick={() => applyPreset('active')}>
          <AdminKpiCard title="فعال" value={stats.active.toLocaleString('fa-IR')} accent="green" />
        </button>
        <button type="button" className="text-right" onClick={() => applyPreset('inactive')}>
          <AdminKpiCard title="غیرفعال" value={stats.inactive.toLocaleString('fa-IR')} accent="amber" />
        </button>
        <button type="button" className="text-right" onClick={() => applyPreset('pendingOnboarding')}>
          <AdminKpiCard title="onboarding ناقص" value={stats.pendingOnboarding.toLocaleString('fa-IR')} accent="blue" />
        </button>
      </div>
      <AdminFilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="جستجو نام، slug، مالک..."
        onExport={exportCsv}
        filters={
          <>
            <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-32"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت</SelectItem>
                <SelectItem value="ACTIVE">فعال</SelectItem>
                <SelectItem value="INACTIVE">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifiedFilter || 'all'} onValueChange={(v) => { setVerifiedFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-32"><SelectValue placeholder="تأیید" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="true">تأیید شده</SelectItem>
                <SelectItem value="false">تأیید نشده</SelectItem>
              </SelectContent>
            </Select>
            <Select value={onboardingFilter || 'all'} onValueChange={(v) => { setOnboardingFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-36"><SelectValue placeholder="onboarding" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه onboarding</SelectItem>
                <SelectItem value="pending">ناقص</SelectItem>
                <SelectItem value="complete">تکمیل</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        onRowClick={(r) => openModal(r.id)}
        rowActions={(r) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openModal(r.id)}>مدیریت</DropdownMenuItem>
              <DropdownMenuItem onClick={() => openModal(r.id, 'moderation')}>بازبینی</DropdownMenuItem>
              {hasPermission('market:businesses:write') && (
                <DropdownMenuItem onClick={() => void patchVerified(r.id, !r.verified)}>
                  {r.verified ? 'لغو تأیید' : 'تأیید'}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href={`/b/${r.slug}`} target="_blank">
                  <ExternalLink className="size-4" />
                  پروفایل عمومی
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <BusinessAdminModal
        businessId={modalBusinessId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialTab={modalTab}
        onChanged={() => void load()}
      />
    </AdminPageShell>
  );
}
