'use client';

import Image from 'next/image';
import {
  MapPin,
  BadgeCheck,
  Star,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import { StarRating } from '@/components/shared/StarRating';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { ShareButton } from '@/components/shared/ShareButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { ContactActions } from '@/components/contact/ContactActions';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';

const CTA_LABEL: Record<OfferCtaType, string> = {
  book: 'رزرو',
  quote: 'استعلام',
  call: 'تماس',
  chat: 'گفتگو',
};

export function BusinessHero({
  business,
  requestId,
}: {
  business: Business;
  requestId?: string;
}) {
  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : business.seo.canonicalUrl ?? routeBuilder.pro(business.id);

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      <div
        className="h-36 sm:h-48 bg-gradient-to-l from-primary/20 via-muted to-muted"
        style={
          business.identity.coverImage
            ? { backgroundImage: `url(${business.identity.coverImage})`, backgroundSize: 'cover' }
            : undefined
        }
      />
      <div className="px-4 pb-4 -mt-10 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="size-20 rounded-2xl border-4 border-background bg-muted overflow-hidden shrink-0 flex items-center justify-center text-2xl font-bold">
          {business.identity.logo ? (
            <Image src={business.identity.logo} alt="" width={80} height={80} className="object-cover size-full" />
          ) : (
            business.name.slice(0, 2)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold">{business.name}</h1>
            {business.trust.verified && (
              <BadgeCheck className="size-5 text-primary" aria-label="تأیید شده" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <StarRating rating={business.trust.rating} size="sm" />
              <span className="font-medium text-foreground">{business.trust.rating.toFixed(1)}</span>
              <span>({business.trust.reviewCount})</span>
            </span>
            {business.identity.location.city && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {business.identity.location.city}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {business.trust.badges.map((b) => (
              <Badge key={b} variant="secondary" className="text-xs">
                {b}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
    </section>
  );
}

export function BusinessIdentitySection({ business }: { business: Business }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">درباره</h2>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
        {business.identity.description || 'توضیحاتی ثبت نشده است.'}
      </p>
      {business.identity.location.address && (
        <p className="flex items-start gap-2 text-sm">
          <MapPin className="size-4 shrink-0 mt-0.5" />
          {business.identity.location.address}
          {business.identity.location.province ? `، ${business.identity.location.province}` : ''}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {business.identity.tags.map((t) => (
          <Badge key={t} variant="outline">
            {t}
          </Badge>
        ))}
      </div>
    </section>
  );
}

function OfferCard({ offer, onAction }: { offer: BusinessOffer; onAction: () => void }) {
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      {offer.images[0] && (
        <div className="aspect-video relative bg-muted">
          <Image src={offer.images[0]} alt="" fill className="object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{offer.title}</CardTitle>
        {offer.priceRange && (
          <p className="text-sm font-medium text-primary">{offer.priceRange}</p>
        )}
        {offer.duration && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {offer.duration}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 pt-0">
        <p className="text-sm text-muted-foreground line-clamp-3">{offer.description}</p>
        {offer.features.length > 0 && (
          <ul className="text-xs space-y-1 text-muted-foreground">
            {offer.features.slice(0, 4).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
        <Button className="mt-auto w-full" size="sm" onClick={onAction}>
          {CTA_LABEL[offer.ctaType]}
        </Button>
      </CardContent>
    </Card>
  );
}

export function BusinessOffersSection({
  business,
  onOfferAction,
}: {
  business: Business;
  onOfferAction?: (offerId: string, cta: OfferCtaType) => void;
}) {
  if (business.offers.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">خدمات و پیشنهادها</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {business.offers.map((o) => (
          <OfferCard
            key={o.id}
            offer={o}
            onAction={() => onOfferAction?.(o.id, o.ctaType)}
          />
        ))}
      </div>
    </section>
  );
}

export function BusinessPortfolioSection({ business }: { business: Business }) {
  if (business.portfolio.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">نمونه‌کارها</h2>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
        {business.portfolio.map((item) => (
          <figure
            key={item.id}
            className={cn(
              'rounded-xl border overflow-hidden bg-muted aspect-square relative group',
              item.type === 'before_after' && 'col-span-2 aspect-[2/1]'
            )}
          >
            <Image src={item.mediaUrl} alt={item.title} fill className="object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-xs">
              {item.title}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function BusinessTrustSection({ business }: { business: Business }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">اعتماد و نظرات</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Star className="size-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{business.trust.rating.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">{business.trust.reviewCount} نظر</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Shield className="size-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{Math.round(business.trust.responseRate)}%</p>
            <p className="text-xs text-muted-foreground">نرخ پاسخ</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="size-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-lg font-bold">{business.trust.yearsActive || 1}+</p>
            <p className="text-xs text-muted-foreground">سال فعالیت</p>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-3">
        {business.reviews.slice(0, 8).map((r) => (
          <Card key={r.id}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm">{r.userName}</span>
                <StarRating rating={r.rating} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">{r.comment}</p>
              {r.reply && (
                <p className="mt-2 text-xs border-r-2 border-primary pr-2 text-muted-foreground">
                  پاسخ: {r.reply}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function BusinessContactSection({
  business,
  requestId,
}: {
  business: Business;
  requestId?: string;
}) {
  return (
    <section className="rounded-2xl border bg-muted/30 p-4">
      <p className="text-caption text-muted-foreground mb-3">
        ارتباط فقط از طریق چت و تماس درون سایت — پس از ورود، شماره در تماس صوتی نمایش داده می‌شود.
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

export function BusinessSeoSection({ business }: { business: Business }) {
  const [open, setOpen] = useState(false);
  if (!business.seo.description) return null;

  return (
    <section className="border rounded-xl">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
        onClick={() => setOpen((v) => !v)}
      >
        اطلاعات بیشتر
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground prose prose-sm max-w-none">
          <p>{business.seo.description}</p>
          {business.seo.keywords.length > 0 && (
            <p className="mt-2">کلمات کلیدی: {business.seo.keywords.join('، ')}</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Category extension blocks (20% dynamic UI). */
export function BusinessExtensionsSection({ business }: { business: Business }) {
  const ext = business.extensions;
  if (!ext) return null;

  return (
    <section className="space-y-4">
      {ext.restaurant && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">منو</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ext.restaurant.menu.slice(0, 6).map((m) => (
              <div key={m.id} className="flex justify-between text-sm">
                <span>{m.name}</span>
                {m.price && <span className="text-muted-foreground">{m.price}</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {ext.doctor && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">تخصص‌ها</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {ext.doctor.specialties.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
      {ext.mechanic && (
        <Card>
          <CardContent className="pt-4 text-sm">
            برندها: {ext.mechanic.supportedBrands.join('، ')}
            {ext.mechanic.emergencyService && (
              <Badge className="mr-2" variant="destructive">
                خدمات اضطراری
              </Badge>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
