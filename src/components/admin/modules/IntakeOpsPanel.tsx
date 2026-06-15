'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAdmin } from '@/components/admin/context/AdminContext';
import { AdminKpiCard } from '@/components/admin/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function IntakeOpsPanel() {
  const { apiFetch } = useAdmin();
  const [governance, setGovernance] = useState<Record<string, unknown> | null>(null);
  const [scale, setScale] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [gov, sc] = await Promise.all([
        apiFetch<Record<string, unknown>>('/api/super-admin/intake-governance'),
        apiFetch<Record<string, unknown>>('/api/super-admin/intake-scale'),
      ]);
      setGovernance(gov);
      setScale(sc);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '\u062e\u0637\u0627 \u062f\u0631 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  const sla = (governance?.moderationSla as { total?: number; breached?: number; p95Hours?: number }) ?? {};
  const publicApi = (governance?.publicApi as { totalRequests?: number; errorRate?: number }) ?? {};
  const quality = (governance?.qualityFeedback as { suggestedThreshold?: number; reason?: string }) ?? {};
  const mlx = (scale?.mlxMetrics as { cachedP99Ok?: boolean; cached?: { p99LatencyMs?: number } }) ?? {};
  const redis = (scale?.redis as { usedMemoryMb?: number }) ?? {};

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminKpiCard title={'\u0635\u0641 moderation'} value={String(sla.total ?? 0)} accent="amber" />
            <AdminKpiCard title={'\u0646\u0642\u0636 SLA'} value={String(sla.breached ?? 0)} accent="amber" />
            <AdminKpiCard title={'\u062f\u0631\u062e\u0648\u0627\u0633\u062a API'} value={String(publicApi.totalRequests ?? 0)} accent="sky" />
            <AdminKpiCard
              title={'\u0645\u062d\u0627\u0633\u0647 Redis (MB)'}
              value={String(redis.usedMemoryMb ?? '\u2014')}
              accent="violet"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{'\u0628\u0627\u0632\u062e\u0648\u0631\u062f \u06a9\u06cc\u0641\u06cc\u062a'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {quality.reason ?? '\u2014'}
              {' \u2014 '}
              {'\u0622\u0633\u062a\u0627\u0646\u0647: '}
              {quality.suggestedThreshold ?? '\u2014'}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{'MLX / cache'}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p>
                {'p99 cached: '}
                {mlx.cached?.p99LatencyMs ?? '\u2014'}ms
                {' \u2014 '}
                {mlx.cachedP99Ok ? 'OK' : 'review'}
              </p>
              <p dir="ltr" className="mt-2 text-xs text-muted-foreground">
                gov: {String(governance?.tag ?? '')} | scale: {String(scale?.tag ?? '')}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
