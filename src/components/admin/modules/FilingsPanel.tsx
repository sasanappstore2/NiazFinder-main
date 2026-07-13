'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, ExternalLink, LayoutGrid, Play, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  AdminBadge,
  AdminDataTable,
  AdminFilterBar,
  AdminKpiCard,
  AdminKpiSkeleton,
  AdminPageShell,
  AdminPagination,
  type AdminColumn,
} from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatScraperStatusLabel } from '@/lib/filing-scrapers/scheduler';
import {
  deriveDisplayNameFromLoginUrl,
  resolveFilingSiteKey,
} from '@/lib/filing-scrapers/derive-site-key';
import { routeBuilder } from '@/config/routes';

type ScraperRow = {
  id: string;
  name: string;
  siteKey: string;
  enabled: boolean;
  loginUrl: string;
  listingsUrl: string;
  username: string;
  defaultCity: string;
  defaultNeighborhood: string | null;
  intervalMinutes: number;
  jitterMinutes: number;
  status: string;
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastImportedCount: number;
  lastError: string | null;
  filingsCount: number;
  siteConfig: Record<string, unknown>;
};

type FilingRow = {
  id: string;
  fileCode: string | null;
  title: string;
  city: string;
  neighborhood: string | null;
  location: string | null;
  price: string | null;
  deposit: string | null;
  monthlyRent: string | null;
  status: string;
  sourceSite: string | null;
  dataCompleteness?: number | null;
  enrichedAt?: string | null;
  reviewIssues?: string[];
  createdAt: string;
};

type ScraperForm = {
  name: string;
  siteKey: string;
  enabled: boolean;
  loginUrl: string;
  listingsUrl: string;
  username: string;
  password: string;
  defaultCity: string;
  defaultNeighborhood: string;
  intervalMinutes: string;
  jitterMinutes: string;
  usernameSelector: string;
  passwordSelector: string;
  submitSelector: string;
  customPrompt: string;
};

type ReviewEditForm = {
  title: string;
  fileCode: string;
  neighborhood: string;
  deposit: string;
  monthlyRent: string;
  price: string;
};

const emptyScraperForm: ScraperForm = {
  name: '',
  siteKey: '',
  enabled: true,
  loginUrl: '',
  listingsUrl: '',
  username: '',
  password: '',
  defaultCity: 'مشهد',
  defaultNeighborhood: '',
  intervalMinutes: '180',
  jitterMinutes: '10',
  usernameSelector: '',
  passwordSelector: '',
  submitSelector: '',
  customPrompt: '',
};

function scraperToForm(row: ScraperRow): ScraperForm {
  const cfg = row.siteConfig as {
    usernameSelector?: string;
    passwordSelector?: string;
    submitSelector?: string;
    customPrompt?: string;
    auth?: { usernameSelector?: string; passwordSelector?: string; submitSelector?: string };
    llmFallback?: { customPrompt?: string };
  };
  return {
    name: row.name,
    siteKey: row.siteKey,
    enabled: row.enabled,
    loginUrl: row.loginUrl,
    listingsUrl: row.listingsUrl,
    username: row.username,
    password: '',
    defaultCity: row.defaultCity,
    defaultNeighborhood: row.defaultNeighborhood ?? '',
    intervalMinutes: String(row.intervalMinutes),
    jitterMinutes: String(row.jitterMinutes),
    usernameSelector: cfg.auth?.usernameSelector ?? cfg.usernameSelector ?? '',
    passwordSelector: cfg.auth?.passwordSelector ?? cfg.passwordSelector ?? '',
    submitSelector: cfg.auth?.submitSelector ?? cfg.submitSelector ?? '',
    customPrompt: cfg.llmFallback?.customPrompt ?? cfg.customPrompt ?? '',
  };
}

