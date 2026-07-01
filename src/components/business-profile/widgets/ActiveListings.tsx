'use client';

import type { Business } from '@/contracts/business-profile';
import { activeListings, getListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';
import { useListingContact } from './use-listing-contact';

export default function ActiveListings({
  business,
  requestId,
}: {
  business: Business;
  requestId?: string;
}) {
  const { onChat, onCall, callSheet } = useListingContact(business, requestId);

  return (
    <>
      {callSheet}
      <ListingGrid
        listings={activeListings(getListings(business))}
        emptyText="هنوز آگهی فعالی ثبت نشده است."
        business={business}
        requestId={requestId}
        onChat={() => void onChat()}
        onCall={() => void onCall()}
      />
    </>
  );
}
