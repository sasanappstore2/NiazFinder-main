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
  Store,
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
import { formatNumber } from '@/components/admin/modules/shared/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PersianDigitInput } from '@/components/ui/persian-digit-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type StoreRow = {
  slug: string;
  title: string;
  englishTitle?: string;
  parentSlug: string | null;
  depth: 0 | 1;
  sortOrder?: number;
  isActive: boolean;
  profileCount: number;
};

type SectorNode = StoreRow & {
  jobs: StoreRow[];
};

type FormState = {
  editingSlug: string | null;
  slug: string;
  title: string;
  englishTitle: string;
  parentSlug: string;
  depth: '0' | '1';
  sortOrder: string;
  isActive: boolean;
};

const initialForm: FormState = {
  editingSlug: null,
  slug: '',
  title: '',
  englishTitle: '',
  parentSlug: '',
  depth: '1',
  sortOrder: '9999',
  isActive: true,
};

function buildSectorTree(categories: StoreRow[]): SectorNode[] {
  const sectors = categories
    .filter((o) => o.depth === 0)
    .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.title.localeCompare(b.title, 'fa'));

  const jobsBySector = new Map<string, StoreRow[]>();
  for (const job of categories.filter((o) => o.depth === 1)) {
    const key = job.parentSlug ?? '';
    if (!jobsBySector.has(key)) jobsBySector.set(key, []);
    jobsBySector.get(key)!.push(job);
  }

  for (const list of jobsBySector.values()) {
    list.sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999) || a.title.localeCompare(b.title, 'fa'));
  }

  return sectors.map((sector) => ({
    ...sector,
    jobs: jobsBySector.get(sector.slug) ?? [],
  }));
}

