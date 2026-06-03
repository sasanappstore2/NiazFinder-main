'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { AdminChartCard } from '@/components/admin/ui';
import { AnalyticsChartTooltip } from '@/components/admin/analytics/charts/AnalyticsChartTooltip';
import { AnalyticsDataTable } from '@/components/admin/analytics/charts/AnalyticsDataTable';
import { AnalyticsEmptyState } from '@/components/admin/analytics/charts/AnalyticsEmptyState';
import type { AnalyticsHubContext } from '@/components/admin/analytics/useAnalyticsHub';
import type {
  TrafficAnalyticsAcquisition,
  TrafficAnalyticsLanding,
  TrafficAnalyticsMatrix,
} from '@/components/admin/modules/shared/types';

type AcquisitionData = {
  acquisition: TrafficAnalyticsAcquisition;
  matrix: TrafficAnalyticsMatrix;
  landing: TrafficAnalyticsLanding;
};

const GROUPS = [
  ['source', 'منبع'],
  ['medium', 'مدium'],
  ['campaign', 'کمپین'],
  ['referrer', 'ارجاع'],
  ['channel', 'کانال'],
  ['landing', 'فرود'],
] as const;

function formatDuration(ms: number): string {
  if (!ms) return '—';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec.toLocaleString('fa-IR')} ث`;
  return `${Math.floor(sec / 60).toLocaleString('fa-IR')} دقیقه`;
}

export function AcquisitionTab({ hub }: { hub: AnalyticsHubContext }) {
  const data = hub.getTabData<AcquisitionData>('acquisition');
  const [groupBy, setGroupBy] = useState('source');
  const [acqRows, setAcqRows] = useState<TrafficAnalyticsAcquisition | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const handleGroupChange = async (id: string) => {
    setGroupBy(id);
    setLoadingGroup(true);
    try {
      const res = await hub.fetchAcquisitionGroup(id);
      setAcqRows(res);
    } finally {
      setLoadingGroup(false);
    }
  };

  if (hub.isTabLoading('acquisition') && !data) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/40" />;
  }

  if (!data) return <AnalyticsEmptyState />;

  const acquisition = acqRows ?? data.acquisition;
  const { matrix, landing } = data;

  const matrixMax = Math.max(...matrix.cells.map((c) => c.value), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {GROUPS.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={groupBy === id ? 'default' : 'outline'}
            disabled={loadingGroup}
            onClick={() => void handleGroupChange(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <AdminChartCard title="منابع ورود">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={acquisition.rows.slice(0, 12)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 10 }} />
            <Tooltip content={<AnalyticsChartTooltip />} />
            <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} name="نشست" />
          </BarChart>
        </ResponsiveContainer>
      </AdminChartCard>

      <AdminChartCard title={`ماتریس ${matrix.rowDim} × ${matrix.colDim}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-(--color-mainBorder)">
                <th className="p-2 text-right" />
                {matrix.cols.map((col) => (
                  <th key={col} className="max-w-[80px] truncate p-2 text-center font-medium" title={col}>
                    {col.length > 12 ? `${col.slice(0, 12)}…` : col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row} className="border-b border-(--color-mainBorder)/50">
                  <td className="max-w-[100px] truncate p-2 font-medium" title={row}>
                    {row}
                  </td>
                  {matrix.cols.map((col) => {
                    const cell = matrix.cells.find((c) => c.row === row && c.col === col);
                    const val = cell?.value ?? 0;
                    const intensity = val / matrixMax;
                    return (
                      <td key={col} className="p-1 text-center">
                        <div
                          className="rounded px-1 py-1 tabular-nums"
                          style={{ background: `rgba(59, 130, 246, ${Math.max(0.08, intensity * 0.85)})` }}
                        >
                          {val > 0 ? val.toLocaleString('fa-IR') : '—'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminChartCard>

      <AdminChartCard title="صفحات فرود">
        <AnalyticsDataTable<TrafficAnalyticsLanding['rows'][number]>
          rows={landing.rows}
          columns={[
            { key: 'path', header: 'مسیر', className: 'font-mono text-xs ltr:text-left max-w-[200px] truncate' },
            { key: 'sessions', header: 'نشست', sortValue: (r) => r.sessions },
            { key: 'bounceRate', header: 'پرش', render: (r) => `${r.bounceRate.toLocaleString('fa-IR')}٪` },
            { key: 'avgPages', header: 'صفحه/نشست' },
            {
              key: 'avgDurationMs',
              header: 'میانگین زمان',
              render: (r) => formatDuration(r.avgDurationMs),
            },
          ]}
          searchKeys={['path', 'label']}
          exportFilename="landing-pages.csv"
          showShare
          totalForShare={landing.total}
        />
      </AdminChartCard>
    </div>
  );
}
