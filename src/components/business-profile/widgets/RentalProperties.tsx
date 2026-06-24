'use client';

import React from 'react';
import type { Business } from '@/contracts/business-profile';
import { getListings, rentalListings } from '@/lib/business/real-estate-listings';
import { ListingGrid } from './_ListingGrid';

export default function RentalProperties({ business }: { business: Business; requestId?: string }) {
  return (
    <ListingGrid
      listings={rentalListings(getListings(business))}
      emptyText="ملک اجاره‌ای ثبت نشده است."
    />
  );
}
