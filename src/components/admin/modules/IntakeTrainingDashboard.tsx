'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Database,
  Download,
  FileText,
  GitCompare,
  Layers,
  Star,
} from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  IntakeAccessDenied,
  IntakeAuthLoading,
  IntakeBlock,
  IntakeDashboardFrame,
  IntakeMetric,
  IntakeMetricGrid,
  IntakeNote,
  IntakeTableWrap,
} from '@/components/admin/intake/IntakeDashboardUi';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type { TrainingExampleSummary } from '@/intake/training/trainingRepository';
import { IntakeTrainingExampleDetail } from '@/components/admin/modules/IntakeTrainingExampleDetail';

type TabId = 'overview' | 'examples' | 'corrections' | 'gold' | 'export';

interface TrainingStats {
  total: number;
  reviewed: number;
  goldDatasetSize: number;
  withCorrections: number;
  correctionRate: number;
  last7d: number;
  correctionByField: Record<string, number>;
  dailyTrend: Array<{ day: string; count: number }>;
}

interface DashboardData {
  stats: TrainingStats;
  list: {
    items: TrainingExampleSummary[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  recentExports: Array<{ dir: string; manifestPath: string; exportedAt?: string }>;
}

function truncate(text: string, max = 80): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function IntakeTrainingDashboard() {
  const { me, isLoading: authLoading, hasPermission } = useAdmin();
  const [tab, setTab] = useState<TabId>('overview');
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const listQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (tab === 'corrections') params.set('hasUserCorrections', 'true');
    if (tab === 'gold') params.set('reviewed', 'true');
    if (search.trim()) params.set('search', search.trim());
    return params.toString();
  }, [tab, search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = listQuery();
      const res = await apiFetch<DashboardData>(
        `/api/super-admin/intake-training${qs ? `?${qs}` : ''}`
      );
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, [listQuery]);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    window.addEventListener('admin-refresh', onRefresh);
    return () => window.removeEventListener('admin-refresh', onRefresh);
  }, [load]);

  const runExport = async (reviewedOnly: boolean) => {
    setExporting(true);
    try {
      const result = await apiFetch<{
        trainPath: string;
        valPath?: string;
        trainCount: number;
        valCount: number;
      }>('/api/super-admin/intake-training/export', {
        method: 'POST',
        body: JSON.stringify({ format: 'mlx-jsonl', reviewedOnly }),
      });
      alert(
        `Export OK — train: ${result.trainCount}, val: ${result.valCount}\n${result.trainPath}`
      );
      void load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'خطا در export');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading) return <IntakeAuthLoading />;
  if (!me || !hasPermission('ops:intake-training:read')) {
    return <IntakeAccessDenied permission="ops:intake-training:read" />;
  }

  const stats = data?.stats;
  const items = data?.list.items ?? [];

  const tabs: Array<{ id: TabId; label: string; icon: typeof Database }> = [
    { id: 'overview', label: 'نمای کلی', icon: Layers },
    { id: 'examples', label: 'همه نمونه‌ها', icon: FileText },
    { id: 'corrections', label: 'اصلاحات کاربر', icon: GitCompare },
    { id: 'gold', label: 'Gold Dataset', icon: Star },
    { id: 'export', label: 'Export', icon: Download },
  ];

  return (
    <IntakeDashboardFrame
      title="دیتاست آموزشی Intake"
      description="نمونه‌های capture شده از publish — اصلاحات کاربر، بررسی Gold، export فاین‌تیون"
      loading={loading}
      error={error}
      showData={Boolean(data)}
      onRefresh={load}
    >
      {data ? (
        <>
          <div className="flex flex-wrap gap-2 border-b border-(--color-cardBorder) pb-3">
            {tabs.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={tab === id ? 'default' : 'outline'}
                className="gap-1.5"
                onClick={() => setTab(id)}
              >
                <Icon className="size-3.5" />
                {label}
              </Button>
            ))}
          </div>

          {tab === 'overview' && stats ? (
            <>
              <IntakeBlock title="آمار کلی" icon={Database} highlight>
                <IntakeMetricGrid>
                  <IntakeMetric label="کل نمونه‌ها" value={stats.total} accent />
                  <IntakeMetric label="Gold (reviewed)" value={stats.reviewed} />
                  <IntakeMetric label="با اصلاح کاربر" value={stats.withCorrections} />
                  <IntakeMetric label="نرخ اصلاح" value={`${stats.correctionRate}%`} />
                  <IntakeMetric label="۷ روز اخیر" value={stats.last7d} />
                </IntakeMetricGrid>
              </IntakeBlock>

              <IntakeBlock title="اصلاحات به تفکیک فیلد" icon={GitCompare}>
                {Object.keys(stats.correctionByField).length === 0 ? (
                  <IntakeNote>هنوز اصلاحی ثبت نشده.</IntakeNote>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(stats.correctionByField).map(([field, count]) => (
                      <AdminBadge key={field} variant="neutral">
                        {field}: {count}
                      </AdminBadge>
                    ))}
                  </div>
                )}
              </IntakeBlock>

              <IntakeBlock title="روند ۷ روز" icon={Layers}>
                {stats.dailyTrend.length === 0 ? (
                  <IntakeNote>داده‌ای برای نمایش نیست.</IntakeNote>
                ) : (
                  <ul className="space-y-1 text-xs text-(--color-secondaryText)">
                    {stats.dailyTrend.map((d) => (
                      <li key={d.day} className="flex justify-between gap-4">
                        <span>{d.day}</span>
                        <span>{d.count} نمونه</span>
                      </li>
                    ))}
                  </ul>
                )}
              </IntakeBlock>
            </>
          ) : null}

          {(tab === 'examples' || tab === 'corrections' || tab === 'gold') && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  placeholder="جستجو در متن..."
                  className="rounded-lg border border-(--color-cardBorder) bg-(--color-inputBg) px-3 py-1.5 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void load()}
                />
                <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
                  جستجو
                </Button>
              </div>

              <IntakeBlock
                title={
                  tab === 'corrections'
                    ? 'نمونه‌های با اصلاح کاربر'
                    : tab === 'gold'
                      ? 'Gold Dataset'
                      : 'همه نمونه‌ها'
                }
                icon={FileText}
              >
                <IntakeTableWrap>
                  <table className="admin-intake-table w-full text-sm">
                    <thead>
                      <tr>
                        <th>تاریخ</th>
                        <th>متن</th>
                        <th>دسته</th>
                        <th>شهر</th>
                        <th>Flags</th>
                        <th>Gold</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-(--color-tertiaryText)">
                            نمونه‌ای یافت نشد
                          </td>
                        </tr>
                      ) : (
                        items.map((row) => (
                          <tr
                            key={row.id}
                            className="cursor-pointer hover:bg-(--color-navItemBgHover)"
                            onClick={() => setSelectedId(row.id)}
                          >
                            <td className="whitespace-nowrap text-xs">
                              {new Date(row.publishedAt).toLocaleDateString('fa-IR')}
                            </td>
                            <td>{truncate(row.sourceText)}</td>
                            <td>
                              <code className="text-[11px]">{row.categorySlug ?? '—'}</code>
                            </td>
                            <td>{row.city ?? '—'}</td>
                            <td>
                              <div className="flex flex-wrap gap-1">
                                {row.hasUserCorrections ? (
                                  <AdminBadge variant="warning">corrected</AdminBadge>
                                ) : null}
                                {row.qualityFlags.slice(0, 2).map((f) => (
                                  <AdminBadge key={f} variant="neutral">
                                    {f}
                                  </AdminBadge>
                                ))}
                              </div>
                            </td>
                            <td>
                              {row.reviewed ? (
                                <AdminBadge variant="success">Gold</AdminBadge>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </IntakeTableWrap>
                <p className="mt-2 text-xs text-(--color-tertiaryText)">
                  {data.list.total} نمونه — صفحه {data.list.page} از {data.list.totalPages}
                </p>
              </IntakeBlock>
            </>
          )}

          {tab === 'export' && (
            <IntakeBlock title="Export برای فاین‌تیون MLX" icon={Download} highlight>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={exporting}
                  onClick={() => void runExport(true)}
                >
                  Export Gold (reviewed)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={exporting}
                  onClick={() => void runExport(false)}
                >
                  Export همه نمونه‌ها
                </Button>
              </div>
              <IntakeNote className="mt-4">
                خروجی در <code>data/training-exports/</code> ذخیره می‌شود (train/val JSONL + manifest).
              </IntakeNote>
              {data.recentExports.length > 0 ? (
                <ul className="mt-4 space-y-2 text-xs text-(--color-secondaryText)">
                  {data.recentExports.map((ex) => (
                    <li key={ex.dir}>
                      <code>{ex.dir}</code>
                      {ex.exportedAt ? ` — ${ex.exportedAt}` : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </IntakeBlock>
          )}

          {selectedId ? (
            <IntakeTrainingExampleDetail
              id={selectedId}
              onClose={() => setSelectedId(null)}
              onUpdated={() => void load()}
            />
          ) : null}
        </>
      ) : null}
    </IntakeDashboardFrame>
  );
}
