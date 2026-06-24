'use client';

import Image from 'next/image';
import { BadgeCheck, ChevronLeft, DollarSign, Flame, MapPin, Star } from 'lucide-react';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import type { NeedMapPin } from '@/lib/need/map-pins-types';
import type { SpecialistProfile, ServiceRequest } from '@/lib/types';
import { formatBudgetRange } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function MapAreaBusinessPeekRow({
  pin,
  specialist,
  selected,
  onClick,
}: {
  pin: BusinessMapPin;
  specialist?: SpecialistProfile;
  selected: boolean;
  onClick: () => void;
}) {
  const name = specialist?.displayName ?? pin.name;
  const city = pin.locationLabel ?? specialist?.city ?? pin.city;
  const rating = specialist?.rating ?? pin.rating;
  const verified = specialist?.isVerified ?? pin.verified;
  const logo = pin.logo;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'map-area-dock-surface map-area-peek-row flex w-full items-center gap-2.5 rounded-xl p-2 text-right transition-all',
        selected
          ? 'ring-2 ring-primary/35 bg-primary/5'
          : 'hover:bg-muted/40 active:scale-[0.99]'
      )}
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={40}
            height={40}
            sizes="40px"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {name.charAt(0)}
          </div>
        )}
        {verified ? (
          <span className="absolute bottom-0.5 left-0.5 rounded-full bg-card/95 p-px shadow-sm">
            <BadgeCheck className="size-3 text-emerald-600 dark:text-emerald-400" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{name}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {city ? (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <MapPin className="size-2.5 shrink-0" aria-hidden />
              <span className="truncate">{city}</span>
            </span>
          ) : null}
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <Star className="size-2.5 fill-amber-400 text-amber-400" aria-hidden />
            {rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
          </span>
        </div>
      </div>

      <ChevronLeft className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </button>
  );
}

export function MapAreaNeedPeekRow({
  pin,
  request,
  selected,
  onClick,
}: {
  pin: NeedMapPin;
  request?: ServiceRequest;
  selected: boolean;
  onClick: () => void;
}) {
  const title = request?.title ?? pin.title;
  const city = request?.city ?? pin.city;
  const budget = formatBudgetRange(
    request?.budgetMin ?? pin.budgetMin ?? undefined,
    request?.budgetMax ?? pin.budgetMax ?? undefined
  );
  const urgent = pin.priority === 'URGENT' || pin.priority === 'HIGH';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'map-area-dock-surface map-area-peek-row flex w-full items-center gap-2.5 rounded-xl p-2 text-right transition-all',
        selected
          ? 'ring-2 ring-primary/35 bg-primary/5'
          : 'hover:bg-muted/40 active:scale-[0.99]'
      )}
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ background: pin.pinColor }}
        aria-hidden
      >
        {title.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{title}</p>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {city ? (
            <span className="inline-flex min-w-0 items-center gap-0.5">
              <MapPin className="size-2.5 shrink-0" aria-hidden />
              <span className="truncate">{city}</span>
            </span>
          ) : null}
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <DollarSign className="size-2.5 shrink-0" aria-hidden />
            <span className="truncate">{budget}</span>
          </span>
          {urgent ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 text-amber-600 dark:text-amber-400">
              <Flame className="size-2.5" aria-hidden />
              فوری
            </span>
          ) : null}
        </div>
      </div>

      <ChevronLeft className="size-4 shrink-0 text-muted-foreground/60" aria-hidden />
    </button>
  );
}
