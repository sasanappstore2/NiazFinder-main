'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';
import { getListings, soldListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';

export default function SoldProperties({ business }: { business: Business; requestId?: string }) {
  return (
    <ListingGrid
      listings={soldListings(getListings(business))}
      emptyText="ملک فروخته‌شده‌ای ثبت نشده است."
    />
  );
}
