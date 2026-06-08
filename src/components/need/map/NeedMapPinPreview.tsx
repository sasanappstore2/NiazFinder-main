'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { ChevronLeft, DollarSign, Flame, MapPin, X } from 'lucide-react';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import type { ServiceRequest } from '@/lib/types';
import { routeBuilder } from '@/config/routes';
import { formatBudgetRange } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function NeedMapPinPreview({
  pin,
  request,
  fromPathname,
  onClose,
  className,
  style,
}: {
  pin: NeedMapPin;
  request?: ServiceRequest;
  fromPathname: string;
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
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
    <div
      className={cn('bm-pin-preview animate-in fade-in slide-in-from-bottom-3 duration-200', className)}
      style={style}
      dir="rtl"
    >
      <Link
        href={href}
        className="map-area-dock-surface flex items-start gap-2.5 rounded-2xl p-2.5 transition-transform active:scale-[0.99]"
      >
        <div
          className="flex size-14 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
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
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="size-3.5" aria-hidden />
              {budget}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
              مشاهده نیاز
              <ChevronLeft className="size-3.5" aria-hidden />
            </span>
          </div>
          {urgent ? (
            <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] text-amber-600 dark:text-amber-400">
              <Flame className="size-3" aria-hidden />
              فوری
            </span>
          ) : null}
        </div>
      </Link>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="absolute -left-1 -top-1 flex size-7 items-center justify-center rounded-full border border-border/60 bg-card shadow-sm"
          aria-label="بستن"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
