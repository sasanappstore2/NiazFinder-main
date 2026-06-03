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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type CategoryFormState = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  parentId: string;
  order: string;
  isActive: boolean;
};

const initialCategoryForm: CategoryFormState = {
  name: '',
  slug: '',
  description: '',
  icon: 'Globe',
  image: '',
  parentId: 'root',
  order: '0',
  isActive: true,
};

export function CategoriesPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [form, setForm] = useState<CategoryFormState>(initialCategoryForm);
  const [search, setSearch] = useState('');

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
    let n = c.isActive ? 0 : 1;
    n += c.children.filter((ch) => !ch.isActive).length;
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

  const saveCategory = async () => {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      icon: form.icon,
      image: form.image,
      parentId: form.parentId === 'root' ? null : form.parentId,
      order: Number(form.order) || 0,
      isActive: form.isActive,
    };

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
      isActive: full.isActive,
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
      description="taxonomy آگهی و درخواست — جدا از دسته‌بندی کسب‌وکار"
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
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sky-900 dark:text-sky-100">
          این بخش فقط <strong>دسته‌بندی نیازها</strong> (آگهی/درخواست) است. برای مشاغل و حرفه‌های کسب‌وکار به بخش جدا بروید.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/super-admin/business-occupations"
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
          >
            <Briefcase className="size-3.5" />
            دسته‌بندی کسب‌وکار
          </Link>
          <Link
            href="/super-admin/online-stores"
            className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-semibold text-sky-800 hover:bg-sky-500/10 dark:text-sky-200"
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
            <AdminKpiCard title="غیرفعال" value={formatNumber(inactiveCount)} icon={<Layers3 className="size-5" />} accent="amber" />
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(280px,340px)_1fr]">
            <aside
              id="category-form-panel"
              className="admin-paper h-fit space-y-4 p-5 xl:sticky xl:top-20"
            >
              <div className="flex items-center gap-2 border-b border-(--color-mainBorder) pb-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-(--color-coloredText)/10 text-(--color-coloredText)">
                  {form.id ? <Edit3 className="size-4" /> : <Plus className="size-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold">{form.id ? 'ویرایش دسته' : 'افزودن دسته'}</h2>
                  <p className="text-[11px] text-(--color-secondaryText)">فرم را پر کنید و ذخیره بزنید</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">نام</Label>
                  <Input className="admin-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">اسلاگ</Label>
                  <Input
                    dir="ltr"
                    className="admin-input font-mono text-sm"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated-if-empty"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">والد</Label>
                  <Select value={form.parentId} onValueChange={(v) => setForm({ ...form, parentId: v })}>
                    <SelectTrigger className="admin-input"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="root">دسته‌بندی اصلی</SelectItem>
                      {flatCategories
                        .filter((c) => !c.parentId && c.id !== form.id)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">آیکن</Label>
                    <Input dir="ltr" className="admin-input font-mono text-sm" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ترتیب</Label>
                    <PersianDigitInput
                      variant="plain"
                      className="admin-input"
                      value={form.order}
                      onChange={(order) => setForm({ ...form, order })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تصویر (URL)</Label>
                  <Input dir="ltr" className="admin-input text-sm" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">توضیحات</Label>
                  <Textarea className="admin-input min-h-[72px] resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) px-3 py-2.5">
                  <span className="text-sm">فعال باشد</span>
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button className="admin-btn-primary flex-1 gap-2" onClick={saveCategory} disabled={!form.name.trim()}>
                  <Save className="size-4" />
                  ذخیره
                </Button>
                <Button variant="outline" className="admin-input" onClick={() => setForm(initialCategoryForm)}>
                  پاک‌سازی
                </Button>
              </div>
            </aside>

            <div className="admin-paper overflow-hidden">
              <AdminFilterBar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="جستجو در دسته‌ها..."
              />

              <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="mb-3 size-8 text-(--color-secondaryText)" />
                    <p className="text-sm font-medium">دسته‌ای یافت نشد</p>
                    <p className="mt-1 text-xs text-(--color-secondaryText)">فیلتر را تغییر دهید یا دسته جدید بسازید</p>
                  </div>
                ) : (
                  filtered.map((category) => (
                    <article
                      key={category.id}
                      className="group rounded-xl border border-(--color-mainBorder) bg-(--color-secondaryBg)/40 transition-colors hover:border-(--color-coloredText)/30 hover:bg-(--color-navItemBgHover)"
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <FolderTree className="size-4 shrink-0 text-(--color-coloredText)" />
                            <h3 className="font-bold text-(--color-primaryText)">{category.name}</h3>
                            {category.isActive ? (
                              <AdminBadge variant="success">فعال</AdminBadge>
                            ) : (
                              <AdminBadge variant="neutral">غیرفعال</AdminBadge>
                            )}
                          </div>
                          <p className="mt-1 font-mono text-xs text-(--color-secondaryText)" dir="ltr">
                            /{category.slug}
                          </p>
                          <p className="mt-2 text-xs text-(--color-secondaryText)">
                            {formatNumber(category.requestCount)} نیاز · {formatNumber(category.skillCount)} مهارت · {formatNumber(category.children.length)} زیردسته
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2 opacity-90 transition-opacity group-hover:opacity-100">
                          <Button size="sm" variant="outline" className="admin-input h-8 gap-1.5" onClick={() => editCategory(category)}>
                            <Edit3 className="size-3.5" />
                            ویرایش
                          </Button>
                          <Button size="sm" variant="outline" className="admin-input h-8 text-rose-500 hover:text-rose-600" onClick={() => deleteCategory(category.id)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {category.children.length > 0 && (
                        <div className="border-t border-(--color-mainBorder) bg-(--color-primaryBg)/50 px-4 py-3">
                          <div className="grid gap-2 md:grid-cols-2">
                            {category.children.map((child) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-primaryBg) px-3 py-2.5 transition-colors hover:border-(--color-coloredText)/25"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Layers3 className="size-3.5 shrink-0 text-(--color-secondaryText)" />
                                    <span className="truncate text-sm font-medium">{child.name}</span>
                                    {!child.isActive && <AdminBadge variant="neutral">غیرفعال</AdminBadge>}
                                  </div>
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-(--color-secondaryText)" dir="ltr">
                                    {child.slug}
                                  </p>
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button type="button" className="admin-icon-btn size-7" aria-label="ویرایش" onClick={() => editCategory(child)}>
                                    <Edit3 className="size-3.5" />
                                  </button>
                                  <button type="button" className="admin-icon-btn size-7 text-rose-500" aria-label="حذف" onClick={() => deleteCategory(child.id)}>
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminPageShell>
  );
}
