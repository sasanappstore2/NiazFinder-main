'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { Business } from '@/contracts/business-profile';

export default function ServicePackages({ business }: { business: Business; requestId?: string }) {
  const offers = business.offers ?? [];

  if (!offers.length) {
    return <p className="text-sm text-muted-foreground">پکیج خدماتی ثبت نشده است.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {offers.slice(0, 4).map((offer) => (
        <article key={offer.id} className="flex flex-col rounded-xl border p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold">{offer.title}</h4>
            {offer.priceRange && (
              <span className="shrink-0 text-xs font-medium text-primary">{offer.priceRange}</span>
            )}
          </div>
          {offer.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
          )}
          {offer.features.length > 0 && (
            <ul className="mt-3 space-y-1">
              {offer.features.slice(0, 5).map((f, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs">
                  <Check className="size-3.5 shrink-0 text-emerald-500" />
                  <span className="truncate">{f}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