export function FilingsPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const canWrite = hasPermission('market:filings:write');

  const [tab, setTab] = useState<'bots' | 'files' | 'review'>('bots');
  const [scrapers, setScrapers] = useState<ScraperRow[]>([]);
  const [files, setFiles] = useState<FilingRow[]>([]);
  const [reviewFiles, setReviewFiles] = useState<FilingRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loadingScrapers, setLoadingScrapers] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loadingReview, setLoadingReview] = useState(true);
  const [page, setPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reviewTotalPages, setReviewTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ScraperRow | null>(null);
  const [form, setForm] = useState<ScraperForm>(emptyScraperForm);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [reviewEdit, setReviewEdit] = useState<FilingRow | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewEditForm>({
    title: '',
    fileCode: '',
    neighborhood: '',
    deposit: '',
    monthlyRent: '',
    price: '',
  });

  const loadScrapers = useCallback(async () => {
    setLoadingScrapers(true);
    try {
      const res = await apiFetch<{ scrapers: ScraperRow[] }>('/api/super-admin/filing-scrapers');
      setScrapers(res.scrapers);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری ربات‌ها');
    } finally {
      setLoadingScrapers(false);
    }
  }, [apiFetch]);

  const loadFiles = useCallback(async () => {
    setLoadingFiles(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', status: 'all' });
      if (search.trim()) params.set('q', search.trim());
      const res = await apiFetch<{
        filings: FilingRow[];
        pagination: { totalPages: number; total: number };
        stats: { pendingReview: number };
      }>(`/api/super-admin/filings?${params}`);
      setFiles(res.filings);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
      setPendingCount(res.stats.pendingReview ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری فایل‌ها');
    } finally {
      setLoadingFiles(false);
    }
  }, [apiFetch, page, search]);

  const loadReview = useCallback(async () => {
    setLoadingReview(true);
    try {
      const params = new URLSearchParams({
        page: String(reviewPage),
        limit: '20',
        status: 'pending_review',
      });
      const res = await apiFetch<{
        filings: FilingRow[];
        pagination: { totalPages: number };
        stats: { pendingReview: number };
      }>(`/api/super-admin/filings?${params}`);
      setReviewFiles(res.filings);
      setReviewTotalPages(res.pagination.totalPages);
      setPendingCount(res.stats.pendingReview ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری صف بررسی');
    } finally {
      setLoadingReview(false);
    }
  }, [apiFetch, reviewPage]);

  useEffect(() => {
    void loadScrapers();
  }, [loadScrapers]);

  useEffect(() => {
    if (tab === 'files') void loadFiles();
    if (tab === 'review') void loadReview();
  }, [tab, loadFiles, loadReview]);

  useEffect(() => {
    const handler = () => {
      void loadScrapers();
      if (tab === 'files') void loadFiles();
      if (tab === 'review') void loadReview();
    };
    window.addEventListener('admin-refresh', handler);
    return () => window.removeEventListener('admin-refresh', handler);
  }, [loadScrapers, loadFiles, loadReview, tab]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyScraperForm);
    setDialogOpen(true);
  };

  const openEdit = (row: ScraperRow) => {
    setEditing(row);
    setForm(scraperToForm(row));
    setDialogOpen(true);
  };

  const openReviewEdit = (row: FilingRow) => {
    setReviewEdit(row);
    setReviewForm({
      title: row.title,
      fileCode: row.fileCode ?? '',
      neighborhood: row.neighborhood ?? '',
      deposit: row.deposit ?? '',
      monthlyRent: row.monthlyRent ?? '',
      price: row.price ?? '',
    });
  };

  const saveScraper = async () => {
    if (!form.loginUrl.trim()) {
      toast.error('آدرس ورود الزامی است');
      return;
    }
    if (!editing && !form.password.trim()) {
      toast.error('رمز عبور الزامی است');
      return;
    }

    setSaving(true);
    try {
      const loginUrl = form.loginUrl.trim();
      const listingsUrl = form.listingsUrl.trim() || loginUrl;
      const name = form.name.trim() || deriveDisplayNameFromLoginUrl(loginUrl);
      const payload = {
        name,
        ...(editing ? {} : { siteKey: resolveFilingSiteKey({ loginUrl }) }),
        enabled: form.enabled,
        loginUrl,
        listingsUrl,
        username: form.username.trim(),
        ...(form.password.trim() ? { password: form.password } : {}),
        defaultCity: form.defaultCity.trim(),
        defaultNeighborhood: form.defaultNeighborhood.trim() || null,
        intervalMinutes: Number(form.intervalMinutes) || 10,
        jitterMinutes: Number(form.jitterMinutes) || 4,
        siteConfig: {
          ...(form.usernameSelector.trim() ? { usernameSelector: form.usernameSelector.trim() } : {}),
          ...(form.passwordSelector.trim() ? { passwordSelector: form.passwordSelector.trim() } : {}),
          ...(form.submitSelector.trim() ? { submitSelector: form.submitSelector.trim() } : {}),
          ...(form.customPrompt.trim() ? { customPrompt: form.customPrompt.trim() } : {}),
        },
      };

      if (editing) {
        await apiFetch(`/api/super-admin/filing-scrapers/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('ربات به‌روز شد');
      } else {
        await apiFetch('/api/super-admin/filing-scrapers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('ربات اضافه شد');
      }

      setDialogOpen(false);
      void loadScrapers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق');
    } finally {
      setSaving(false);
    }
  };

  const saveReviewFiling = async (approve: boolean) => {
    if (!reviewEdit) return;
    setSaving(true);
    try {
      await apiFetch(`/api/super-admin/filings/${reviewEdit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: reviewForm.title.trim(),
          fileCode: reviewForm.fileCode.trim() || null,
          neighborhood: reviewForm.neighborhood.trim() || null,
          deposit: reviewForm.deposit.trim() || null,
          monthlyRent: reviewForm.monthlyRent.trim() || null,
          price: reviewForm.price.trim() || null,
          ...(approve ? { status: 'active' } : {}),
        }),
      });
      toast.success(approve ? 'فایل تأیید و فعال شد' : 'فایل ذخیره شد');
      setReviewEdit(null);
      void loadReview();
      void loadFiles();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق');
    } finally {
      setSaving(false);
    }
  };

  const runScraper = async (id: string) => {
    setRunningId(id);
    try {
      const res = await apiFetch<{ imported: number; enrichStarted?: boolean }>(
        `/api/super-admin/filing-scrapers/${id}/run`,
        { method: 'POST' }
      );
      if (res.enrichStarted) {
        toast.success(
          `${res.imported} فایل بروز شد · جزئیات و شماره‌ها در پس‌زمینه تکمیل می‌شود`
        );
      } else {
        toast.success(`${res.imported} فایل بروز شد`);
      }
      void loadScrapers();
      void loadFiles();
      void loadReview();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'اجرا ناموفق');
      void loadScrapers();
    } finally {
      setRunningId(null);
    }
  };

  const deleteScraper = async (row: ScraperRow) => {
    if (!confirm(`ربات «${row.name}» حذف شود؟`)) return;
    try {
      await apiFetch(`/api/super-admin/filing-scrapers/${row.id}`, { method: 'DELETE' });
      toast.success('ربات حذف شد');
      void loadScrapers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'حذف ناموفق');
    }
  };

  const scraperColumns: AdminColumn<ScraperRow>[] = useMemo(
    () => [
      { id: 'name', header: 'ربات', cell: (r) => <span className="font-medium">{r.name}</span> },
      {
        id: 'host',
        header: 'پورتال',
        cell: (r) => {
          try {
            return new URL(r.loginUrl).hostname.replace(/^www\./i, '');
          } catch {
            return r.loginUrl;
          }
        },
      },
      {
        id: 'schedule',
        header: 'بازه',
        cell: (r) => `${r.intervalMinutes}د +${r.jitterMinutes}د`,
      },
      {
        id: 'status',
        header: 'وضعیت',
        cell: (r) => (
          <AdminBadge variant={r.status === 'ok' ? 'success' : r.status === 'error' ? 'danger' : 'neutral'}>
            {formatScraperStatusLabel(r.status)}
          </AdminBadge>
        ),
      },
      {
        id: 'last',
        header: 'آخرین اجرا',
        cell: (r) =>
          r.lastSuccessAt
            ? `${new Date(r.lastSuccessAt).toLocaleString('fa-IR')} · ${r.lastImportedCount} فایل`
            : '—',
      },
      {
        id: 'err',
        header: 'خطا',
        cell: (r) => (
          <span className="line-clamp-2 max-w-[12rem] text-[11px] text-destructive">{r.lastError ?? ''}</span>
        ),
      },
    ],
    []
  );

  const fileColumns: AdminColumn<FilingRow>[] = useMemo(
    () => [
      { id: 'title', header: 'عنوان', cell: (r) => r.title },
      { id: 'loc', header: 'منطقه', cell: (r) => r.location ?? r.neighborhood ?? r.city },
      { id: 'src', header: 'منبع', cell: (r) => r.sourceSite ?? 'دستی' },
      { id: 'price', header: 'قیمت', cell: (r) => r.price ?? r.deposit ?? '—' },
      {
        id: 'complete',
        header: 'تکمیل',
        cell: (r) =>
          r.dataCompleteness != null ? (
            <span className="tabular-nums text-xs">{r.dataCompleteness}٪</span>
          ) : (
            '—'
          ),
      },
      {
        id: 'st',
        header: 'وضعیت',
        cell: (r) => (
          <AdminBadge
            variant={
              r.status === 'active' ? 'success' : r.status === 'pending_review' ? 'warning' : 'neutral'
            }
          >
            {r.status === 'active' ? 'فعال' : r.status === 'pending_review' ? 'بررسی' : 'بایگانی'}
          </AdminBadge>
        ),
      },
    ],
    []
  );

  const reviewColumns: AdminColumn<FilingRow>[] = useMemo(
    () => [
      { id: 'title', header: 'عنوان', cell: (r) => r.title },
      { id: 'code', header: 'کد', cell: (r) => r.fileCode ?? '—' },
      {
        id: 'issues',
        header: 'مشکلات',
        cell: (r) => (
          <div className="flex flex-wrap gap-1">
            {(r.reviewIssues ?? []).map((issue) => (
              <AdminBadge key={issue} variant="warning" className="text-[10px]">
                {issue}
              </AdminBadge>
            ))}
          </div>
        ),
      },
      { id: 'loc', header: 'محله', cell: (r) => r.neighborhood ?? '—' },
    ],
    []
  );

  const enabledCount = scrapers.filter((s) => s.enabled).length;

  return (
    <AdminPageShell
      section="filings"
      layout="table"
      description="ربات‌های کراول فایلینگ با Playwright و نقشه DOM؛ ویزارد پیشرفته برای هر سایت."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={routeBuilder.filingBrowse()} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4 ml-1" />
              فایلینگ عمومی /f
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={routeBuilder.workspace({ adminPreview: true })}>
              <LayoutGrid className="size-4 ml-1" />
              پیش‌نمایش میزکار
            </Link>
          </Button>
          {canWrite ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/super-admin/filings/wizard">
                  <Settings2 className="size-4 ml-1" />
                  راه‌اندازی پیشرفته
                </Link>
              </Button>
              <Button className="admin-btn-primary" onClick={openCreate}>
                <Plus className="size-4 ml-1" />
                ربات سریع
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {loadingScrapers ? (
          <>
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
            <AdminKpiSkeleton />
          </>
        ) : (
          <>
            <AdminKpiCard title="ربات‌ها" value={scrapers.length} icon={<Bot className="size-4" />} />
            <AdminKpiCard title="فعال" value={enabledCount} icon={<RefreshCw className="size-4" />} />
            <AdminKpiCard title="فایل‌های فید" value={total} icon={<LayoutGrid className="size-4" />} />
            <AdminKpiCard title="نیاز به بررسی" value={pendingCount} icon={<LayoutGrid className="size-4" />} />
          </>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'bots' | 'files' | 'review')}>
        <TabsList className="mb-4">
          <TabsTrigger value="bots">ربات‌های فایلینگ</TabsTrigger>
          <TabsTrigger value="files">فایل‌های واردشده</TabsTrigger>
          <TabsTrigger value="review">
            نیاز به بررسی
            {pendingCount > 0 ? ` (${pendingCount})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bots">
          <AdminDataTable
            columns={scraperColumns}
            rows={scrapers}
            isLoading={loadingScrapers}
            rowActions={
              canWrite
                ? (r) => (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={runningId === r.id}
                        onClick={() => void runScraper(r.id)}
                        title="اجرا الان"
                      >
                        <Play className="size-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/super-admin/filings/wizard/${r.id}`}>ویزارد</Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
                        ویرایش
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteScraper(r)}>
                        <Trash2 className="size-3.5 text-rose-500" />
                      </Button>
                    </div>
                  )
                : undefined
            }
          />
          <p className="mt-3 text-xs text-muted-foreground">
            برای اجرای خودکار هر ۳ ساعت: فاصله ربات را روی <strong>۱۸۰ دقیقه</strong> بگذارید و{' '}
            <code className="rounded bg-muted px-1">npm run filing-scrapers:scheduler</code> را اجرا کنید{' '}
            (نیاز به <code className="rounded bg-muted px-1">npm run dev:estate-scrape</code>).
            با یوزر/پسورد پورتال، شماره‌های تماس فایل‌ها هم بروز می‌شود.
          </p>
        </TabsContent>

        <TabsContent value="files">
          <AdminFilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            searchPlaceholder="جستجو..."
          />
          <AdminDataTable columns={fileColumns} rows={files} isLoading={loadingFiles} />
          <AdminPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="review">
          <AdminDataTable
            columns={reviewColumns}
            rows={reviewFiles}
            isLoading={loadingReview}
            rowActions={
              canWrite
                ? (r) => (
                    <Button size="sm" variant="outline" onClick={() => openReviewEdit(r)}>
                      بررسی / ویرایش
                    </Button>
                  )
                : undefined
            }
          />
          <AdminPagination
            page={reviewPage}
            totalPages={reviewTotalPages}
            total={pendingCount}
            onPageChange={setReviewPage}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? 'ویرایش ربات' : 'ربات فایلینگ جدید'}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 py-2">
            <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <Label>فعال</Label>
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>نام ربات (اختیاری)</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="از روی آدرس ورود پر می‌شود"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>آدرس ورود</Label>
              <Input value={form.loginUrl} onChange={(e) => setForm((f) => ({ ...f, loginUrl: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>آدرس لیست فایل‌ها (اختیاری)</Label>
              <Input
                value={form.listingsUrl}
                onChange={(e) => setForm((f) => ({ ...f, listingsUrl: e.target.value }))}
                dir="ltr"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نام کاربری</Label>
                <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>{editing ? 'رمز عبور (خالی = بدون تغییر)' : 'رمز عبور'}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>شهر پیش‌فرض فایل‌ها</Label>
                <Input value={form.defaultCity} onChange={(e) => setForm((f) => ({ ...f, defaultCity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>محله پیش‌فرض</Label>
                <Input
                  value={form.defaultNeighborhood}
                  onChange={(e) => setForm((f) => ({ ...f, defaultNeighborhood: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>فاصله (دقیقه)</Label>
                <Input
                  value={form.intervalMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, intervalMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>جitter تصادفی (دقیقه)</Label>
                <Input
                  value={form.jitterMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, jitterMinutes: e.target.value }))}
                />
              </div>
            </div>

            <details className="rounded-lg border border-border/60 p-3">
              <summary className="cursor-pointer text-sm font-medium">تنظیمات پیشرفته سایت (سلکتورها / ScrapeGraph)</summary>
              <div className="mt-3 grid gap-3">
                <Input
                  placeholder="usernameSelector (اختیاری)"
                  value={form.usernameSelector}
                  onChange={(e) => setForm((f) => ({ ...f, usernameSelector: e.target.value }))}
                  dir="ltr"
                />
                <Input
                  placeholder="passwordSelector (اختیاری)"
                  value={form.passwordSelector}
                  onChange={(e) => setForm((f) => ({ ...f, passwordSelector: e.target.value }))}
                  dir="ltr"
                />
                <Input
                  placeholder="submitSelector (اختیاری)"
                  value={form.submitSelector}
                  onChange={(e) => setForm((f) => ({ ...f, submitSelector: e.target.value }))}
                  dir="ltr"
                />
                <Textarea
                  placeholder="customPrompt برای ScrapeGraph (اختیاری)"
                  value={form.customPrompt}
                  onChange={(e) => setForm((f) => ({ ...f, customPrompt: e.target.value }))}
                  rows={3}
                />
              </div>
            </details>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              انصراف
            </Button>
            <Button className="admin-btn-primary" onClick={() => void saveScraper()} disabled={saving}>
              {editing ? 'ذخیره' : 'ایجاد ربات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(reviewEdit)} onOpenChange={(open) => !open && setReviewEdit(null)}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>بررسی فایل</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>عنوان</Label>
              <Input value={reviewForm.title} onChange={(e) => setReviewForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>کد فایل</Label>
              <Input value={reviewForm.fileCode} onChange={(e) => setReviewForm((f) => ({ ...f, fileCode: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>محله</Label>
              <Input value={reviewForm.neighborhood} onChange={(e) => setReviewForm((f) => ({ ...f, neighborhood: e.target.value }))} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>رهن</Label>
                <Input value={reviewForm.deposit} onChange={(e) => setReviewForm((f) => ({ ...f, deposit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>اجاره</Label>
                <Input value={reviewForm.monthlyRent} onChange={(e) => setReviewForm((f) => ({ ...f, monthlyRent: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>قیمت</Label>
                <Input value={reviewForm.price} onChange={(e) => setReviewForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            {reviewEdit?.reviewIssues?.length ? (
              <div className="flex flex-wrap gap-1">
                {reviewEdit.reviewIssues.map((issue) => (
                  <AdminBadge key={issue} variant="warning">
                    {issue}
                  </AdminBadge>
                ))}
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewEdit(null)} disabled={saving}>
              انصراف
            </Button>
            <Button variant="secondary" onClick={() => void saveReviewFiling(false)} disabled={saving}>
              ذخیره
            </Button>
            <Button className="admin-btn-primary" onClick={() => void saveReviewFiling(true)} disabled={saving}>
              تأیید و فعال‌سازی
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
