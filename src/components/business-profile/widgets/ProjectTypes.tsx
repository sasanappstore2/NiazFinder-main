'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';

/** Project types an architect takes on — derived from their published offers. */
export default function ProjectTypes({ business }: { business: Business; requestId?: string }) {
  const offers = business.offers ?? [];

  if (!offers.length) {
    return <p className="text-sm text-muted-foreground">نوع پروژه‌ای ثبت نشده است.</p>;
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {offers.slice(0, 8).map((offer) => (
        <li key={offer.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 shrink-0 text-primary" />
            <span className="truncate">{offer.title}</span>
          </span>
          {offer.priceRange && (
            <span className="shrink-0 text-xs text-muted-foreground">{offer.priceRange}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
