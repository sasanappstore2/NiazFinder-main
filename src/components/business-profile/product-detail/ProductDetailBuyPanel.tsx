'use client';

import Link from 'next/link';
import { ChevronLeft, Clock, MessageCircle, Phone } from 'lucide-react';
import type { BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CTA_LABEL } from '../sections/types';
import { ProductDetailSellerStrip } from './ProductDetailSellerStrip';
import type { Business } from '@/contracts/business-profile';
import { PRODUCT_STICKY_TOP } from './product-detail-tokens';

export function ProductDetailBuyPanel({
  business,
  offer,
  profileUrl,
  categoryUrl,
  price,
  variantId,
  onVariantChange,
  onOfferAction,
  showDesktopCta = true,
}: {
  business: Business;
  offer: BusinessOffer;
  profileUrl: string;
  categoryUrl: string;
  price?: string;
  variantId: string | null;
  onVariantChange: (id: string) => void;
  onOfferAction?: (
    offerId: string,
    cta: OfferCtaType,
    opts?: { variantId: string | null }
  ) => void;
  showDesktopCta?: boolean;
}) {
  return (
    <aside className={cn('flex flex-col gap-[21px]', PRODUCT_STICKY_TOP)}>
      <ProductDetailSellerStrip business={business} profileUrl={profileUrl} />

      <div className="space-y-[13px]">
        <h1 className="text-2xl font-bold leading-[1.3] tracking-tight sm:text-[28px] lg:text-[34px]">
          {offer.title}
        </h1>

        {price && (
          <p className="text-[21px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400 lg:text-[34px]">
            {price}
          </p>
        )}

        {offer.duration && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" aria-hidden />
            {offer.duration}
          </p>
        )}
      </div>

      {offer.variants && offer.variants.length > 0 && (
        <div className="space-y-[8px]">
          <p className="text-sm font-medium">انتخاب گزینه</p>
          <div className="flex flex-wrap gap-[8px]">
            {offer.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => onVariantChange(v.id)}
                className={cn(
                  'min-h-11 rounded-full border px-4 py-2 text-sm transition',
                  variantId === v.id
                    ? 'border-emerald-600 bg-emerald-500/10 font-semibold text-emerald-900 shadow-sm dark:text-emerald-100'
                    : 'border-border bg-background hover:border-emerald-500/40 hover:bg-accent'
                )}
              >
                {v.name}
                {v.price ? (
                  <span className="mr-1.5 text-muted-foreground">· {v.price}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}

      {showDesktopCta && (
        <div className="hidden flex-col gap-[13px] sm:flex">
          <Button
            size="lg"
            className="min-h-12 w-full gap-2 bg-emerald-600 text-base hover:bg-emerald-700"
            onClick={() => onOfferAction?.(offer.id, offer.ctaType, { variantId })}
          >
            {offer.ctaType === 'call' ? (
              <Phone className="size-4" />
            ) : (
              <MessageCircle className="size-4" />
            )}
            {CTA_LABEL[offer.ctaType]}
          </Button>
          <Button size="lg" variant="outline" className="min-h-11 w-full" asChild>
            <Link href={categoryUrl}>
              <ChevronLeft className="size-4" />
              بازگشت به ویترین
            </Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
