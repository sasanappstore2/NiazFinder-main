'use client';

import type { Business } from '@/contracts/business-profile';
import { getListings, soldListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';
import { useListingContact } from './use-listing-contact';

export default function SoldProperties({
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
      listings={soldListings(getListings(business))}
      emptyText="ملک فروخته‌شده‌ای ثبت نشده است."
      business={business}
      requestId={requestId}
      onChat={() => void onChat()}
      onCall={() => void onCall()}
    />
    </>
  );
}
