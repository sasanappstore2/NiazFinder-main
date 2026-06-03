'use client';

import Image from 'next/image';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ShareButton } from '@/components/shared/ShareButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContactActions } from '@/components/contact/ContactActions';
import { HeroCoverAurora } from '@/components/business-profile/HeroCoverAurora';
import { routeBuilder } from '@/config/routes';
import type { SectionProps } from './types';

export function HeroSection({ business, requestId }: SectionProps) {
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : business.seo.canonicalUrl ?? routeBuilder.pro(business.id);

  return (
    <section
      id="section-hero"
      className="profile-surface relative z-0 overflow-hidden rounded-2xl shadow-sm"
    >
      <div className="relative h-40 sm:h-52 md:h-60">
        {business.identity.coverImage ? (
          <Image
            src={business.identity.coverImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
        ) : (
          <HeroCoverAurora className="absolute inset-0" />
        )}
        <div
          className={
            business.identity.coverImage
              ? 'absolute inset-0 bg-linear-to-t from-black/75 via-black/35 to-black/5 sm:from-black/65'
              : 'absolute inset-0 bg-linear-to-t from-black/55 via-black/20 to-transparent'
          }
        />
      </div>

      <div className="relative z-10 px-4 pb-5 sm:px-6">
        <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:items-start">
          <div className="size-20 shrink-0 self-start overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg ring-1 ring-border/40 sm:size-28">
            {business.identity.logo ? (
              <Image
                src={business.identity.logo}
                alt=""
                width={112}
                height={112}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xl font-bold text-muted-foreground sm:text-2xl">
                {business.name.slice(0, 2)}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="profile-surface rounded-xl p-4 shadow-md">
              <div className="flex flex-wrap items-start gap-2">
                <h1 className="min-w-0 flex-1 text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl md:text-3xl">
                  {business.name}
                </h1>
                {business.trust.verified && (
                  <BadgeCheck
                    className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-label="تأیید شده"
                  />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-foreground">
                  <StarRating rating={business.trust.rating} size="sm" />
                  <span className="font-semibold">{business.trust.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">
                    ({business.trust.reviewCount.toLocaleString('fa-IR')})
                  </span>
                </span>
                {business.identity.location.city && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    {business.identity.location.city}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {business.trust.badges.slice(0, 4).map((b) => (
                  <Badge key={b} variant="secondary" className="text-xs">
                    {b}
                  </Badge>
                ))}
                {business.trust.yearsActive > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {business.trust.yearsActive.toLocaleString('fa-IR')}+ سال فعالیت
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:mt-2 sm:shrink-0">
            <BookmarkButton itemId={business.id} itemType="specialist" />
            <ShareButton title={business.name} description={business.identity.description} url={shareUrl} />
            <ContactActions
              otherUserId={business.userId}
              requestId={requestId}
              displayName={business.name}
              hasPhone={Boolean(business.contact.phone)}
              chatEnabled={business.contact.chatEnabled}
              showProfile={false}
              variant="compact"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function HighlightsSection({ business }: SectionProps) {
  const items = [
    {
      label: 'امتیاز',
      value: business.trust.rating.toFixed(1),
      icon: Star,
      show: business.trust.reviewCount > 0,
    },
    {
      label: 'نظر',
      value: business.trust.reviewCount.toLocaleString('fa-IR'),
      icon: Star,
      show: business.trust.reviewCount > 0,
    },
    {
      label: 'نرخ پاسخ',
      value: `${Math.round(business.trust.responseRate)}%`,
      icon: BadgeCheck,
      show: business.trust.responseRate > 0,
    },
    {
      label: 'سال فعالیت',
      value: `${business.trust.yearsActive || 1}+`,
      icon: MapPin,
      show: business.trust.yearsActive > 0,
    },
  ].filter((i) => i.show);

  if (items.length === 0) return null;

  return (
    <section id="section-highlights" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="profile-surface rounded-xl px-4 py-3 text-center shadow-sm transition hover:border-emerald-500/20"
        >
          <p className="text-xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

export function AboutSection({ business }: SectionProps) {
  return (
    <section
      id="section-about"
      className="profile-surface scroll-mt-24 space-y-4 rounded-2xl p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">درباره</h2>
      <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
        {business.identity.description || 'توضیحاتی ثبت نشده است.'}
      </p>
      {business.identity.location.address && (
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {business.identity.location.address}
            {business.identity.location.province ? `، ${business.identity.location.province}` : ''}
          </span>
        </p>
      )}
      {business.identity.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {business.identity.tags.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
        </div>
      )}
    </section>
  );
}

export function ContactSection({ business, requestId }: SectionProps) {
  return (
    <section id="section-contact" className="profile-surface scroll-mt-24 rounded-2xl p-5">
      <h2 className="mb-3 text-lg font-semibold">ارتباط</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        ارتباط از طریق چت و تماس درون سایت — پس از ورود، شماره در تماس صوتی نمایش داده می‌شود.
      </p>
      <ContactActions
        otherUserId={business.userId}
        requestId={requestId}
        displayName={business.name}
        hasPhone={Boolean(business.contact.phone)}
        chatEnabled={business.contact.chatEnabled}
        showProfile={false}
        variant="default"
      />
    </section>
  );
}

/** Compact contact card for desktop sidebar */
export function ContactSidebarCard({ business, requestId }: SectionProps) {
  return (
    <div className="sticky top-20 rounded-2xl border bg-card p-5 shadow-sm">
      <h3 className="mb-3 font-semibold">تماس با {business.name}</h3>
      <ContactActions
        otherUserId={business.userId}
        requestId={requestId}
        displayName={business.name}
        hasPhone={Boolean(business.contact.phone)}
        chatEnabled={business.contact.chatEnabled}
        showProfile={false}
        variant="default"
      />
      <div className="mt-4 flex justify-center">
        <BookmarkButton itemId={business.id} itemType="specialist" />
      </div>
    </div>
  );
}
