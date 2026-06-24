'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';
import { activeListings, getListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';

export default function ActiveListings({ business }: { business: Business; requestId?: string }) {
  return (
    <ListingGrid
      listings={activeListings(getListings(business))}
      emptyText="هنوز آگهی فعالی ثبت نشده است."
    />
  );
}
