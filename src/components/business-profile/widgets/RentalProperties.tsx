'use client';

import type { Business } from '@/contracts/business-profile';
import { getListings, rentalListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';
import { useListingContact } from './use-listing-contact';

export default function RentalProperties({
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
      listings={rentalListings(getListings(business))}
      emptyText="ملک اجاره‌ای ثبت نشده است."
      business={business}
      requestId={requestId}
      onChat={() => void onChat()}
      onCall={() => void onCall()}
    />
    </>
  );
}
