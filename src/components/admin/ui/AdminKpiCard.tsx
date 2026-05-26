import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminKpiCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  accent = 'green',
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  accent?: 'green' | 'blue' | 'amber' | 'violet';
}) {
  const positive = (change ?? 0) >= 0;
  const accentMap = {
    green: 'bg-(--color-coloredText)/10 text-(--color-coloredText)',
    blue: 'bg-sky-500/10 text-sky-500',
    amber: 'bg-amber-500/10 text-amber-500',
    violet: 'bg-violet-500/10 text-violet-500',
  };

  return (
    <div className="admin-kpi-card group relative overflow-hidden rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg) p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-(--color-secondaryText)">{title}</p>
          <p className="admin-kpi-value mt-2">{value}</p>
          {(change !== undefined || changeLabel) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {change !== undefined && (
                <span className={cn('inline-flex items-center gap-0.5 font-medium', positive ? 'text-emerald-500' : 'text-rose-500')}>
                  {positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {Math.abs(change).toLocaleString('fa-IR')}٪
                </span>
              )}
              {changeLabel && <span className="text-(--color-secondaryText)">{changeLabel}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', accentMap[accent])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminChartCard({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-(--color-cardBorder) bg-(--color-primaryBg)', className)}>
      <div className="flex flex-col gap-2 border-b border-(--color-mainBorder) px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-(--color-primaryText)">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-(--color-secondaryText)">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
