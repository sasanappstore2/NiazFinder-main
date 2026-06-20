'use client';

import { Clock, MapPin, Wallet } from 'lucide-react';
import { formatRequestBudget } from '@/lib/need/format-need-budget';
import { formatDeliveryDeadlineLabel } from '@/lib/need-intake/intake-timing-options';
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
  const budget = formatRequestBudget(request);
  const neighborhood = extractNeighborhoodLabel(request.address, request.dynamicAnswers);
  const locationParts = [request.province, request.city, neighborhood].filter(
    (part, index, arr) => part && arr.indexOf(part) === index
  );
  const location = locationParts.length > 0 ? locationParts.join(' · ') : 'نامشخص';

  let whenAnswer: string | undefined;
  if (request.dynamicAnswers) {
    try {
      const parsed =
        typeof request.dynamicAnswers === 'string'
          ? (JSON.parse(request.dynamicAnswers) as Record<string, unknown>)
          : (request.dynamicAnswers as Record<string, unknown>);
      const when = parsed.when;
      if (typeof when === 'string' && when.trim()) whenAnswer = when.trim();
    } catch {
      /* ignore malformed dynamicAnswers */
    }
  }

  const delivery = formatDeliveryDeadlineLabel({
    deliveryTime: request.deliveryTime,
    when: whenAnswer,
    priority: request.priority,
  });

  return (
    <div className={cn('grid grid-cols-3 gap-2 sm:gap-3', className)} aria-label="اطلاعات کلیدی">
      <FactCell icon={Wallet} label="بودجه" value={budget} highlight />
      <FactCell icon={MapPin} label="مکان" value={location} />
      <FactCell icon={Clock} label="مهلت تحویل" value={delivery} />
    </div>
  );
}
