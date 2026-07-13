'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle, Phone, X } from 'lucide-react';
import type { Business, PropertyListing } from '@/contracts/business-profile';
import { routeBuilder } from '@/config/routes';
import { PropertyListingDetailContent } from '@/components/business-profile/PropertyListingDetailContent';
import { useListingContact } from '@/components/business-profile/widgets/use-listing-contact';
import { Button } from '@/components/ui/button';

export function PropertyListingDetailActions({
  business,
  listing,
  requestId,
}: {
  business: Business;
  listing: PropertyListing;
  requestId?: string;
}) {
  const { onChat, onCall, callSheet } = useListingContact(business, requestId);

  return (
    <>
      {callSheet}
      <div className="mx-auto w-full max-w-3xl pb-24">
        <div className="mb-3 flex items-center justify-between gap-3 px-4 pt-2">
          <Button variant="ghost" size="sm" className="gap-1.5 px-2" asChild>
            <Link href={routeBuilder.businessProfile(business.slug)}>
              <ArrowRight className="size-4" />
              {business.name}
            </Link>
          </Button>
        </div>

        <PropertyListingDetailContent
          listing={listing}
          heroOverlay={
            <Link
              href={routeBuilder.businessProfile(business.slug)}
              className="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
              aria-label="بازگشت"
            >
              <X className="size-3.5" />
            </Link>
          }
        />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2">
          <Button type="button" size="lg" variant="outline" className="gap-2" onClick={() => void onCall()}>
            <Phone className="size-4" />
            تماس
          </Button>
          <Button type="button" size="lg" className="gap-2" onClick={() => void onChat()}>
            <MessageCircle className="size-4" />
            {requestId ? 'گفتگو' : 'شروع چت'}
          </Button>
        </div>
      </div>
    </>
  );
}
