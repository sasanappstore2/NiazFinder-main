'use client';

import { MessageCircle, Phone, X } from 'lucide-react';
import type { Business, PropertyListing } from '@/contracts/business-profile';
import { PropertyListingDetailContent } from '@/components/business-profile/PropertyListingDetailContent';
import { listingCoverImage } from '@/lib/business/normalize-property-listing';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

export function PropertyListingDetailSheet({
  listing,
  business: _business,
  requestId,
  open,
  onOpenChange,
  onChat,
  onCall,
}: {
  listing: PropertyListing | null;
  business: Business;
  requestId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChat?: () => void;
  onCall?: () => void;
}) {
  if (!listing) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="flex min-h-[72vh] max-h-[94vh] flex-col gap-0 overflow-hidden rounded-t-2xl border-t p-0"
      >
        <SheetTitle className="sr-only">{listing.title}</SheetTitle>

        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <PropertyListingDetailContent
            listing={listing}
            heroOverlay={
              <button
                type="button"
                className="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                onClick={() => onOpenChange(false)}
                aria-label="بستن"
              >
                <X className="size-3.5" />
              </button>
            }
            footer={
              (onChat || onCall) ? (
                <div className="shrink-0 border-t border-border/50 bg-background/95 px-4 py-3 backdrop-blur-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {onCall && (
                      <Button type="button" size="lg" variant="outline" className="gap-2" onClick={onCall}>
                        <Phone className="size-4" />
                        تماس
                      </Button>
                    )}
                    {onChat && (
                      <Button type="button" size="lg" className="gap-2" onClick={onChat}>
                        <MessageCircle className="size-4" />
                        {requestId ? 'گفتگو' : 'شروع چت'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : undefined
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export { listingCoverImage };
