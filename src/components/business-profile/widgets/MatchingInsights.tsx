'use client';

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';
import type { MatchingInsightsResult } from '@/lib/business/ecosystem';
import { MATCHING_INSIGHT_LABELS } from '@/lib/business/ecosystem';

export default function MatchingInsights({ business }: { business: Business }) {
  const [data, setData] = useState<MatchingInsightsResult | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/business/${encodeURIComponent(business.id)}/matching-insights`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { insights?: MatchingInsightsResult } | null) => {
        if (cancelled) return;
        if (json?.insights) {
          setData(json.insights);
          setState('ready');
        } else {
          setState('unavailable');
        }
      })
      .catch(() => !cancelled && setState('unavailable'));
    return () => {
      cancelled = true;
    };
  }, [business.id]);

  if (state === 'loading') {
    return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
  }
  if (state === 'unavailable' || !data) {
    return <p className="text-sm text-muted-foreground">این بخش فقط برای مالک کسب‌وکار در دسترس است.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Kpi label={MATCHING_INSIGHT_LABELS.matchingRate} value={`${data.matchingRate}%`} />
        <Kpi label={MATCHING_INSIGHT_LABELS.responseRate} value={`${data.responseRate}%`} />
        <Kpi label={MATCHING_INSIGHT_LABELS.conversionRate} value={`${data.conversionRate}%`} />
        <Kpi label={MATCHING_INSIGHT_LABELS.needVolume} value={data.needVolume.toLocaleString('fa-IR')} />
      </div>

      {data.missedOpportunities > 0 && (
        <p className="rounded-lg bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-300">
          {data.missedOpportunities.toLocaleString('fa-IR')} فرصت از‌دست‌رفته در این دوره
        </p>
      )}

      {data.hotNeighborhoods.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">محله‌های پرتقاضا</h4>
          <div className="flex flex-wrap gap-2">
            {data.hotNeighborhoods.map((n) => (
              <span key={n.label} className="rounded-full border px-2 py-0.5 text-xs">
                {n.label} ({n.count.toLocaleString('fa-IR')})
              </span>
            ))}
          </div>
        </div>
      )}

      {data.trendingRequests.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">درخواست‌های پرطرفدار</h4>
          <ul className="space-y-1 text-sm">
            {data.trendingRequests.map((t) => (
              <li key={t.label} className="flex justify-between">
                <span>{t.label}</span>
                <span className="text-muted-foreground">{t.count.toLocaleString('fa-IR')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
