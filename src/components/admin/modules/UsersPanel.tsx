'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type ApiUser = {
  id: string;
  phone: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  isVerified: boolean;
};

type UserDetail = ApiUser & {
  banReason: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  counts: { requests: number; proposals: number; businessProfile: number };
  businessProfile: { id: string; name: string; slug: string } | null;
};

type ApiRole = { id: string; name: string; isActive: boolean };

export function UsersPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [assignUserId, setAssignUserId] = useState<string | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [banReason, setBanReason] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (q) params.set('q', q);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch<{ users: ApiUser[]; pagination: { totalPages: number; total: number } }>(`/api/super-admin/users?${params}`);
      setUsers(res.users);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, page, q, roleFilter, statusFilter]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);
  useEffect(() => {
    const h = () => { void loadUsers(); };
    window.addEventListener('admin-refresh', h);
    return () => window.removeEventListener('admin-refresh', h);
  }, [loadUsers]);

  useEffect(() => {
    if (!hasPermission('rbac:roles:read')) return;
    void apiFetch<{ roles: ApiRole[] }>('/api/super-admin/rbac/roles').then((r) => setRoles(r.roles.filter((x) => x.isActive))).catch(() => {});
  }, [apiFetch, hasPermission]);

  const openDetail = async (id: string) => {
    setDetailId(id);
    try {
      const res = await apiFetch<{ user: UserDetail }>(`/api/super-admin/users/${id}`);
      setDetail(res.user);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const patchUser = async (payload: Record<string, unknown>) => {
    if (!detailId) return;
    try {
      await apiFetch(`/api/super-admin/users/${detailId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      toast.success('ذخیره شد');
      void openDetail(detailId);
      void loadUsers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const displayName = (u: ApiUser) => u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || '—';

  const columns: AdminColumn<ApiUser>[] = [
    { id: 'name', header: 'کاربر', cell: (u) => <span className="font-medium text-(--color-primaryText)">{displayName(u)}</span> },
    { id: 'phone', header: 'شماره', cell: (u) => <span dir="ltr">{u.phone}</span> },
    { id: 'role', header: 'نقش', cell: (u) => <AdminBadge variant="info">{u.role}</AdminBadge> },
    {
      id: 'status',
      header: 'وضعیت',
      cell: (u) =>
        u.isBanned ? <AdminBadge variant="danger">مسدود</AdminBadge> : u.isActive ? <AdminBadge variant="success">فعال</AdminBadge> : <AdminBadge variant="neutral">غیرفعال</AdminBadge>,
    },
  ];

  const saveRoles = async () => {
    if (!assignUserId) return;
    try {
      await apiFetch('/api/super-admin/rbac/assignments', {
        method: 'POST',
        body: JSON.stringify({ userId: assignUserId, roleIds: [...selectedRoleIds] }),
      });
      toast.success('ذخیره شد');
      setAssignUserId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  return (
    <AdminPageShell section="users" layout="table" description="مدیریت حساب‌ها و نقش‌های کارمند">
      <AdminFilterBar
        search={q}
        onSearchChange={(v) => { setQ(v); setPage(1); }}
        searchPlaceholder="جستجو نام، ایمیل، شماره..."
        onExport={() => downloadCsv('users.csv', ['نام', 'شماره', 'نقش', 'وضعیت'], users.map((u) => [displayName(u), u.phone, u.role, u.isBanned ? 'مسدود' : u.isActive ? 'فعال' : 'غیرفعال']))}
        filters={
          <>
            <Select value={roleFilter || 'all'} onValueChange={(v) => { setRoleFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-36"><SelectValue placeholder="نقش" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه نقش‌ها</SelectItem>
                <SelectItem value="CLIENT">CLIENT</SelectItem>
                <SelectItem value="SPECIALIST">SPECIALIST</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="admin-input h-9 w-32"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="banned">مسدود</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <AdminDataTable
        columns={columns}
        rows={users}
        isLoading={isLoading}
        onRowClick={(u) => void openDetail(u.id)}
        rowActions={(u) =>
          hasPermission('rbac:assignments:write') && roles.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={async () => {
                  setAssignUserId(u.id);
                  try {
                    const res = await apiFetch<{ roleIds: string[] }>(`/api/super-admin/rbac/assignments?userId=${u.id}`);
                    setSelectedRoleIds(new Set(res.roleIds));
                  } catch { setSelectedRoleIds(new Set()); }
                }}>نقش کارمند</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      />
      <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />

      <AdminDetailDrawer
        open={Boolean(detailId && detail)}
        onClose={() => { setDetailId(null); setDetail(null); }}
        title={detail ? displayName(detail) : 'کاربر'}
        description={detail?.phone}
        footer={
          hasPermission('crm:users:write') && detail ? (
            <div className="space-y-3">
              <div>
                <Label>دلیل مسدودیت</Label>
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="اختیاری" />
              </div>
              <div className="flex flex-wrap gap-2">
                {detail.isBanned ? (
                  <Button onClick={() => patchUser({ isBanned: false })}>رفع مسدودیت</Button>
                ) : (
                  <Button variant="destructive" onClick={() => patchUser({ isBanned: true, banReason })}>مسدود</Button>
                )}
                <Button variant="outline" onClick={() => patchUser({ isActive: !detail.isActive })}>
                  {detail.isActive ? 'غیرفعال' : 'فعال'}
                </Button>
                <Button variant="outline" onClick={() => patchUser({ isVerified: !detail.isVerified })}>
                  {detail.isVerified ? 'لغو تأیید' : 'تأیید'}
                </Button>
                {hasPermission('crm:users:roles:write') && (
                  <Select value={detail.role} onValueChange={(role) => patchUser({ role })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLIENT">CLIENT</SelectItem>
                      <SelectItem value="SPECIALIST">SPECIALIST</SelectItem>
                      <SelectItem value="ADMIN">ADMIN</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-2 text-sm">
            <p>نیازها: {detail.counts.requests} · پیشنهادها: {detail.counts.proposals}</p>
            {detail.businessProfile ? (
              <p>
                کسب‌وکار:{' '}
                <Link href={`/b/${detail.businessProfile.slug}`} className="text-(--color-coloredText)">
                  {detail.businessProfile.name}
                </Link>
              </p>
            ) : null}
            <p>آخرین فعالیت: {detail.lastSeenAt ? new Date(detail.lastSeenAt).toLocaleString('fa-IR') : '—'}</p>
            {detail.banReason ? <p className="text-rose-500">دلیل مسدودیت: {detail.banReason}</p> : null}
          </div>
        ) : null}
      </AdminDetailDrawer>

      {assignUserId && (
        <div className="border-t border-(--color-mainBorder) p-4">
          <p className="mb-3 text-sm font-semibold">اختصاص نقش کارمند</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                  return next;
                })}
                className={`rounded-lg border px-3 py-2 text-right text-sm ${selectedRoleIds.has(r.id) ? 'border-(--color-coloredText) bg-(--color-coloredText)/10' : 'border-(--color-mainBorder)'}`}
              >
                {r.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Button className="admin-btn-primary" onClick={saveRoles}>ذخیره</Button>
            <Button variant="outline" onClick={() => setAssignUserId(null)}>انصراف</Button>
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}
