'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import type { BusinessMapPin } from '@/lib/business/map-pins-types';
import type { SpecialistProfile } from '@/lib/types';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';

const VERIFIED_LABEL = '\u062a\u0623\u06cc\u06cc\u062f\u0634\u062f\u0647';
const VIEW_PROFILE = '\u0645\u0634\u0627\u0647\u062f\u0647 \u067e\u0631\u0648\u0641\u0627\u06cc\u0644';

export function BusinessMapListCard({
  pin,
  specialist,
  selected,
  fromPathname,
  onSelect,
}: {
  pin: BusinessMapPin;
  specialist?: SpecialistProfile;
  selected: boolean;
  fromPathname: string;
  onSelect: () => void;
}) {
  const name = specialist?.displayName ?? pin.name;
  const city = pin.locationLabel ?? specialist?.city ?? pin.city;
  const rating = specialist?.rating ?? pin.rating;
  const verified = specialist?.isVerified ?? pin.verified;
  const logo = pin.logo;
  const href = routeBuilder.businessProfile(pin.slug, { from: fromPathname });
  const bio = specialist?.bio?.trim();

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
      <div className="relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-muted">
        {logo ? (
          <Image
            src={logo}
            alt=""
            width={72}
            height={72}
            sizes="72px"
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            {name.charAt(0)}
          </div>
        )}
        {verified ? (
          <span className="absolute bottom-1 left-1 rounded-full bg-card/95 p-0.5 shadow-sm">
            <BadgeCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-label={VERIFIED_LABEL} />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{name}</h3>
        {bio ? (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{bio}</p>
        ) : null}
        {city ? (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{city}</span>
          </p>
        ) : null}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
            {rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
            <span className="text-muted-foreground/70">
              ({pin.reviewCount.toLocaleString('fa-IR')})
            </span>
          </span>
          <Link
            prefetch
        href={href}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-medium text-primary hover:underline"
          >
            {VIEW_PROFILE}
          </Link>
        </div>
      </div>
    </article>
  );
}
