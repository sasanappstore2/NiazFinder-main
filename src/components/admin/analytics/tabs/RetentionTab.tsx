'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminChartCard } from '@/components/admin/ui';
import { CohortHeatmap } from '@/components/admin/analytics/charts/CohortHeatmap';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type { TrafficAnalyticsExplorer, TrafficAnalyticsRetention } from '@/components/admin/modules/shared/types';

export function RetentionTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<TrafficAnalyticsRetention>('retention');
  const [query, setQuery] = useState('');
  const [explorer, setExplorer] = useState<TrafficAnalyticsExplorer | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await hub.searchExplorer(query.trim());
      setExplorer(res);
    } finally {
      setSearching(false);
    }
  };

  if (hub.isTabLoading('retention') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  return (
    <div className="space-y-4">
      <AdminChartCard title="ماتریس نگهداشت (کوهورت هفتگی)">
        <CohortHeatmap rows={data.rows} weeks={data.weeks} />
      </AdminChartCard>

      <AdminChartCard title="کاوشگر بازدیدکننده">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-(--color-secondaryText)" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="شناسه بازدیدکننده یا مسیر..."
              className="pr-9"
              onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            />
          </div>
          <Button size="sm" disabled={searching || query.trim().length < 2} onClick={() => void handleSearch()}>
            جستجو
          </Button>
        </div>

        {explorer && (
          <div className="mt-4 space-y-2">
            {explorer.message && (
              <p className="text-sm text-(--color-secondaryText)">{explorer.message}</p>
            )}
            {explorer.results.length === 0 ? (
              <p className="py-4 text-center text-sm text-(--color-secondaryText)">نتیجه‌ای یافت نشد</p>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto rounded-lg border border-(--color-mainBorder)">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead>
                      <tr className="border-b border-(--color-mainBorder) bg-muted/40 text-right">
                        {Object.keys(explorer.results[0] ?? {}).map((k) => (
                          <th key={k} className="p-2 font-medium">
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {explorer.results.map((row, i) => (
                        <tr key={i} className="border-b border-(--color-mainBorder)/50">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="p-2 font-mono">
                              {String(v ?? '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 lg:hidden">
                  {explorer.results.map((row, i) => (
                    <div
                      key={i}
                      className="min-w-0 overflow-guard rounded-lg border border-(--color-mainBorder) bg-card p-3 text-sm"
                    >
                      {Object.entries(row).map(([key, value]) => (
                        <div
                          key={key}
                          className="flex items-start justify-between gap-3 border-b border-(--color-mainBorder)/40 py-2 last:border-0"
                        >
                          <span className="shrink-0 text-(--color-secondaryText)">{key}</span>
                          <span className="min-w-0 truncate font-mono text-end">{String(value ?? '—')}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </AdminChartCard>
    </div>
  );
}
