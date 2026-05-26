'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
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

type Specialist = {
  id: string;
  displayName: string | null;
  firstName: string;
  lastName: string;
  city: string | null;
  isVerified: boolean;
  rating: number;
  projectCount: number;
  skills: { name: string }[];
};

export function BusinessesPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<Specialist[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const res = await apiFetch<{ data: Specialist[]; pagination: { totalPages: number; total: number } }>(`/api/specialists?${params}`);
      setRows(res.data ?? []);
      setTotalPages(res.pagination?.totalPages ?? 1);
      setTotal(res.pagination?.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, search]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const h = () => { void load(); };
    window.addEventListener('admin-refresh', h);
    return () => window.removeEventListener('admin-refresh', h);
  }, [load]);

  const name = (s: Specialist) => s.displayName || `${s.firstName} ${s.lastName}`.trim();

  const columns: AdminColumn<Specialist>[] = [
    { id: 'name', header: 'نام', cell: (s) => <span className="font-medium">{name(s)}</span> },
    { id: 'city', header: 'شهر', cell: (s) => s.city ?? '—' },
    { id: 'rating', header: 'امتیاز', cell: (s) => s.rating.toFixed(1) },
    { id: 'projects', header: 'پروژه', cell: (s) => s.projectCount.toLocaleString('fa-IR') },
    { id: 'skills', header: 'مهارت', cell: (s) => s.skills.slice(0, 2).map((sk) => sk.name).join('، ') || '—' },
    { id: 'verified', header: 'وضعیت', cell: (s) => s.isVerified ? <AdminBadge variant="success">تأیید</AdminBadge> : <AdminBadge variant="neutral">در انتظار</AdminBadge> },
    {
      id: 'link',
      header: '',
      cell: (s) => (
        <Link href={`/pro/${s.id}`} className="text-(--color-coloredText)"><ExternalLink className="size-4" /></Link>
      ),
    },
  ];

  return (
    <AdminPageShell section="businesses" layout="table" description="پروفایل متخصصان و کسب‌وکارهای فعال">
      <AdminFilterBar search={search} onSearchChange={(v) => { setSearch(v); setPage(1); }} searchPlaceholder="جستجو متخصص..." onExport={() => toast.info('خروجی Excel به‌زودی')} />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
