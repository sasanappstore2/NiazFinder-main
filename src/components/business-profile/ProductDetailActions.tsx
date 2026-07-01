'use client';

import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { buildProductChatIntro } from '@/lib/chat/product-chat-intro';
import { ProductDetailView } from './ProductDetailView';
import { useContactCallSheet } from '@/components/contact/use-contact-call-sheet';
import { useBusinessContact } from '@/hooks/use-business-contact';

export function ProductDetailActions({
  business,
  offer,
  requestId,
}: {
  business: Business;
  offer: BusinessOffer;
  requestId?: string;
}) {
  const { openBusinessContact, picker } = useBusinessContact();
  const { openCallSheet, sheet: callSheet } = useContactCallSheet();

  const handleOfferAction = async (
    _offerId: string,
    cta: OfferCtaType,
    opts?: { variantId: string | null }
  ) => {
    if (cta === 'call') {
      await openCallSheet({
        otherUserId: business.userId,
        requestId,
        displayName: business.name,
        avatarUrl: business.identity.logo,
      });
      return;
    }
    if (cta === 'chat' || cta === 'book' || cta === 'quote') {
      const baseIntro = buildProductChatIntro(business.slug, offer, opts?.variantId ?? null);
      const productIntro = {
        ...baseIntro,
        businessName: business.name,
        businessSlug: business.slug,
        productUrl:
          typeof window !== 'undefined'
            ? `${window.location.origin}${baseIntro.productUrl}`
            : baseIntro.productUrl,
      };

      await openBusinessContact({
        businessSlug: business.slug,
        requestId,
        productIntro,
        returnTo: typeof window !== 'undefined' ? window.location.href : undefined,
      });
    }
  };

  return (
    <>
      {picker}
      {callSheet}
      <ProductDetailView
        business={business}
        offer={offer}
        requestId={requestId}
        onOfferAction={handleOfferAction}
      />
    </>
  );
}
