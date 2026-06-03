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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  user: { phone: string; displayName: string | null };
};

export function NotificationsPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ notifications: NotificationRow[]; pagination: { totalPages: number; total: number } }>(
        `/api/super-admin/notifications?page=${page}&limit=20`
      );
      setRows(res.notifications);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => { void load(); }, [load]);

  const broadcast = async () => {
    try {
      const res = await apiFetch<{ sent: number }>('/api/super-admin/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ title: broadcastTitle, message: broadcastMessage, role: broadcastRole || undefined }),
      });
      toast.success(`${res.sent} اعلان ارسال شد`);
      setBroadcastTitle('');
      setBroadcastMessage('');
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const columns: AdminColumn<NotificationRow>[] = [
    { id: 'title', header: 'عنوان', cell: (r) => r.title },
    { id: 'type', header: 'نوع', cell: (r) => <AdminBadge variant="info">{r.type}</AdminBadge> },
    { id: 'read', header: 'خوانده', cell: (r) => r.isRead ? 'بله' : 'خیر' },
    { id: 'at', header: 'زمان', cell: (r) => new Date(r.createdAt).toLocaleString('fa-IR') },
  ];

  return (
    <AdminPageShell section="notifications" layout="table" description="مشاهده و ارسال اعلان سیستمی">
      {hasPermission('comms:notifications:write') && (
        <div className="mb-4 rounded-xl border border-(--color-mainBorder) p-4 space-y-3">
          <h3 className="font-semibold">Broadcast</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>عنوان</Label><Input value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} /></div>
            <div><Label>نقش (اختیاری)</Label><Input value={broadcastRole} onChange={(e) => setBroadcastRole(e.target.value)} placeholder="CLIENT, SPECIALIST..." /></div>
          </div>
          <div><Label>پیام</Label><Input value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} /></div>
          <Button className="admin-btn-primary" onClick={broadcast}>ارسال</Button>
        </div>
      )}
      <AdminFilterBar search="" onSearchChange={() => {}} />
      <AdminDataTable columns={columns} rows={rows} isLoading={isLoading} />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
    </AdminPageShell>
  );
}
