'use client';

import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { ProductDetailPage } from './product-detail/ProductDetailPage';

export function ProductDetailView({
  business,
  offer,
  requestId,
  onOfferAction,
}: {
  business: Business;
  offer: BusinessOffer;
  requestId?: string;
  onOfferAction?: (
    offerId: string,
    cta: OfferCtaType,
    opts?: { variantId: string | null }
  ) => void;
}) {
  return (
    <ProductDetailPage
      business={business}
      offer={offer}
      requestId={requestId}
      onOfferAction={onOfferAction}
    />
  );
}
