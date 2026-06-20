'use client';

import Image from 'next/image';
import { BadgeCheck, MapPin, Star } from 'lucide-react';
import { BusinessStarButton } from '@/components/shared/BusinessStarButton';
import { ShareButton } from '@/components/shared/ShareButton';
import { Badge } from '@/components/ui/badge';
import { ContactActions } from '@/components/contact/ContactActions';
import { HeroCoverAurora } from '@/components/business-profile/HeroCoverAurora';
import {
  PROFILE_ACTION_TOOLBAR,
  PROFILE_COVER,
  PROFILE_COVER_IMAGE,
  PROFILE_HERO,
  PROFILE_IDENTITY_BODY,
  PROFILE_IDENTITY_SHEET,
  PROFILE_LOGO,
  PROFILE_TOOLBAR_BTN,
} from '@/components/business-profile/profile-layout-tokens';
import { BusinessProfileLocationMap } from '@/components/business/map/BusinessMapPinPickerLazy';
import { Separator } from '@/components/ui/separator';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';
import type { SectionProps } from './types';

export function HeroSection({ business, requestId }: SectionProps) {
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : business.seo.canonicalUrl ?? routeBuilder.pro(business.id);

  const hasCover = Boolean(business.identity.coverImage);

  return (
    <section id="section-hero" className={PROFILE_HERO}>
      <div className={PROFILE_COVER}>
        {hasCover ? (
          <Image
            src={business.identity.coverImage!}
            alt=""
            fill
            className={PROFILE_COVER_IMAGE}
            priority
          />
        ) : (
          <HeroCoverAurora className="absolute inset-0" />
        )}
        <div
          className={cn(
            'profile-hero__scrim',
            !hasCover && 'profile-hero__scrim--aurora'
          )}
          aria-hidden
        />
      </div>

      <div className={PROFILE_IDENTITY_SHEET}>
        <div className={PROFILE_LOGO}>
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

        <div className={PROFILE_IDENTITY_BODY}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="overflow-guard min-w-0 max-w-none flex-1 text-lg font-bold leading-snug tracking-tight text-foreground sm:text-xl md:text-2xl lg:text-3xl">
              {business.name}
            </h1>
            {business.trust.verified && (
              <BadgeCheck
                className="size-6 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-label="تأیید شده"
              />
            )}
          </div>

          <div className="mt-[13px] flex flex-wrap items-center gap-2 text-sm">
            {business.trust.reviewCount > 0 && business.trust.rating > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-foreground">
                <span className="font-semibold">{business.trust.rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({business.trust.reviewCount.toLocaleString('fa-IR')})
                </span>
              </span>
            )}
            {business.identity.location.city && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                {business.identity.location.city}
              </span>
            )}
          </div>

          {(business.trust.badges.length > 0 || business.trust.yearsActive > 0) && (
            <div className="mt-[13px] flex flex-wrap gap-1.5">
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
          )}

          <Separator className="my-[21px] bg-border/50" />

          <div className={PROFILE_ACTION_TOOLBAR}>
            <BusinessStarButton
              businessUserId={business.id}
              initialCount={business.analytics.saves}
              size="toolbar"
              className={PROFILE_TOOLBAR_BTN}
            />
            <ShareButton
              title={business.name}
              description={business.identity.description}
              url={shareUrl}
              variant="toolbar"
              className={PROFILE_TOOLBAR_BTN}
            />
            <ContactActions
              otherUserId={business.userId}
              requestId={requestId}
              displayName={business.name}
              hasPhone={Boolean(business.contact.phone)}
              chatEnabled={business.contact.chatEnabled}
              showProfile={false}
              variant="toolbar"
              className="col-span-2 w-full md:col-span-1 md:w-auto"
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
    <section id="section-highlights" className="grid grid-cols-2 gap-[13px] sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="profile-surface rounded-2xl px-4 py-3 text-center shadow-sm transition hover:border-emerald-500/20"
        >
          <p className="text-xl font-bold">{item.value}</p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </section>
  );
}

export function AboutSection({ business }: SectionProps) {
  const geo = business.identity.location.geo;

  return (
    <section
      id="section-about"
      className="profile-surface scroll-mt-24 space-y-4 rounded-2xl p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">درباره</h2>
      <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
        {business.identity.description || 'توضیحاتی ثبت نشده است.'}
      </p>
      {geo ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">موقعیت فروشگاه</h3>
          <BusinessProfileLocationMap
            lat={geo.lat}
            lng={geo.lng}
            city={business.identity.location.city}
          />
        </div>
      ) : null}
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
  const geo = business.identity.location.geo;

  return (
    <section id="section-contact" className="profile-surface scroll-mt-24 rounded-2xl p-5">
      <h2 className="mb-3 text-lg font-semibold">ارتباط</h2>
      {geo ? (
        <div className="mb-4">
          <BusinessProfileLocationMap
            lat={geo.lat}
            lng={geo.lng}
            city={business.identity.location.city}
            className="max-w-xl"
          />
        </div>
      ) : null}
      <p className="mb-4 text-xs text-muted-foreground">
        ارتباط از طریق چت و تماس درون سایت — پس از ورود، شماره در تماس صوتی نمایش داده می‌شود.
      </p>
      <ContactActions
        otherUserId={business.userId}
        businessSlug={business.slug}
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
        businessSlug={business.slug}
        requestId={requestId}
        displayName={business.name}
        hasPhone={Boolean(business.contact.phone)}
        chatEnabled={business.contact.chatEnabled}
        showProfile={false}
        variant="default"
      />
      <div className="mt-4 flex justify-center">
        <BusinessStarButton
          businessUserId={business.id}
          initialCount={business.analytics.saves}
        />
      </div>
    </div>
  );
}
