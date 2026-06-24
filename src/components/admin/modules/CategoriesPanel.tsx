'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Edit3,
  FolderTree,
  GitBranch,
  Layers3,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminFilterBar,
  AdminKpiCard,
  AdminKpiSkeleton,
  AdminPageShell,
  AdminTableSkeleton,
} from '@/components/admin/ui';
import type { AdminCategory, FlatCategory } from '@/components/admin/modules/shared/types';
import { formatNumber } from '@/components/admin/modules/shared/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { CategoryStatus } from '@prisma/client';
import { invalidateActiveCategorySlugsCache } from '@/hooks/use-active-category-slugs';

type CategoryFormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  parentId: string;
  order: string;
  status: CategoryStatus;
};

const initialCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Globe',
  image: '',
  parentId: 'root',
  order: '0',
  status: 'DISABLED',
};

function statusBadge(status: CategoryStatus) {
  if (status === 'ACTIVE') return <AdminBadge variant="success">فعال</AdminBadge>;
  if (status === 'COMING_SOON') return <AdminBadge variant="warning">به‌زودی</AdminBadge>;
  return <AdminBadge variant="neutral">غیرفعال</AdminBadge>;
}

export function CategoriesPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [form, setForm] = useState<CategoryFormState>(initialCategoryForm);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingStatus, setPendingStatus] = useState<{ id: string; status: CategoryStatus } | null>(null);
  const [impact, setImpact] = useState<{ activeRequests: number; skills: number; activeChildren: number } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{ categories: AdminCategory[]; flatCategories: FlatCategory[] }>(
        '/api/super-admin/categories'
      );
      setCategories(res.categories);
      setFlatCategories(res.flatCategories);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری دسته‌بندی‌ها');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => { void load(); };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  const rootCount = categories.length;
  const childCount = categories.reduce((sum, c) => sum + c.children.length, 0);
  const inactiveCount = categories.reduce((sum, c) => {
    let n = c.status === 'ACTIVE' ? 0 : 1;
    n += c.children.filter((ch) => ch.status !== 'ACTIVE').length;
    return sum + n;
  }, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => {
        const matchesRoot = cat.name.toLowerCase().includes(q) || cat.slug.toLowerCase().includes(q);
        const children = cat.children.filter(
          (ch) => ch.name.toLowerCase().includes(q) || ch.slug.toLowerCase().includes(q)
        );
        if (matchesRoot || children.length > 0) {
          return { ...cat, children: matchesRoot ? cat.children : children };
        }
        return null;
      })
      .filter(Boolean) as AdminCategory[];
  }, [categories, search]);

  const applyStatusChange = async (id: string, status: CategoryStatus) => {
    try {
      await apiFetch(`/api/super-admin/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success('وضعیت به‌روزرسانی شد');
      invalidateActiveCategorySlugsCache();
      if (form.id === id) setForm((f) => ({ ...f, status }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const requestStatusChange = async (id: string, status: CategoryStatus) => {
    if (status === 'ACTIVE') {
      await applyStatusChange(id, status);
      return;
    }
    try {
      const res = await apiFetch<{
        activeRequests: number;
        skills: number;
        activeChildren: number;
      }>(`/api/super-admin/categories/${id}/impact`);
      setImpact(res);
      setPendingStatus({ id, status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const saveCategory = async () => {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      icon: form.icon,
      image: form.image,
      parentId: form.parentId === 'root' ? null : form.parentId,
      order: Number(form.order) || 0,
      status: form.status,
    };

    if (form.id) {
      const existing = flatCategories.find((c) => c.id === form.id);
      if (existing?.status === 'ACTIVE' && form.status !== 'ACTIVE') {
        await requestStatusChange(form.id, form.status);
        return;
      }
    }

    try {
      if (form.id) {
        await apiFetch(`/api/super-admin/categories/${form.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی بروزرسانی شد');
      } else {
        await apiFetch('/api/super-admin/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('دسته‌بندی جدید ساخته شد');
      }
      setForm(initialCategoryForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره');
    }
  };

  const bulkSetStatus = async (status: CategoryStatus) => {
    if (selectedIds.size === 0) return;
    try {
      await apiFetch('/api/super-admin/categories/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: [...selectedIds], status }),
      });
      toast.success('به‌روزرسانی گروهی انجام شد');
      invalidateActiveCategorySlugsCache();
      setSelectedIds(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const editCategory = (category: AdminCategory | FlatCategory) => {
    const full =
      'children' in category
        ? category
        : [...categories, ...categories.flatMap((c) => c.children)].find((c) => c.id === category.id);
    if (!full) return;
    setForm({
      id: full.id,
      name: full.name,
      slug: full.slug,
      description: full.description || '',
      icon: full.icon || '',
      image: full.image || '',
      parentId: full.parentId || 'root',
      order: String(full.order ?? 0),
      status: full.status,
    });
  };

  const deleteCategory = async (id: string) => {
    try {
      const result = await apiFetch<{ mode: 'deleted' | 'deactivated'; message?: string }>(
        `/api/super-admin/categories/${id}`,
        { method: 'DELETE' }
      );
      toast.success(result.message || (result.mode === 'deleted' ? 'حذف شد' : 'غیرفعال شد'));
      if (form.id === id) setForm(initialCategoryForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در حذف');
    }
  };

  return (
    <AdminPageShell
      section="categories"
      layout="form"
      description="مدیریت نمایش mega menu نیازها — فقط ACTIVE برای کاربران عمومی"
      actions={
        <Button
          className="admin-btn-primary h-9 gap-2"
          onClick={() => {
            setForm(initialCategoryForm);
            document.getElementById('category-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <Plus className="size-4" />
          دسته جدید
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-amber-950 dark:text-amber-100">
          این taxonomy منوی <strong>دسته‌بندی نیازها</strong> (Header، Intake، مرور) را کنترل می‌کند — جدا از حرفه‌های کسب‌وکار.
          حالت راه‌اندازی: فقط زیرشاخه <strong>املاک</strong> ACTIVE است.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/super-admin/business-occupations"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            <Briefcase className="size-3.5" />
            دسته‌بندی کسب‌وکار
          </Link>
          <Link
            href="/super-admin/online-stores"
            className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-500/10 dark:text-amber-200"
          >
            <ShoppingBag className="size-3.5" />
            فروشگاه اینترنتی
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <AdminKpiSkeleton key={i} />
            ))}
          </div>
          <AdminTableSkeleton rows={6} />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <AdminKpiCard title="دسته اصلی" value={formatNumber(rootCount)} icon={<FolderTree className="size-5" />} />
            <AdminKpiCard title="زیردسته" value={formatNumber(childCount)} icon={<GitBranch className="size-5" />} accent="blue" />
            <AdminKpiCard title="غیرفعال / به‌زودی" value={formatNumber(inactiveCount)} icon={<Layers3 className="size-5" />} accent="amber" />
          </div>

          {selectedIds.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg)/50 p-3">
              <span className="text-sm">{selectedIds.size.toLocaleString('fa-IR')} انتخاب شده</span>
              <Button size="sm" onClick={() => void bulkSetStatus('ACTIVE')}>فعال‌سازی گروهی</Button>
              <Button size="sm" variant="outline" onClick={() => void bulkSetStatus('DISABLED')}>غیرفعال‌سازی گروهی</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>لغو انتخاب</Button>
            </div>
          )}

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(280px,340px)_1fr]">
            <aside id="category-form-panel" className="admin-paper h-fit space-y-4 p-5 xl:sticky xl:top-20">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نام</Label>
                  <Input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">اسلاگ</Label>
                  <Input dir="ltr" className="admin-input font-mono text-sm" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">وضعیت</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CategoryStatus })}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE — قابل استفاده عمومی</SelectItem>
                      <SelectItem value="DISABLED">DISABLED — مخفی از کاربر</SelectItem>
                      <SelectItem value="COMING_SOON">COMING_SOON — به‌زودی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">والد</Label>
                  <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">دسته‌بندی اصلی</SelectItem>
                      {flatCategories.filter((c) => !c.parentId && c.id !== form.id).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">توضیحات</Label>
                  <Textarea className="admin-input min-h-[72px] resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button className="admin-btn-primary flex-1 gap-2" onClick={() => void saveCategory()} disabled={!form.name.trim()}>
                  <Save className="size-4" />
                  ذخیره
                </Button>
                <Button variant="outline" onClick={() => setForm(initialCategoryForm)}>پاک‌سازی</Button>
              </div>
            </aside>

            <div className="admin-paper overflow-hidden">
              <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="جستجو نام یا slug..." />
              <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
                {filtered.map((category) => (
                  <article key={category.id} className="rounded-xl border border-(--color-mainBorder) p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <input type="checkbox" checked={selectedIds.has(category.id)} onChange={() => toggleSelected(category.id)} className="mt-1" />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold">{category.name}</h3>
                            {statusBadge(category.status)}
                          </div>
                          <p className="mt-1 font-mono text-xs text-(--color-secondaryText)" dir="ltr">/{category.slug}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Select value={category.status} onValueChange={(v) => void requestStatusChange(category.id, v as CategoryStatus)}>
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="DISABLED">DISABLED</SelectItem>
                            <SelectItem value="COMING_SOON">COMING_SOON</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => editCategory(category)}><Edit3 className="size-3.5" /></Button>
                        <Button size="sm" variant="outline" className="text-rose-500" onClick={() => void deleteCategory(category.id)}><Trash2 className="size-3.5" /></Button>
                      </div>
                    </div>
                    {category.children.length > 0 && (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {category.children.map((child) => (
                          <div key={child.id} className="flex items-center justify-between rounded-lg border border-(--color-mainBorder) px-3 py-2">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={selectedIds.has(child.id)} onChange={() => toggleSelected(child.id)} />
                              <span className="text-sm">{child.name}</span>
                              {statusBadge(child.status)}
                            </div>
                            <Select value={child.status} onValueChange={(v) => void requestStatusChange(child.id, v as CategoryStatus)}>
                              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                                <SelectItem value="DISABLED">DISABLED</SelectItem>
                                <SelectItem value="COMING_SOON">SOON</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={Boolean(pendingStatus)} onOpenChange={(open) => { if (!open) { setPendingStatus(null); setImpact(null); } }}>
        <AlertDialogContent className="admin-content-zone">
          <AlertDialogHeader>
            <AlertDialogTitle>تأیید تغییر وضعیت</AlertDialogTitle>
            <AlertDialogDescription>
              {impact ? (
                <>
                  این دسته {impact.activeRequests.toLocaleString('fa-IR')} نیاز باز، {impact.skills.toLocaleString('fa-IR')} مهارت
                  و {impact.activeChildren.toLocaleString('fa-IR')} زیردسته فعال دارد. از دید کاربران عادی مخفی می‌شود.
                </>
              ) : (
                'ادامه می‌دهید؟'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus) void applyStatusChange(pendingStatus.id, pendingStatus.status);
                setPendingStatus(null);
                setImpact(null);
              }}
            >
              تأیید
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
