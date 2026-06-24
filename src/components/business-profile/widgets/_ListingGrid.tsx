'use client';

import React from 'react';
import type { PropertyListing } from '@/contracts/business-profile';

/** Shared presentational grid for real-estate listing widgets. */
export function ListingGrid({
  listings,
  emptyText,
  limit = 6,
}: {
  listings: PropertyListing[];
  emptyText: string;
  limit?: number;
}) {
  if (!listings.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.slice(0, limit).map((l) => (
        <div key={l.id} className="overflow-hidden rounded-xl border">
          {l.image ? (
            <img src={l.image} alt={l.title} className="h-32 w-full object-cover" />
          ) : (
            <div className="h-32 w-full bg-muted" aria-hidden />
          )}
          <div className="space-y-1 p-3">
            <div className="line-clamp-1 text-sm font-medium">{l.title}</div>
            {l.location && <div className="text-xs text-muted-foreground">{l.location}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {l.price && <span>{l.price}</span>}
              {l.area && <span>{l.area}</span>}
              {typeof l.rooms === 'number' && <span>{l.rooms.toLocaleString('fa-IR')} خواب</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
