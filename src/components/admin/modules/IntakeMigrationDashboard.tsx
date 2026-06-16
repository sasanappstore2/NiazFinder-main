'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, GitBranch, Layers, Shield } from 'lucide-react';
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
import { apiFetch } from '@/lib/api-client';
import type { IntakeMigrationDashboardData } from '@/intake/migration/dashboard-data';

function consumerStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Migrated') return 'success';
  if (status === 'Partial') return 'warning';
  return 'danger';
}

export function IntakeMigrationDashboard() {
  const { me, isLoading: authLoading, hasPermission } = useAdmin();
  const [data, setData] = useState<IntakeMigrationDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<IntakeMigrationDashboardData>('/api/super-admin/intake-migration');
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بارگذاری');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const onRefresh = () => void load();
    window.addEventListener('admin-refresh', onRefresh);
    return () => window.removeEventListener('admin-refresh', onRefresh);
  }, [load]);

  if (authLoading) return <IntakeAuthLoading />;
  if (!me || !hasPermission('ops:intake-migration:read')) {
    return <IntakeAccessDenied permission="ops:intake-migration:read" />;
  }

  return (
    <IntakeDashboardFrame
      title="مهاجرت Intake"
      description="کنترل Legacy در برابر Canonical — Shadow Mode، پرچم‌ها و معیار خروج"
      loading={loading}
      error={error}
      showData={Boolean(data)}
      onRefresh={load}
    >
      {data ? (
        <>
          <IntakeBlock
            title="آمادگی مهاجرت"
            description="امتیاز heuristic برای حذف Legacy"
            icon={Shield}
            highlight
            action={
              data.readiness.readyForLegacyRemoval ? (
                <AdminBadge variant="success">
                  <CheckCircle2 className="size-3" />
                  آماده حذف Legacy
                </AdminBadge>
              ) : (
                <AdminBadge variant="warning">
                  <AlertTriangle className="size-3" />
                  هنوز آماده نیست
                </AdminBadge>
              )
            }
          >
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="text-4xl font-black text-(--color-coloredText)">{data.readiness.score}%</p>
                <p className="mt-1 text-xs text-(--color-tertiaryText)">Ready for legacy removal</p>
              </div>
              <div className="space-y-1 text-xs text-(--color-secondaryText)">
                <p>Reads: {data.readiness.legacyReadComponent}%</p>
                <p>Writes: {data.readiness.legacyWriteComponent}%</p>
                <p>Drift: {data.readiness.driftComponent}%</p>
              </div>
            </div>
            {data.readiness.blockers.length > 0 ? (
              <ul className="mt-4 list-disc pr-5 text-xs text-(--color-secondaryText)">
                {data.readiness.blockers.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            ) : null}
          </IntakeBlock>

          <IntakeBlock
            title="Shadow Mode (۷ روز)"
            description="مقایسه PublishProjection با Legacy — بدون سوئیچ write"
            icon={GitBranch}
            highlight
            action={
              <AdminBadge variant={data.shadowMode.enabled ? 'success' : 'warning'}>
                {data.shadowMode.enabled ? 'فعال' : 'غیرفعال'}
              </AdminBadge>
            }
          >
            <IntakeMetricGrid>
              <IntakeMetric label="مقایسه" value={data.shadowMode.total} />
              <IntakeMetric label="Equal" value={data.shadowMode.equal} accent />
              <IntakeMetric label="Drift" value={data.shadowMode.diff} />
              <IntakeMetric label="Drift rate" value={`${data.shadowMode.driftPercent}%`} />
            </IntakeMetricGrid>
            {data.shadowMode.topDiffFields.length > 0 ? (
              <ul className="mt-4 space-y-1 text-xs text-(--color-secondaryText)">
                {data.shadowMode.topDiffFields.map((d) => (
                  <li key={d.field}>
                    {d.field}{' '}
                    <span className="font-medium text-(--color-primaryText)">({d.count})</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </IntakeBlock>

          <IntakeBlock title="Feature Flags" description="پیش‌فرض: خاموش" icon={Layers}>
            <div className="grid gap-2 md:grid-cols-2">
              {(
                [
                  ['INTAKE_CANONICAL_READ_ENABLED', data.featureFlags.canonicalReadEnabled],
                  ['LISTING_USE_CANONICAL', data.featureFlags.listingUseCanonical],
                  ['MATCH_ENGINE_USE_V2', data.featureFlags.matchEngineUseV2],
                  ['INTAKE_SHADOW_PUBLISH', data.featureFlags.shadowPublishEnabled],
                ] as const
              ).map(([name, on]) => (
                <div key={name} className="admin-intake-flag-row">
                  <code className="text-[11px] text-(--color-tertiaryText)">{name}</code>
                  <AdminBadge variant={on ? 'success' : 'neutral'}>{on ? 'ON' : 'OFF'}</AdminBadge>
                </div>
              ))}
            </div>
          </IntakeBlock>

          {data.templateIdBreakdown.length > 0 ? (
            <IntakeBlock title="Drift by Template (۷d)" icon={GitBranch}>
              <IntakeTableWrap>
                <table>
                  <thead>
                    <tr>
                      <th>Template</th>
                      <th>Publish</th>
                      <th>Drift</th>
                      <th>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.templateIdBreakdown.map((row) => (
                      <tr key={row.templateId}>
                        <td className="font-mono text-xs">{row.templateId}</td>
                        <td>{row.publishCount}</td>
                        <td className="text-amber-500">{row.diffCount}</td>
                        <td>{(row.driftRate * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </IntakeTableWrap>
            </IntakeBlock>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <IntakeBlock title="Legacy Writes (هدف: ۰)" icon={AlertTriangle}>
              <IntakeMetricGrid>
                <IntakeMetric label="۲۴h" value={data.legacyWrites.h24} />
                <IntakeMetric label="۷d" value={data.legacyWrites.d7} />
                <IntakeMetric label="۳۰d" value={data.legacyWrites.d30} />
              </IntakeMetricGrid>
              <p className="mt-3 text-xs text-(--color-tertiaryText)">
                In-memory (dev): {data.inMemoryLegacyWrites}
              </p>
            </IntakeBlock>

            <IntakeBlock title="Drift Monitor (امروز)" icon={GitBranch}>
              <p className="mb-3 text-xs text-(--color-secondaryText)">
                Published: {data.driftToday.publishedToday} · Compared: {data.driftToday.total}
              </p>
              <IntakeMetricGrid>
                <IntakeMetric label="Equal" value={data.driftToday.equal} accent />
                <IntakeMetric label="Diff" value={data.driftToday.diff} />
              </IntakeMetricGrid>
            </IntakeBlock>
          </div>

          <IntakeBlock
            title={`Consumer Status (${data.unmigratedCount} not migrated)`}
            icon={Layers}
          >
            <IntakeTableWrap>
              <table>
                <thead>
                  <tr>
                    <th>Consumer</th>
                    <th>Status</th>
                    <th>Read</th>
                    <th>Write</th>
                  </tr>
                </thead>
                <tbody>
                  {data.consumers.map((row) => (
                    <tr key={row.consumer}>
                      <td className="font-medium">{row.consumer}</td>
                      <td>
                        <AdminBadge variant={consumerStatusVariant(row.status)}>{row.status}</AdminBadge>
                      </td>
                      <td className="text-(--color-secondaryText)">{row.read}</td>
                      <td className="text-(--color-secondaryText)">{row.write}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </IntakeTableWrap>
          </IntakeBlock>

          <IntakeNote title="معیار خروج (۲–۴ هفته داده واقعی)">
            <ul className="list-disc pr-5 space-y-1">
              <li>Legacy Writes = 0 → {data.exitCriteria.legacyWritesZero ? '✓' : '✗'}</li>
              <li>Legacy Reads = 0 → {data.exitCriteria.legacyReadsZero ? '✓' : '✗'}</li>
              <li>Shadow Drift &lt; 0.1% (۷d) → {data.exitCriteria.driftBelowThreshold ? '✓' : '✗'}</li>
              <li>Shadow Mode فعال → {data.exitCriteria.shadowEnabled ? '✓' : '✗'}</li>
            </ul>
            <p className="mt-3">Matchability: فقط Analytics — هنوز وارد Ranking/Outreach نشده.</p>
          </IntakeNote>
        </>
      ) : null}
    </IntakeDashboardFrame>
  );
}