export function OnlineStoresPanel() {
  const { apiFetch } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<StoreRow[]>([]);
  const [sectors, setSectors] = useState<Array<{ slug: string; title: string }>>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch<{
        categories: StoreRow[];
        sectors: Array<{ slug: string; title: string; isActive?: boolean }>;
      }>('/api/super-admin/online-stores');
      setCategories(res.categories);
      setSectors(res.sectors.map((s) => ({ slug: s.slug, title: s.title })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری دسته‌بندی فروشگاه اینترنتی');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const handler = () => {
      void load();
    };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [load]);

  const sectorTree = useMemo(() => buildSectorTree(categories), [categories]);

  const sectorCount = sectorTree.length;
  const jobCount = categories.filter((o) => o.depth === 1).length;
  const inactiveCount = categories.filter((o) => o.isActive === false).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sectorTree;
    return sectorTree
      .map((sector) => {
        const matchesSector =
          sector.title.toLowerCase().includes(q) || sector.slug.toLowerCase().includes(q);
        const jobs = sector.jobs.filter(
          (job) =>
            job.title.toLowerCase().includes(q) ||
            job.slug.toLowerCase().includes(q) ||
            (job.englishTitle?.toLowerCase().includes(q) ?? false)
        );
        if (matchesSector || jobs.length > 0) {
          return { ...sector, jobs: matchesSector ? sector.jobs : jobs };
        }
        return null;
      })
      .filter(Boolean) as SectorNode[];
  }, [sectorTree, search]);

  const editStore = (row: StoreRow) => {
    setForm({
      editingSlug: row.slug,
      slug: row.slug,
      title: row.title,
      englishTitle: row.englishTitle ?? '',
      parentSlug: row.parentSlug ?? '',
      depth: String(row.depth) as '0' | '1',
      sortOrder: String(row.sortOrder ?? 9999),
      isActive: row.isActive !== false,
    });
    document.getElementById('online-store-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const saveStore = async () => {
    const payload = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      englishTitle: form.englishTitle.trim() || undefined,
      parentSlug: form.depth === '0' ? null : form.parentSlug || null,
      depth: Number(form.depth),
      sortOrder: Number(form.sortOrder) || 9999,
      isActive: form.isActive,
    };

    try {
      if (form.editingSlug) {
        await apiFetch(`/api/super-admin/online-stores/${encodeURIComponent(form.editingSlug)}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('بروزرسانی شد');
      } else {
        await apiFetch('/api/super-admin/online-stores', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('مورد جدید ساخته شد');
      }
      setForm(initialForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره');
    }
  };

  const deleteStore = async (slug: string) => {
    try {
      const result = await apiFetch<{ ok: boolean; deactivated?: boolean }>(
        `/api/super-admin/online-stores/${encodeURIComponent(slug)}`,
        { method: 'DELETE' }
      );
      toast.success(result.deactivated ? 'غیرفعال شد (در پروفایل استفاده شده)' : 'حذف شد');
      if (form.editingSlug === slug) setForm(initialForm);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در حذف');
    }
  };

  return (
    <AdminPageShell
      section="online-stores"
      layout="form"
      description="حوزه‌های فروش آنلاین (Digikala/Basalam-style) — جدا از مشاغل و نیازها"
      actions={
        <Button
          className="admin-btn-primary h-9 gap-2"
          onClick={() => {
            setForm(initialForm);
            document.getElementById('online-store-form-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
        >
          <Plus className="size-4" />
          مورد جدید
        </Button>
      }
    >
      <div className="mb-4 flex flex-col gap-2 rounded-lg border border-violet-500/30 bg-violet-500/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-violet-900 dark:text-violet-100">
          این بخش فقط <strong>فروشگاه‌های اینترنتی</strong> (حوزه محصول) است. slugها باید با پیشوند <code dir="ltr">online-</code> باشند.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href="/super-admin/business-occupations"
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            <Briefcase className="size-3.5" />
            دسته‌بندی کسب‌وکار
          </Link>
          <Link
            href="/super-admin/categories"
            className="inline-flex items-center gap-2 rounded-lg border border-violet-500/40 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-500/10 dark:text-violet-200"
          >
            <FolderTree className="size-3.5" />
            دسته‌بندی نیازها
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
            <AdminKpiCard title="sector" value={formatNumber(sectorCount)} icon={<Store className="size-5" />} />
            <AdminKpiCard title="زیردسته" value={formatNumber(jobCount)} icon={<GitBranch className="size-5" />} accent="blue" />
            <AdminKpiCard title="غیرفعال" value={formatNumber(inactiveCount)} icon={<Layers3 className="size-5" />} accent="amber" />
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(280px,340px)_1fr]">
            <aside
              id="online-store-form-panel"
              className="admin-paper h-fit space-y-4 p-5 xl:sticky xl:top-20"
            >
              <div className="flex items-center gap-2 border-b border-(--color-mainBorder) pb-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-(--color-coloredText)/10 text-(--color-coloredText)">
                  {form.editingSlug ? <Edit3 className="size-4" /> : <Plus className="size-4" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold">
                    {form.editingSlug ? 'ویرایش مورد' : 'افزودن مورد'}
                  </h2>
                  <p className="text-[11px] text-(--color-secondaryText)">sector یا زیردسته — فرم را پر کنید</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">عنوان فارسی</Label>
                  <Input
                    className="admin-input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">اسلاگ</Label>
                  <Input
                    dir="ltr"
                    className="admin-input font-mono text-sm"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    disabled={Boolean(form.editingSlug)}
                    placeholder="online-example-leaf"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">عنوان انگلیسی</Label>
                  <Input
                    dir="ltr"
                    className="admin-input text-sm"
                    value={form.englishTitle}
                    onChange={(e) => setForm({ ...form, englishTitle: e.target.value })}
                    placeholder="Example Leaf"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">نوع</Label>
                  <Select
                    value={form.depth}
                    onValueChange={(v) => setForm({ ...form, depth: v as '0' | '1', parentSlug: v === '0' ? '' : form.parentSlug })}
                  >
                    <SelectTrigger className="admin-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">sector (دسته اصلی)</SelectItem>
                      <SelectItem value="1">زیردسته (زیرمجموعه)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.depth === '1' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">sector والد</Label>
                    <Select
                      value={form.parentSlug || 'none'}
                      onValueChange={(v) => setForm({ ...form, parentSlug: v === 'none' ? '' : v })}
                    >
                      <SelectTrigger className="admin-input">
                        <SelectValue placeholder="انتخاب sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((s) => (
                          <SelectItem key={s.slug} value={s.slug}>
                            {s.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">ترتیب نمایش</Label>
                  <PersianDigitInput
                    variant="plain"
                    className="admin-input"
                    value={form.sortOrder}
                    onChange={(sortOrder) => setForm({ ...form, sortOrder })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-(--color-mainBorder) bg-(--color-secondaryBg) px-3 py-2.5">
                  <span className="text-sm">فعال باشد</span>
                  <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="admin-btn-primary flex-1 gap-2"
                  onClick={saveStore}
                  disabled={!form.title.trim() || !form.slug.trim() || (form.depth === '1' && !form.parentSlug)}
                >
                  <Save className="size-4" />
                  ذخیره
                </Button>
                <Button variant="outline" className="admin-input" onClick={() => setForm(initialForm)}>
                  پاک‌سازی
                </Button>
              </div>
            </aside>

            <div className="admin-paper overflow-hidden">
              <AdminFilterBar search={search} onSearchChange={setSearch} searchPlaceholder="جستجو در sectorها و زیردسته‌ها..." />

              <div className="max-h-[calc(100vh-18rem)] space-y-3 overflow-y-auto p-4">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="mb-3 size-8 text-(--color-secondaryText)" />
                    <p className="text-sm font-medium">موردی یافت نشد</p>
                    <p className="mt-1 text-xs text-(--color-secondaryText)">فیلتر را تغییر دهید یا مورد جدید بسازید</p>
                  </div>
                ) : (
                  filtered.map((sector) => (
                    <article
                      key={sector.slug}
                      className="group rounded-xl border border-(--color-mainBorder) bg-(--color-secondaryBg)/40 transition-colors hover:border-(--color-coloredText)/30 hover:bg-(--color-navItemBgHover)"
                    >
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Store className="size-4 shrink-0 text-(--color-coloredText)" />
                            <h3 className="font-bold text-(--color-primaryText)">{sector.title}</h3>
                            {sector.isActive !== false ? (
                              <AdminBadge variant="success">فعال</AdminBadge>
                            ) : (
                              <AdminBadge variant="neutral">غیرفعال</AdminBadge>
                            )}
                            <AdminBadge variant="neutral">sector</AdminBadge>
                          </div>
                          <p className="mt-1 font-mono text-xs text-(--color-secondaryText)" dir="ltr">
                            /{sector.slug}
                          </p>
                          <p className="mt-2 text-xs text-(--color-secondaryText)">
                            {formatNumber(sector.profileCount)} پروفایل · {formatNumber(sector.jobs.length)} زیردسته
                            {sector.englishTitle ? ` · ${sector.englishTitle}` : ''}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2 opacity-90 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="admin-input h-8 gap-1.5"
                            onClick={() => editStore(sector)}
                          >
                            <Edit3 className="size-3.5" />
                            ویرایش
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="admin-input h-8 text-rose-500 hover:text-rose-600"
                            onClick={() => deleteStore(sector.slug)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      {sector.jobs.length > 0 && (
                        <div className="border-t border-(--color-mainBorder) bg-(--color-primaryBg)/50 px-4 py-3">
                          <div className="grid gap-2 md:grid-cols-2">
                            {sector.jobs.map((job) => (
                              <div
                                key={job.slug}
                                className="flex items-center justify-between gap-2 rounded-lg border border-(--color-mainBorder) bg-(--color-primaryBg) px-3 py-2.5 transition-colors hover:border-(--color-coloredText)/25"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Layers3 className="size-3.5 shrink-0 text-(--color-secondaryText)" />
                                    <span className="truncate text-sm font-medium">{job.title}</span>
                                    {job.isActive === false && <AdminBadge variant="neutral">غیرفعال</AdminBadge>}
                                  </div>
                                  <p className="mt-0.5 truncate font-mono text-[10px] text-(--color-secondaryText)" dir="ltr">
                                    {job.slug}
                                  </p>
                                  {job.profileCount > 0 && (
                                    <p className="mt-0.5 text-[10px] text-(--color-secondaryText)">
                                      {formatNumber(job.profileCount)} پروفایل
                                    </p>
                                  )}
                                </div>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    className="admin-icon-btn size-7"
                                    aria-label="ویرایش"
                                    onClick={() => editStore(job)}
                                  >
                                    <Edit3 className="size-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-icon-btn size-7 text-rose-500"
                                    aria-label="حذف"
                                    onClick={() => deleteStore(job.slug)}
                                  >
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
