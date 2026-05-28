'use client';

import { useRouter } from 'next/navigation';
import type { Business, BusinessOffer, OfferCtaType } from '@/contracts/business-profile';
import { buildProductChatIntro } from '@/lib/chat/product-chat-intro';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { ProductDetailView } from './ProductDetailView';
import { useAppStore } from '@/lib/store';

export function ProductDetailActions({
  business,
  offer,
  requestId,
}: {
  business: Business;
  offer: BusinessOffer;
  requestId?: string;
}) {
  const router = useRouter();
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

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
      const { startConversation, navigateToConversation } = await import(
        '@/lib/contact/start-conversation'
      );
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

      if (!isAuthenticated || !authToken) {
        savePendingContact({
          action: 'chat',
          otherUserId: business.userId,
          requestId,
          returnTo: typeof window !== 'undefined' ? window.location.href : undefined,
          productIntro,
        });
        setAuthModalOpen(true);
        return;
      }
      try {
        const { conversationId } = await startConversation(
          {
            otherUserId: business.userId,
            requestId,
            productIntro,
          },
          authToken
        );
        navigateToConversation(router, conversationId);
      } catch (e) {
        const { toast } = await import('sonner');
        if (e instanceof Error && e.message !== 'AUTH_REQUIRED') {
          toast.error(e.message || 'خطا در باز کردن چت');
        }
      }
    }
  };

  return (
    <ProductDetailView
      business={business}
      offer={offer}
      requestId={requestId}
      onOfferAction={handleOfferAction}
    />
  );
}
