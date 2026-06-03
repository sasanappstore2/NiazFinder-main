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
              <div className="overflow-x-auto rounded-lg border border-(--color-mainBorder)">
                <table className="w-full text-xs">
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
            )}
          </div>
        )}
      </AdminChartCard>
    </div>
  );
}
