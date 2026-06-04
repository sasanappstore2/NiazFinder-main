'use client';

import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { buildProductChatIntro } from '@/lib/chat/product-chat-intro';
import { ProductDetailView } from './ProductDetailView';
import { useAppStore } from '@/lib/store';
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
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const { openBusinessContact, picker } = useBusinessContact();

  const handleOfferAction = async (
    _offerId: string,
    cta: OfferCtaType,
    opts?: { variantId: string | null }
  ) => {
    if (cta === 'call') {
      if (!isAuthenticated || !authToken) {
        setAuthModalOpen(true);
        return;
      }
      const { fetchUserContact } = await import('@/lib/contact/fetch-contact');
      try {
        const contact = await fetchUserContact(business.userId, authToken);
        const parts = contact.displayName.split(/\s+/);
        openVoiceCall({
          id: business.userId,
          firstName: parts[0] ?? business.name,
          lastName: parts.slice(1).join(' ') || '',
          displayName: contact.displayName,
        });
      } catch {
        const { toast } = await import('sonner');
        toast.error('خطا در برقراری تماس');
      }
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
      <ProductDetailView
        business={business}
        offer={offer}
        requestId={requestId}
        onOfferAction={handleOfferAction}
      />
    </>
  );
}
