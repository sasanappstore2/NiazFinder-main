'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bot, CheckCircle2, Database, Sparkles } from 'lucide-react';
import { useAdmin } from '@/components/admin/context/AdminContext';
import {
  IntakeAccessDenied,
  IntakeAuthLoading,
  IntakeBlock,
  IntakeDashboardFrame,
  IntakeMetric,
  IntakeMetricGrid,
  IntakeNote,
} from '@/components/admin/intake/IntakeDashboardUi';
import { AdminBadge } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api-client';
import type { IntakeTrainingDashboardData } from '@/intake/training/dashboardData';
import { entitySlugSummary } from '@/intake/training/trainingExample';

function slugFromEntities(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  return entitySlugSummary(raw as Record<string, unknown>);
}

export function IntakeTrainingDashboard() {
  const { me, isLoading: authLoading, hasPermission } = useAdmin();
  const [data, setData] = useState<IntakeTrainingDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<IntakeTrainingDashboardData>('/api/super-admin/intake-training');
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

  const markCorrect = async (id: string) => {
    if (!hasPermission('ops:intake-training:write')) return;
    setReviewingId(id);
    try {
      await apiFetch(`/api/super-admin/intake-training/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'mark_correct' }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بازبینی');
    } finally {
      setReviewingId(null);
    }
  };

  if (authLoading) return <IntakeAuthLoading />;
  if (!me || !hasPermission('ops:intake-training:read')) {
    return <IntakeAccessDenied permission="ops:intake-training:read" />;
  }

  return (
    <IntakeDashboardFrame
      title="داده آموزشی Intake"
      description="Capture، بازبینی انسانی، Gold Dataset و تحلیل Reject"
      loading={loading}
      error={error}
      showData={Boolean(data)}
      onRefresh={load}
    >
      {data ? (
        <>
          <IntakeBlock title="Learning KPIs" icon={Sparkles} highlight>
            <IntakeMetricGrid>
              <IntakeMetric label="Training Examples" value={data.counts.trainingExamples} />
              <IntakeMetric label="Reviewed" value={data.counts.reviewedExamples} accent />
              <IntakeMetric label="Pending Review" value={data.counts.pendingReview} />
              <IntakeMetric label="Gold Dataset" value={data.counts.goldDatasetSize} />
              <IntakeMetric label="Candidate Coverage (7d)" value={`${data.candidateCoverage.rate}%`} accent />
            </IntakeMetricGrid>
          </IntakeBlock>

          <IntakeBlock title="AI Validation Reject Analysis" icon={Bot}>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  ['24h', data.rejectAnalysis.h24],
                  ['7d', data.rejectAnalysis.d7],
                  ['30d', data.rejectAnalysis.d30],
                ] as const
              ).map(([label, report]) => (
                <div key={label} className="admin-intake-metric">
                  <p className="text-xs font-semibold text-(--color-tertiaryText)">Last {label}</p>
                  <p className="admin-intake-metric__value mt-2 text-xl">{report.total}</p>
                  <p className="admin-intake-metric__label">rejects</p>
                  <ul className="mt-3 space-y-1 text-xs text-(--color-secondaryText)">
                    {report.rows.slice(0, 5).map((r) => (
                      <li key={r.reason}>
                        {r.reason}: {r.count} ({r.percentage}%)
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </IntakeBlock>

          <IntakeBlock title="Candidate Failure Analytics (7d)" icon={Database}>
            <p className="mb-3 text-xs text-(--color-secondaryText)">
              Missing coverage: {data.candidateFailures.missingCoverage} /{' '}
              {data.candidateFailures.totalFailures}
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-(--color-primaryText)">Top Missing Categories</p>
                <ul className="space-y-1 text-xs text-(--color-secondaryText)">
                  {data.candidateFailures.topMissingCategories.map((r) => (
                    <li key={r.category}>
                      {r.category}{' '}
                      <span className="font-medium text-(--color-primaryText)">({r.count})</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-(--color-primaryText)">Top Ambiguous Categories</p>
                <ul className="space-y-1 text-xs text-(--color-secondaryText)">
                  {data.candidateFailures.topAmbiguousCategories.map((r) => (
                    <li key={r.category}>
                      {r.category}{' '}
                      <span className="font-medium text-(--color-primaryText)">({r.count})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </IntakeBlock>

          <IntakeBlock
            title="Review Queue"
            description={`${data.examples.length} نمونه اخیر`}
            icon={CheckCircle2}
          >
            <div className="space-y-3">
              {data.examples.length === 0 ? (
                <p className="text-sm text-(--color-secondaryText)">صف بازبینی خالی است.</p>
              ) : (
                data.examples.map((ex) => {
                  const published = slugFromEntities(ex.finalEntities);
                  const rule = ex.ruleResult as { entities?: Record<string, unknown> } | null;
                  const ruleSlugs = rule?.entities ? entitySlugSummary(rule.entities) : null;
                  const ai = ex.aiResult as { extraction?: { category?: string | null } } | null;
                  return (
                    <div key={ex.id} className="admin-intake-review-card">
                      <p className="text-sm font-medium text-(--color-primaryText)">
                        {ex.sourceText.slice(0, 160)}
                        {ex.sourceText.length > 160 ? '…' : ''}
                      </p>
                      <div className="mt-2 grid gap-1 text-xs text-(--color-secondaryText) md:grid-cols-3">
                        <p>Rule: {JSON.stringify(ruleSlugs?.category ?? '—')}</p>
                        <p>AI: {JSON.stringify(ai?.extraction?.category ?? '—')}</p>
                        <p>Published: {JSON.stringify(published?.category ?? '—')}</p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        {ex.reviewed ? (
                          <AdminBadge variant="success">
                            <CheckCircle2 className="size-3" />
                            Reviewed
                          </AdminBadge>
                        ) : hasPermission('ops:intake-training:write') ? (
                          <Button
                            type="button"
                            size="sm"
                            className="admin-btn-save h-8"
                            disabled={reviewingId === ex.id}
                            onClick={() => void markCorrect(ex.id)}
                          >
                            تأیید صحت
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </IntakeBlock>

          <IntakeNote title="دستورات">
            <ul className="space-y-1 font-mono text-[11px]">
              <li>npm run build:gold-dataset</li>
              <li>npm run evaluate:intake-ai:live</li>
            </ul>
          </IntakeNote>
        </>
      ) : null}
    </IntakeDashboardFrame>
  );
}
