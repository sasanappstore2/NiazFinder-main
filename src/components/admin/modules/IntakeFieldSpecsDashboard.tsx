'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RotateCcw, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  IntakeAccessDenied,
  IntakeAuthLoading,
  IntakeDashboardFrame,
  IntakeNote,
  IntakeTableWrap,
} from '@/components/admin/intake/IntakeDashboardUi';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryFilterField } from '@/config/category-filters/types';

type CategorySummary = { slug: string; fieldCount: number; updatedAt: string | null };

type CategoryDetail = {
  categorySlug: string;
  overrides: CategoryFilterField[];
  merged: unknown[];
  historyCount: number;
  updatedAt: string | null;
};

export function IntakeFieldSpecsDashboard() {
  const { me, isLoading: authLoading, hasPermission, apiFetch } = useAdmin();
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [detail, setDetail] = useState<CategoryDetail | null>(null);
  const [jsonDraft, setJsonDraft] = useState('[]');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ categories: CategorySummary[] }>(
        '/api/super-admin/intake-field-specs'
      );
      setCategories(res.categories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const loadDetail = useCallback(
    async (slug: string) => {
      if (!slug.trim()) return;
      setDetailLoading(true);
      try {
        const res = await apiFetch<CategoryDetail>(
          `/api/super-admin/intake-field-specs/${encodeURIComponent(slug)}`
        );
        setDetail(res);
        setJsonDraft(JSON.stringify(res.overrides, null, 2));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری دسته');
      } finally {
        setDetailLoading(false);
      }
    },
    [apiFetch]
  );

  useEffect(() => {
    void loadList();
    const onRefresh = () => void loadList();
    window.addEventListener('admin-refresh', onRefresh);
    return () => window.removeEventListener('admin-refresh', onRefresh);
  }, [loadList]);

  useEffect(() => {
    if (selectedSlug) void loadDetail(selectedSlug);
  }, [selectedSlug, loadDetail]);

  const handleSave = async () => {
    if (!selectedSlug) return;
    let fields: CategoryFilterField[];
    try {
      fields = JSON.parse(jsonDraft) as CategoryFilterField[];
      if (!Array.isArray(fields)) throw new Error('باید آرایه باشد');
    } catch {
      toast.error('JSON نامعتبر است');
      return;
    }
    try {
      await apiFetch('/api/super-admin/intake-field-specs', {
        method: 'POST',
        body: JSON.stringify({ categorySlug: selectedSlug, fields }),
      });
      toast.success('ذخیره شد');
      await loadList();
      await loadDetail(selectedSlug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره');
    }
  };

  const handleRollback = async () => {
    if (!selectedSlug) return;
    try {
      await apiFetch(`/api/super-admin/intake-field-specs/${encodeURIComponent(selectedSlug)}/rollback`, {
        method: 'POST',
      });
      toast.success('بازگشت به نسخه قبلی انجام شد');
      await loadDetail(selectedSlug);
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'rollback ناموفق');
    }
  };

  const handleDelete = async () => {
    if (!selectedSlug) return;
    try {
      await apiFetch(`/api/super-admin/intake-field-specs/${encodeURIComponent(selectedSlug)}`, {
        method: 'DELETE',
      });
      toast.success('override حذف شد');
      setDetail(null);
      setJsonDraft('[]');
      await loadList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'حذف ناموفق');
    }
  };

  if (authLoading) return <IntakeAuthLoading />;
  if (!me || !hasPermission('ops:intake-field-specs:read')) {
    return <IntakeAccessDenied permission="ops:intake-field-specs:read" />;
  }

  return (
    <IntakeDashboardFrame
      title="فیلدهای Intake"
      description="مدیریت override فیلدهای فرم ثبت نیاز — بدون deploy"
      loading={loading}
      error={error}
      showData
      onRefresh={loadList}
    >
      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <IntakeTableWrap>
          <p className="border-b border-border/40 px-4 py-3 text-sm font-semibold">دسته‌های دارای override</p>
          {categories.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">هنوز override ذخیره نشده است.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {categories.map((c) => (
                <li key={c.slug}>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(c.slug)}
                    className={`flex w-full items-center justify-between gap-2 px-4 py-3 text-right text-sm transition-colors hover:bg-muted/40 ${
                      selectedSlug === c.slug ? 'bg-primary/10' : ''
                    }`}
                  >
                    <span className="font-medium">{c.slug}</span>
                    <AdminBadge variant="neutral">{c.fieldCount}</AdminBadge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </IntakeTableWrap>

        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <Label htmlFor="category-slug">slug دسته</Label>
              <Input
                id="category-slug"
                value={selectedSlug}
                onChange={(e) => setSelectedSlug(e.target.value.trim())}
                placeholder="real-estate"
                dir="ltr"
                className="mt-1"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => void loadDetail(selectedSlug)} disabled={!selectedSlug || detailLoading}>
              بارگذاری
            </Button>
          </div>

          {detail ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>نسخه‌های قبلی: {detail.historyCount}</span>
              {detail.updatedAt ? (
                <span>آخرین تغییر: {new Date(detail.updatedAt).toLocaleString('fa-IR')}</span>
              ) : null}
              <span>فیلد merge‌شده: {detail.merged.length}</span>
            </div>
          ) : null}

          <div>
            <Label htmlFor="fields-json">override فیلدها (JSON)</Label>
            <Textarea
              id="fields-json"
              value={jsonDraft}
              onChange={(e) => setJsonDraft(e.target.value)}
              className="mt-1 min-h-[280px] font-mono text-xs"
              dir="ltr"
              disabled={!hasPermission('ops:intake-field-specs:write')}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {hasPermission('ops:intake-field-specs:write') ? (
              <>
                <Button type="button" onClick={() => void handleSave()} disabled={!selectedSlug}>
                  <Save className="size-4" />
                  ذخیره
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleRollback()} disabled={!selectedSlug || !detail?.historyCount}>
                  <RotateCcw className="size-4" />
                  rollback
                </Button>
                <Button type="button" variant="outline" onClick={() => void handleDelete()} disabled={!selectedSlug || !detail?.overrides.length}>
                  <Trash2 className="size-4" />
                  حذف override
                </Button>
              </>
            ) : null}
            {selectedSlug ? (
              <Button type="button" variant="outline" asChild>
                <a
                  href={`/api/super-admin/intake-field-specs/${encodeURIComponent(selectedSlug)}/export?format=ts`}
                  download
                >
                  <Download className="size-4" />
                  export TS
                </a>
              </Button>
            ) : null}
          </div>

          <IntakeNote title="راهنما">
            تغییرات در{' '}
            <code dir="ltr" className="text-xs">
              data/intake-field-spec-overrides.json
            </code>{' '}
            ذخیره می‌شوند و از طریق{' '}
            <code dir="ltr" className="text-xs">
              GET /api/intake/field-spec-overrides
            </code>{' '}
            در runtime اعمال می‌گردند.
          </IntakeNote>
        </div>
      </div>
    </IntakeDashboardFrame>
  );
}
