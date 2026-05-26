'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Plus, Save, Trash2, RefreshCcw } from 'lucide-react';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ADMIN_PERMISSION_GROUPS, ADMIN_PERMISSIONS, type AdminPermissionId } from '@/config/admin-permissions';
import { useAppStore } from '@/lib/store';

type ApiPermission = {
  id: string;
  label: string;
  group: string;
  description: string | null;
};

type ApiRole = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  userCount: number;
  permissionIds: string[];
};

export function RbacManager() {
  const authToken = useAppStore((s) => s.authToken);
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) ?? null,
    [roles, selectedRoleId]
  );

  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    permissionIds: Set<string>;
  }>({
    name: '',
    description: '',
    isActive: true,
    permissionIds: new Set<string>(),
  });

  const apiFetch = useCallback(
    async <T,>(url: string, init?: RequestInit): Promise<T> => {
      const res = await fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...((init?.headers as Record<string, string> | undefined) || {}),
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'عملیات انجام نشد');
      return data as T;
    },
    [authToken]
  );

  const loadAll = useCallback(async () => {
    if (!authToken) return;
    setIsLoading(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiFetch<{ roles: ApiRole[] }>('/api/super-admin/rbac/roles'),
        apiFetch<{ permissions: ApiPermission[] }>('/api/super-admin/rbac/permissions'),
      ]);
      setRoles(rolesRes.roles);
      setPermissions(permsRes.permissions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری RBAC');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, authToken]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedRole) return;
    setDraft({
      name: selectedRole.name,
      description: selectedRole.description ?? '',
      isActive: selectedRole.isActive,
      permissionIds: new Set(selectedRole.permissionIds),
    });
  }, [selectedRole]);

  const groupedPermissions = useMemo(() => {
    // Prefer canonical list ordering, but show DB-synced labels if present.
    const dbById = new Map(permissions.map((p) => [p.id, p]));
    const canon = ADMIN_PERMISSIONS.map((p) => ({
      id: p.id,
      label: dbById.get(p.id)?.label ?? p.label,
      group: dbById.get(p.id)?.group ?? p.group,
      description: dbById.get(p.id)?.description ?? p.description ?? null,
    }));

    const map = new Map<string, typeof canon>();
    for (const g of ADMIN_PERMISSION_GROUPS) map.set(g, []);
    for (const p of canon) {
      const group = (map.has(p.group) ? p.group : 'Core') as string;
      map.get(group)!.push(p);
    }
    return map;
  }, [permissions]);

  const togglePermission = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev.permissionIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, permissionIds: next };
    });
  };

  const createRole = async () => {
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
        permissionIds: [...draft.permissionIds],
      };
      const res = await apiFetch<{ role: ApiRole }>('/api/super-admin/rbac/roles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('نقش ساخته شد');
      setSelectedRoleId(res.role.id);
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ساخت نقش');
    }
  };

  const saveRole = async () => {
    if (!selectedRoleId) return;
    try {
      const payload = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
        isActive: draft.isActive,
        permissionIds: [...draft.permissionIds],
      };
      await apiFetch(`/api/super-admin/rbac/roles/${selectedRoleId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('نقش ذخیره شد');
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره نقش');
    }
  };

  const deleteRole = async () => {
    if (!selectedRoleId) return;
    try {
      await apiFetch(`/api/super-admin/rbac/roles/${selectedRoleId}`, { method: 'DELETE' });
      toast.success('نقش حذف/غیرفعال شد');
      setSelectedRoleId(null);
      setDraft({ name: '', description: '', isActive: true, permissionIds: new Set() });
      await loadAll();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در حذف نقش');
    }
  };

  const resetDraft = () => {
    setSelectedRoleId(null);
    setDraft({ name: '', description: '', isActive: true, permissionIds: new Set() });
  };

  const canSaveExisting = Boolean(selectedRoleId);
  const canCreate = !selectedRoleId;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-(--color-primaryText)">
            <ShieldCheck className="size-4 text-(--color-coloredText)" />
            نقش‌ها و دسترسی‌ها (RBAC)
          </h2>
          <p className="mt-1 text-xs leading-6 text-(--color-secondaryText)">
            برای هر نقش، دسترسی‌ها را تیک بزنید. این مجوزها مستقیماً روی APIهای سوپرادمین اعمال می‌شوند.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="admin-input h-9" onClick={loadAll} disabled={isLoading}>
            <RefreshCcw className="size-4" />
            همگام‌سازی
          </Button>
          <Button variant="outline" className="admin-input h-9" onClick={resetDraft}>
            نقش جدید
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          <div className="rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) p-3 text-xs text-(--color-secondaryText)">
            {roles.length ? (
              <>برای ویرایش، یک نقش را انتخاب کنید. برای ساخت، «نقش جدید» را بزنید.</>
            ) : (
              <>هنوز نقشی ساخته نشده است.</>
            )}
          </div>

          <div className="space-y-2">
            {roles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`w-full rounded-lg border px-3 py-3 text-right transition-colors ${
                  r.id === selectedRoleId
                    ? 'border-(--color-coloredText)/40 bg-(--color-coloredText)/10'
                    : 'border-(--color-mainBorder) bg-(--color-secondaryBg) hover:bg-(--color-navItemBgHover)'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{r.name}</span>
                  <div className="flex items-center gap-2">
                    {!r.isActive && <AdminBadge variant="neutral">غیرفعال</AdminBadge>}
                    <AdminBadge variant="info">{r.userCount} کاربر</AdminBadge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-(--color-secondaryText)">
                  {r.permissionIds.length} مجوز
                  {r.description ? ` · ${r.description}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) p-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>نام نقش</Label>
              <Input className="admin-input" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="space-y-2">
                <Label>فعال</Label>
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isActive} onCheckedChange={(v) => setDraft((p) => ({ ...p, isActive: v }))} />
                  <span className="text-xs text-(--color-secondaryText)">{draft.isActive ? 'فعال' : 'غیرفعال'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {canCreate ? (
                  <Button className="admin-btn-primary" onClick={createRole} disabled={!draft.name.trim()}>
                    <Plus className="size-4" />
                    ساخت
                  </Button>
                ) : (
                  <Button className="admin-btn-primary" onClick={saveRole} disabled={!draft.name.trim()}>
                    <Save className="size-4" />
                    ذخیره
                  </Button>
                )}
                {canSaveExisting && (
                  <Button variant="outline" className="admin-input" onClick={deleteRole}>
                    <Trash2 className="size-4" />
                    حذف
                  </Button>
                )}
              </div>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>توضیحات</Label>
              <Textarea
                className="admin-input min-h-[90px]"
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>

          <Separator className="bg-(--color-mainBorder)" />

          <div className="space-y-4">
            {[...groupedPermissions.entries()].map(([group, perms]) => (
              <div key={group} className="rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg)/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">{group}</h3>
                  <AdminBadge variant="neutral">{perms.length}</AdminBadge>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {perms.map((p) => {
                    const checked = draft.permissionIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePermission(p.id)}
                        className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-3 text-right transition-colors ${
                          checked
                            ? 'border-(--color-coloredText)/40 bg-(--color-coloredText)/10'
                            : 'border-(--color-mainBorder) bg-(--color-primaryBg) hover:bg-(--color-navItemBgHover)'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold">{p.label}</div>
                          {p.description && <div className="mt-1 text-xs text-(--color-secondaryText)">{p.description}</div>}
                          <div className="mt-2 text-[11px] font-mono text-(--color-secondaryText)" dir="ltr">
                            {p.id as AdminPermissionId}
                          </div>
                        </div>
                        <div className="pt-1">
                          <Switch checked={checked} onCheckedChange={() => togglePermission(p.id)} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

