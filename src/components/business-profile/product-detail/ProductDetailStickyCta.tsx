'use client';

import Link from 'next/link';
import { ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import type { BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { Button } from '@/components/ui/button';
import { CTA_LABEL } from '../sections/types';

export function ProductDetailStickyCta({
  offer,
  categoryUrl,
  variantId,
  onOfferAction,
}: {
  offer: BusinessOffer;
  categoryUrl: string;
  variantId: string | null;
  onOfferAction?: (
    offerId: string,
    cta: OfferCtaType,
    opts?: { variantId: string | null }
  ) => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 p-4 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex gap-3" dir="rtl">
        <Button
          size="lg"
          className="min-h-12 flex-1 gap-2 bg-emerald-600 px-3 text-sm hover:bg-emerald-700"
          onClick={() => onOfferAction?.(offer.id, offer.ctaType, { variantId })}
        >
          {offer.ctaType === 'call' ? (
            <Phone className="size-4 shrink-0" />
          ) : (
            <MessageCircle className="size-4 shrink-0" />
          )}
          <span className="truncate">{CTA_LABEL[offer.ctaType]}</span>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-h-12 flex-1 gap-1.5 px-3 text-sm"
          asChild
        >
          <Link href={categoryUrl}>
            <ChevronLeft className="size-4 shrink-0" />
            <span className="truncate">بازگشت به ویترین</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
