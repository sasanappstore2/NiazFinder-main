'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bot, CheckCircle2, Cpu, Target } from 'lucide-react';
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
import type { IntakeAiEvaluationDashboardData } from '@/ai/evaluation/dashboardData';

function formatValue(value: number, unit: '%' | 'ms') {
  return unit === 'ms' ? `${value}ms` : `${value}%`;
}

export function IntakeAiEvaluationDashboard() {
  const { me, isLoading: authLoading, hasPermission } = useAdmin();
  const [data, setData] = useState<IntakeAiEvaluationDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<IntakeAiEvaluationDashboardData>(
        '/api/super-admin/intake-ai-evaluation'
      );
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

  const lastRun = data?.lastRun;
  const metrics = lastRun?.metrics;

  return (
    <IntakeDashboardFrame
      title="ارزیابی AI Intake"
      description="Accuracy و KPI مدل Gemma/Ollama — Candidate Constrained Extraction"
      loading={loading}
      error={error}
      showData={Boolean(data)}
      onRefresh={load}
    >
      {data ? (
        <>
          <IntakeBlock title="پیکربندی AI" icon={Bot}>
            <div className="grid gap-2 md:grid-cols-2">
              {(
                [
                  ['Provider', data.config.provider],
                  ['Model', data.config.ollamaModel],
                  ['Enabled', data.config.enabled ? 'ON' : 'OFF'],
                  ['Confidence Threshold', String(data.config.confidenceThreshold)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="admin-intake-flag-row">
                  <span className="text-xs text-(--color-secondaryText)">{label}</span>
                  <code className="text-[11px] text-(--color-primaryText)">{value}</code>
                </div>
              ))}
            </div>
          </IntakeBlock>

          <IntakeBlock
            title="KPI Targets"
            icon={Target}
            highlight
            action={
              lastRun ? (
                <AdminBadge variant={lastRun.mode === 'live' ? 'success' : 'warning'}>
                  {lastRun.mode === 'live' ? 'Live (Ollama)' : lastRun.mode}
                </AdminBadge>
              ) : (
                <AdminBadge variant="warning">No run yet</AdminBadge>
              )
            }
          >
            {!lastRun ? (
              <p className="text-xs text-(--color-secondaryText)">
                هنوز ارزیابی Live اجرا نشده.{' '}
                <code className="rounded bg-(--color-inputBg) px-1 text-(--color-primaryText)">
                  INTAKE_EVAL_LIVE=1 npm run evaluate:intake-ai:live
                </code>
              </p>
            ) : (
              <p className="mb-4 text-xs text-(--color-secondaryText)">
                آخرین اجرا: {new Date(lastRun.ranAt).toLocaleString('fa-IR')} · {lastRun.datasetSize}{' '}
                نمونه · {Math.round(lastRun.durationMs / 1000)}s · {lastRun.failedCount} خطا
              </p>
            )}
            <IntakeTableWrap>
              <table>
                <thead>
                  <tr>
                    <th>KPI</th>
                    <th>Actual</th>
                    <th>Target</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(lastRun?.kpiStatus ?? data.kpiTargets).map((row) => (
                    <tr key={row.key}>
                      <td className="font-medium">{row.label}</td>
                      <td className="font-mono">{formatValue(row.actual, row.unit)}</td>
                      <td className="text-(--color-secondaryText)">
                        {row.lowerIsBetter ? '≤' : '≥'} {formatValue(row.target, row.unit)}
                      </td>
                      <td>
                        <AdminBadge variant={row.passed ? 'success' : 'danger'}>
                          {row.passed ? (
                            <>
                              <CheckCircle2 className="size-3" />
                              Pass
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="size-3" />
                              Fail
                            </>
                          )}
                        </AdminBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </IntakeTableWrap>
          </IntakeBlock>

          {metrics ? (
            <IntakeBlock title="Accuracy Breakdown" icon={Target}>
              <IntakeMetricGrid>
                {(
                  [
                    ['Category', metrics.category],
                    ['City', metrics.city],
                    ['Neighborhood', metrics.neighborhood],
                    ['Transaction', metrics.transactionType],
                  ] as const
                ).map(([label, field]) => (
                  <IntakeMetric
                    key={label}
                    label={`${label} (${field.correct}/${field.total})`}
                    value={`${field.accuracy}%`}
                    accent={field.accuracy >= 80}
                  />
                ))}
              </IntakeMetricGrid>
              {Object.keys(metrics.byVertical ?? {}).length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {Object.entries(metrics.byVertical).map(([v, f]) => (
                    <div key={v} className="admin-intake-metric">
                      <p className="admin-intake-metric__value text-base">{f.accuracy}%</p>
                      <p className="admin-intake-metric__label">
                        {v} ({f.correct}/{f.total})
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </IntakeBlock>
          ) : null}

          <IntakeBlock title="Learning Pipeline KPIs" icon={Bot} highlight>
            <IntakeMetricGrid>
              <IntakeMetric label="Training Examples" value={data.trainingCounts.trainingExamples} />
              <IntakeMetric label="Reviewed" value={data.trainingCounts.reviewedExamples} accent />
              <IntakeMetric label="Gold Dataset" value={data.trainingCounts.goldDatasetSize} />
              <IntakeMetric
                label="Candidate Coverage"
                value={`${lastRun?.metrics.candidateCoverageRate ?? data.candidateCoverage.rate}%`}
                accent
              />
            </IntakeMetricGrid>
          </IntakeBlock>

          <IntakeBlock title="Runtime Metrics" icon={Cpu}>
            <IntakeMetricGrid>
              <IntakeMetric label="AI Requests" value={data.runtimeMetrics.requests} />
              <IntakeMetric label="Successes" value={data.runtimeMetrics.successes} accent />
              <IntakeMetric label="Failures" value={data.runtimeMetrics.failures} />
              <IntakeMetric
                label="Avg Latency"
                value={
                  data.runtimeMetrics.requests > 0
                    ? `${Math.round(data.runtimeMetrics.totalLatencyMs / data.runtimeMetrics.requests)}ms`
                    : '0ms'
                }
              />
            </IntakeMetricGrid>
            <div className="mt-4 grid gap-2 text-xs text-(--color-secondaryText) md:grid-cols-3">
              <p>Validation Rejects: {data.runtimeMetrics.validationRejects}</p>
              <p>Candidate Retrievals: {data.runtimeMetrics.candidateRetrievalCount}</p>
              <p>
                Top Failed Categories:{' '}
                {Object.keys(data.runtimeMetrics.topFailedCategories).length || '—'}
              </p>
            </div>
          </IntakeBlock>

          <IntakeNote title="دستورات ارزیابی">
            <ul className="space-y-1 font-mono text-[11px]">
              <li>CI / Oracle: npm run evaluate:intake-ai</li>
              <li>Live Gemma: npm run evaluate:intake-ai:live</li>
              <li>Live production-like: npm run evaluate:intake-ai:live:prod</li>
              <li>Regenerate dataset: npm run generate:evaluation-dataset</li>
            </ul>
          </IntakeNote>
        </>
      ) : null}
    </IntakeDashboardFrame>
  );
}
