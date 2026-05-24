'use client';

import { useParams, useRouter } from 'next/navigation';
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
import { routeBuilder } from '@/config/routes';

interface Props {
  /** Override route param id (defaults to useParams). */
  businessId?: string;
}

export function UniversalBusinessProfile({ businessId: businessIdProp }: Props) {
  const params = useParams();
  const router = useRouter();
  const id = businessIdProp ?? (params?.id as string | undefined);
  const { business, loading, error } = useBusinessProfile(id);

  const handleOfferAction = (_offerId: string, cta: OfferCtaType) => {
    if (!business) return;
    if (cta === 'call' && business.contact.phone) {
      window.location.href = `tel:${business.contact.phone}`;
      return;
    }
    router.push(routeBuilder.chatNew());
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
      <BusinessHero business={business} />
      <BusinessContactSection business={business} />
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
