'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export function AnalyticsMetricCard({
  title,
  value,
  change,
  delta,
  subtitle,
  deltaLabel,
  sparkline,
  accent = 'sky',
  className,
}: {
  title: string;
  value: string | number;
  change?: number | null;
  delta?: number | null;
  subtitle?: string;
  deltaLabel?: string;
  sparkline?: number[] | Array<{ label: string; value: number; date?: string }>;
  accent?: 'sky' | 'green' | 'violet' | 'amber' | 'rose';
  className?: string;
}) {
  const pct = change ?? delta;
  const accentMap = {
    sky: 'border-sky-500/30 bg-sky-500/5',
    green: 'border-emerald-500/30 bg-emerald-500/5',
    violet: 'border-violet-500/30 bg-violet-500/5',
    amber: 'border-amber-500/30 bg-amber-500/5',
    rose: 'border-rose-500/30 bg-rose-500/5',
  };

  const sparkData =
    sparkline?.map((item, i) =>
      typeof item === 'number' ? { i, v: item } : { i, v: item.value }
    ) ?? [];

  return (
    <div className={cn('rounded-xl border p-4', accentMap[accent], className)}>
      <p className="text-xs text-(--color-secondaryText)">{title}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold">{value}</p>
        {sparkData.length > 1 && (
          <div className="h-10 w-20 shrink-0 opacity-70">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkData}>
                <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      {(pct != null || subtitle || deltaLabel) && (
        <p className="mt-1 text-xs text-(--color-secondaryText)">
          {pct != null && (
            <span className={pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
              {pct >= 0 ? '+' : ''}
              {pct.toLocaleString('fa-IR')}٪
            </span>
          )}
          {pct != null && (subtitle || deltaLabel) ? ' · ' : null}
          {deltaLabel}
          {deltaLabel && subtitle ? ' · ' : null}
          {subtitle}
        </p>
      )}
    </div>
  );
}
