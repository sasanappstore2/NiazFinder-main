'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  isPublished: boolean;
  createdAt: string;
  author?: { displayName: string | null; phone: string };
  userName?: string;
  commentText?: string;
  profile?: { name: string; slug: string };
};

export function ReviewsPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [tab, setTab] = useState<'service' | 'business'>('service');
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const endpoint = tab === 'service' ? '/api/super-admin/reviews' : '/api/super-admin/business-reviews';
      const res = await apiFetch<{ reviews: ReviewRow[]; pagination: { totalPages: number; total: number } }>(
        `${endpoint}?page=${page}&limit=20`
      );
      setRows(res.reviews);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, tab]);

  useEffect(() => { void load(); }, [load]);

  const togglePublish = async (id: string, isPublished: boolean) => {
    try {
      const endpoint = tab === 'service' ? '/api/super-admin/reviews' : '/api/super-admin/business-reviews';
      await apiFetch(endpoint, { method: 'PATCH', body: JSON.stringify({ id, isPublished }) });
      toast.success('به‌روزرسانی شد');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<ReviewRow>[] = [
    { id: 'rating', header: 'امتیاز', cell: (r) => r.rating },
    {
      id: 'text',
      header: 'متن',
      cell: (r) => r.comment ?? r.commentText ?? '—',
    },
    {
      id: 'target',
      header: 'هدف',
      cell: (r) => r.profile?.name ?? r.author?.displayName ?? r.author?.phone ?? '—',
    },
    {
      id: 'pub',
      header: 'انتشار',
      cell: (r) => (
        <AdminBadge variant={r.isPublished ? 'success' : 'warning'}>
          {r.isPublished ? 'منتشر' : 'مخفی'}
        </AdminBadge>
      ),
    },
  ];

  return (
    <AdminPageShell section="reviews" layout="table" description="بازبینی نظرات خدمات و کسب‌وکار">
      <div className="mb-4 flex gap-2">
        <Button variant={tab === 'service' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('service'); setPage(1); }}>نظرات خدمات</Button>
        <Button variant={tab === 'business' ? 'default' : 'outline'} size="sm" onClick={() => { setTab('business'); setPage(1); }}>نظرات کسب‌وکار</Button>
      </div>
      <AdminDataTable
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        rowActions={
          hasPermission('content:reviews:moderate')
            ? (r) => (
              <Button size="sm" variant="ghost" onClick={() => togglePublish(r.id, !r.isPublished)}>
                {r.isPublished ? 'مخفی' : 'انتشار'}
              </Button>
            )
            : undefined
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
