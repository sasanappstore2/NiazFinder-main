'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Business, PropertyListing } from '@/contracts/business-profile';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import { listingPriceDisplay } from '@/lib/business/real-estate-listing-deal-types';
import { listingCoverImage } from '@/lib/business/normalize-property-listing';
import { cn } from '@/lib/utils';
import { PropertyListingDetailSheet } from './PropertyListingDetailSheet';

/** Shared presentational grid for real-estate listing widgets. */
export function ListingGrid({
  listings,
  emptyText,
  limit = 6,
  business,
  requestId,
  onChat,
  onCall,
}: {
  listings: PropertyListing[];
  emptyText: string;
  limit?: number;
  business?: Business;
  requestId?: string;
  onChat?: () => void;
  onCall?: () => void;
}) {
  const [selected, setSelected] = useState<PropertyListing | null>(null);

  if (!listings.length) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const interactive = Boolean(business);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.slice(0, limit).map((l) => {
          const cover = listingCoverImage(l);
          const inner = (
            <>
              {cover ? (
                <div className="relative aspect-square w-full bg-muted">
                  <Image
                    src={cover}
                    alt={l.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px"
                  />
                </div>
              ) : (
                <div className="aspect-square w-full bg-muted" aria-hidden />
              )}
              <div className="space-y-1 p-3">
                <div className="line-clamp-1 text-sm font-medium">{l.title}</div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {propertyListingCategoryLabel(l.categorySlug) && (
                    <span>{propertyListingCategoryLabel(l.categorySlug)}</span>
                  )}
                  {l.location && <span>{l.location}</span>}
                </div>
                {l.description && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{l.description}</p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {listingPriceDisplay(l) && <span>{listingPriceDisplay(l)}</span>}
                  {l.area && <span>{l.area}</span>}
                  {typeof l.rooms === 'number' && (
                    <span>{l.rooms.toLocaleString('fa-IR')} خواب</span>
                  )}
                </div>
              </div>
            </>
          );

          if (!interactive) {
            return (
              <div key={l.id} className="overflow-hidden rounded-xl border">
                {inner}
              </div>
            );
          }

          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setSelected(l)}
              className={cn(
                'overflow-hidden rounded-xl border text-start transition-colors',
                'hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
              )}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {business && (
        <PropertyListingDetailSheet
          listing={selected}
          business={business}
          requestId={requestId}
          open={selected !== null}
          onOpenChange={(open) => !open && setSelected(null)}
          onChat={onChat}
          onCall={onCall}
        />
      )}
    </>
  );
}
