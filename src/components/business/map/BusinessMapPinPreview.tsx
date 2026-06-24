'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, ChevronLeft, MapPin, Star, X } from 'lucide-react';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import type { SpecialistProfile } from '@/lib/types';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';

const VERIFIED_LABEL = '\u062a\u0623\u06cc\u06cc\u062f\u0634\u062f\u0647';
const VIEW_PROFILE = '\u0645\u0634\u0627\u0647\u062f\u0647 \u067e\u0631\u0648\u0641\u0627\u06cc\u0644';

export function BusinessMapPinPreview({
  pin,
  specialist,
  fromPathname,
  onClose,
  className,
  style,
}: {
  pin: BusinessMapPin;
  specialist?: SpecialistProfile;
  fromPathname: string;
  onClose?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const name = specialist?.displayName ?? pin.name;
  const city = pin.locationLabel ?? specialist?.city ?? pin.city;
  const rating = specialist?.rating ?? pin.rating;
  const verified = specialist?.isVerified ?? pin.verified;
  const logo = pin.logo;
  const href = routeBuilder.businessProfile(pin.slug, { from: fromPathname });

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
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
          {logo ? (
            <Image
              src={logo}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {name.charAt(0)}
            </div>
          )}
          {verified ? (
            <span className="absolute bottom-1 left-1 rounded-full bg-card p-0.5 shadow-sm">
              <BadgeCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label={VERIFIED_LABEL} />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-semibold leading-snug">{name}</p>
          {city ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              <span className="truncate">{city}</span>
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
              {rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
              {VIEW_PROFILE}
              <ChevronLeft className="size-3.5" aria-hidden />
            </span>
          </div>
        </div>
      </Link>

      {onClose ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          className="absolute -top-2 -left-2 flex size-7 items-center justify-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-md hover:text-foreground"
          aria-label={'\u0628\u0633\u062a\u0646'}
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
