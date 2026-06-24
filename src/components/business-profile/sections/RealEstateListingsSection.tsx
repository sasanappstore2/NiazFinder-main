'use client';

import { ListingGrid } from '@/components/business-profile/widgets/_ListingGrid';
import { useListingContact } from '@/components/business-profile/widgets/use-listing-contact';
import {
  activeListings,
  getListings,
  rentalListings,
  soldListings,
} from '@/lib/business/real-estate-listings';
import type { SectionProps } from './types';

export function RealEstateListingsSection({ business, requestId }: SectionProps) {
  const { onChat, onCall } = useListingContact(business, requestId);

  const all = getListings(business);
  const active = activeListings(all);
  const sold = soldListings(all);
  const rental = rentalListings(all);

  if (!all.length) return null;

  return (
    <section id="section-listings" className="scroll-mt-24 space-y-8">
      {active.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">آگهی‌های فعال</h2>
          <ListingGrid
            listings={active}
            emptyText="هنوز آگهی فعالی ثبت نشده است."
            business={business}
            requestId={requestId}
            onChat={onChat}
            onCall={onCall}
          />
        </div>
      )}

      {sold.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">فروخته‌شده</h2>
          <ListingGrid
            listings={sold}
            emptyText=""
            business={business}
            requestId={requestId}
            onChat={onChat}
            onCall={onCall}
          />
        </div>
      )}

      {rental.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">املاک اجاره‌ای</h2>
          <ListingGrid
            listings={rental}
            emptyText=""
            business={business}
            requestId={requestId}
            onChat={onChat}
            onCall={onCall}
          />
        </div>
      )}
    </section>
  );
}
