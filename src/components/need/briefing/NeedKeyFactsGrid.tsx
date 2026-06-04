'use client';

import { Clock, MapPin, Wallet } from 'lucide-react';
import { formatBudgetRange } from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { cn } from '@/lib/utils';
import { extractNeighborhoodLabel } from './need-brief-utils';

interface NeedKeyFactsGridProps {
  request: ServiceRequest;
  className?: string;
}

function FactCell({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-xl border px-2.5 py-2.5 sm:px-3 sm:py-3',
        highlight
          ? 'border-emerald-500/25 bg-emerald-500/8'
          : 'border-border/50 bg-muted/20'
      )}
    >
      <span className="inline-flex items-center gap-1 text-overline text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span
        className={cn(
          'truncate text-label font-bold leading-snug persian-nums',
          highlight ? 'text-emerald-800 dark:text-emerald-300' : 'text-foreground'
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

export function NeedKeyFactsGrid({ request, className }: NeedKeyFactsGridProps) {
  const budget = formatBudgetRange(request.budgetMin, request.budgetMax);
  const neighborhood = extractNeighborhoodLabel(request.address);
  const locationParts = [request.city, neighborhood].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(' · ') : 'نامشخص';
  const delivery = request.deliveryTime
    ? `${request.deliveryTime.toLocaleString('fa-IR')} روز`
    : 'نامشخص';

  return (
    <div className={cn('grid grid-cols-3 gap-2 sm:gap-3', className)} aria-label="اطلاعات کلیدی">
      <FactCell icon={Wallet} label="بودجه" value={budget} highlight />
      <FactCell icon={MapPin} label="مکان" value={location} />
      <FactCell icon={Clock} label="مهلت تحویل" value={delivery} />
    </div>
  );
}
