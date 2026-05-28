'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { routeBuilder } from '@/config/routes';
import { Button } from '@/components/ui/button';
import { ProductDetailBreadcrumb } from './ProductDetailBreadcrumb';
import { ProductDetailGallery } from './ProductDetailGallery';
import { ProductDetailBuyPanel } from './ProductDetailBuyPanel';
import { ProductDetailDescription } from './ProductDetailDescription';
import { ProductDetailSpecs } from './ProductDetailSpecs';
import { ProductDetailFaq } from './ProductDetailFaq';
import { ProductDetailStickyCta } from './ProductDetailStickyCta';
import { displayImages, displayPrice } from './product-detail-utils';
import {
  PRODUCT_GRID_DESKTOP,
  PRODUCT_PAGE_MAX,
  PRODUCT_SECTION_DIVIDER,
} from './product-detail-tokens';

export function ProductDetailPage({
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
  const [variantId, setVariantId] = useState<string | null>(
    offer.variants?.[0]?.id ?? null
  );
  const [activeImage, setActiveImage] = useState(0);

  const images = useMemo(() => displayImages(offer, variantId), [offer, variantId]);
  const price = displayPrice(offer, variantId);

  const profileUrl = requestId
    ? `${routeBuilder.businessProfile(business.slug)}?need=${encodeURIComponent(requestId)}`
    : routeBuilder.businessProfile(business.slug);

  const primaryCategoryId = offer.primaryCategoryId ?? offer.categoryIds?.[0];
  const category = business.extensions?.storefront?.categories?.find(
    (c) => c.id === primaryCategoryId
  );
  const categoryUrl = primaryCategoryId
    ? routeBuilder.businessVitrine(business.slug, primaryCategoryId)
    : routeBuilder.businessProfile(business.slug, { tab: 'products' });

  const handleVariant = (id: string) => {
    setVariantId(id);
    setActiveImage(0);
  };

  const hasLowerContent =
    Boolean(offer.description?.trim()) ||
    offer.features.length > 0 ||
    Boolean(offer.faq?.length);

  return (
    <div className={PRODUCT_PAGE_MAX}>
      <div className="pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-[34px]">
        <ProductDetailBreadcrumb
          profileUrl={profileUrl}
          businessName={business.name}
          categoryUrl={categoryUrl}
          categoryTitle={category?.title}
          productTitle={offer.title}
        />

        <div className={PRODUCT_GRID_DESKTOP}>
          <ProductDetailGallery
            images={images}
            title={offer.title}
            activeIndex={activeImage}
            onActiveIndexChange={setActiveImage}
          />

          <ProductDetailBuyPanel
            business={business}
            offer={offer}
            profileUrl={profileUrl}
            categoryUrl={categoryUrl}
            price={price}
            variantId={variantId}
            onVariantChange={handleVariant}
            onOfferAction={onOfferAction}
          />
        </div>

        {hasLowerContent && (
          <div className={PRODUCT_SECTION_DIVIDER}>
            <div className="flex flex-col gap-[34px]">
              <ProductDetailDescription description={offer.description} />
              <ProductDetailSpecs features={offer.features} />
              <ProductDetailFaq faq={offer.faq} />
            </div>
          </div>
        )}

        <div className="mt-[21px] sm:hidden">
          <Button variant="ghost" asChild className="gap-2">
            <Link href={profileUrl}>
              <ArrowRight className="size-4" />
              بازگشت به فروشگاه
            </Link>
          </Button>
        </div>
      </div>

      <ProductDetailStickyCta
        offer={offer}
        categoryUrl={categoryUrl}
        variantId={variantId}
        onOfferAction={onOfferAction}
      />
    </div>
  );
}
