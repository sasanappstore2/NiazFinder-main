'use client';

import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBusinessProfile } from '@/hooks/use-business-profile';
import { BusinessAssistantPanel } from '@/components/business-profile/BusinessAssistantPanel';
import { BUSINESS_AI_ASSISTANT_ENABLED } from '@/config/business-profile-features';
import { ProfileShell } from '@/components/business-profile/ProfileShell';
import { ProfileTabbedContent } from '@/components/business-profile/ProfileTabbedContent';
import { useProfileSections } from '@/components/business-profile/hooks/useProfileSections';
import type { OfferCtaType } from '@/contracts/business-profile';
import { useAppStore } from '@/lib/store';

interface Props {
  businessId?: string;
}

export function UniversalBusinessProfile({ businessId: businessIdProp }: Props) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      }
    >
      <UniversalBusinessProfileInner businessId={businessIdProp} />
    </Suspense>
  );
}

function UniversalBusinessProfileInner({ businessId: businessIdProp }: Props) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('need') ?? undefined;
  const id = businessIdProp ?? (params?.id as string | undefined);
  const { business, loading, error } = useBusinessProfile(id);
  const layout = useProfileSections(business);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const authUserId = useAppStore((s) => s.currentUser?.id);
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
    if (cta === 'chat' || cta === 'book' || cta === 'quote') {
      const { startConversation, syncAndNavigateToConversation } = await import(
        '@/lib/contact/start-conversation'
      );
      if (!isAuthenticated || !authToken) {
        setAuthModalOpen(true);
        return;
      }
      try {
        const result = await startConversation(
          { otherUserId: business.userId, requestId },
          authToken
        );
        syncAndNavigateToConversation(router, result);
      } catch {
        const { toast } = await import('sonner');
        toast.error('خطا در باز کردن چت');
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !business || !layout) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-muted-foreground">{error ?? 'کسب‌وکار یافت نشد'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowRight className="ml-2 size-4" />
          بازگشت
        </Button>
      </div>
    );
  }

  const isOwnerView = Boolean(business && authUserId && business.userId === authUserId);

  return (
    <>
      <ProfileShell business={business} requestId={requestId}>
        <ProfileTabbedContent
          business={business}
          layout={layout}
          requestId={requestId}
          onOfferAction={handleOfferAction}
          isOwnerView={isOwnerView}
        />
      </ProfileShell>
      {BUSINESS_AI_ASSISTANT_ENABLED && <BusinessAssistantPanel business={business} />}
    </>
  );
}
