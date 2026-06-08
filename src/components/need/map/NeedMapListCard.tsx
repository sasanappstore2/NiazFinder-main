'use client';

import Link from 'next/link';
import { DollarSign, Flame, MapPin } from 'lucide-react';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import type { ServiceRequest } from '@/lib/types';
import { routeBuilder } from '@/config/routes';
import { formatBudgetRange } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function NeedMapListCard({
  pin,
  request,
  selected,
  fromPathname,
  onSelect,
}: {
  pin: NeedMapPin;
  request?: ServiceRequest;
  selected: boolean;
  fromPathname: string;
  onSelect: () => void;
}) {
  const title = request?.title ?? pin.title;
  const city = request?.city ?? pin.city;
  const budget = formatBudgetRange(
    request?.budgetMin ?? pin.budgetMin ?? undefined,
    request?.budgetMax ?? pin.budgetMax ?? undefined
  );
  const href = routeBuilder.listing(pin.id, title);
  const urgent = pin.priority === 'URGENT' || pin.priority === 'HIGH';

  return (
    <article
      className={cn(
        'group flex cursor-pointer gap-3 rounded-xl border bg-card p-2.5 text-right transition-all',
        selected
          ? 'border-primary/60 bg-primary/5 shadow-sm ring-1 ring-primary/20'
          : 'border-border/50 hover:border-emerald-300/50 hover:shadow-sm dark:hover:border-emerald-700/50'
      )}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
    >
      <div
        className="flex size-[72px] shrink-0 items-center justify-center rounded-lg text-lg font-bold text-white"
        style={{ background: pin.pinColor }}
        aria-hidden
      >
        {title.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
        {city ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{city}</span>
          </p>
        ) : null}
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <DollarSign className="size-3.5" aria-hidden />
            {budget}
          </span>
          {urgent ? (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Flame className="size-3.5" aria-hidden />
              فوری
            </span>
          ) : null}
        </div>
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          مشاهده نیاز
        </Link>
      </div>
    </article>
  );
}
