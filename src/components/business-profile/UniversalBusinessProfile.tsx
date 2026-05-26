'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { BusinessAssistantPanel } from '@/components/business-profile/BusinessAssistantPanel';
import {
  BusinessHero,
  BusinessIdentitySection,
  BusinessOffersSection,
  BusinessPortfolioSection,
  BusinessTrustSection,
  BusinessContactSection,
  BusinessSeoSection,
  BusinessExtensionsSection,
} from '@/components/business-profile/sections';
import type { OfferCtaType } from '@/contracts/business-profile';
import { useAppStore } from '@/lib/store';

interface Props {
  /** Override route param id (defaults to useParams). */
  businessId?: string;
}

export function UniversalBusinessProfile({ businessId: businessIdProp }: Props) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('need') ?? undefined;
  const id = businessIdProp ?? (params?.id as string | undefined);
  const { business, loading, error } = useBusinessProfile(id);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const handleOfferAction = async (_offerId: string, cta: OfferCtaType) => {
    if (!business) return;
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
    if (cta === 'chat') {
      const { startConversation, navigateToConversation } = await import(
        '@/lib/contact/start-conversation'
      );
      if (!isAuthenticated || !authToken) {
        setAuthModalOpen(true);
        return;
      }
      try {
        const { conversationId } = await startConversation(
          { otherUserId: business.userId, requestId },
          authToken
        );
        navigateToConversation(router, conversationId);
      } catch {
        const { toast } = await import('sonner');
        toast.error('خطا در باز کردن چت');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-muted-foreground">{error ?? 'کسب‌وکار یافت نشد'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="size-4 ml-2" />
          بازگشت
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <BusinessHero business={business} requestId={requestId} />
      <BusinessContactSection business={business} requestId={requestId} />
      <Separator />
      <BusinessIdentitySection business={business} />
      <BusinessExtensionsSection business={business} />
      <BusinessOffersSection business={business} onOfferAction={handleOfferAction} />
      <BusinessPortfolioSection business={business} />
      <BusinessTrustSection business={business} />
      <BusinessSeoSection business={business} />
      <BusinessAssistantPanel business={business} />
    </div>
  );
}
