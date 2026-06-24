'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import {
  Banknote,
  BedDouble,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  KeyRound,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Tag,
  X,
} from 'lucide-react';
import type { Business, PropertyListing } from '@/contracts/business-profile';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import {
  listingPriceDisplay,
  propertyListingDealTypeLabel,
} from '@/lib/business/real-estate-listing-deal-types';
import { listingCoverImage } from '@/lib/business/normalize-property-listing';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type SpecItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

function buildSpecItems(listing: PropertyListing): SpecItem[] {
  const items: SpecItem[] = [];

  if (listing.area) {
    items.push({
      key: 'area',
      icon: Ruler,
      label: 'متراژ',
      value: `${listing.area} متر`,
    });
  }
  if (typeof listing.rooms === 'number') {
    items.push({
      key: 'rooms',
      icon: BedDouble,
      label: 'اتاق',
      value: listing.rooms.toLocaleString('fa-IR'),
    });
  }
  if (typeof listing.floor === 'number') {
    items.push({
      key: 'floor',
      icon: Layers,
      label: 'طبقه',
      value: listing.floor.toLocaleString('fa-IR'),
    });
  }
  if (listing.plotWidth) {
    items.push({
      key: 'plot',
      icon: Ruler,
      label: 'عرض زمین',
      value: `${listing.plotWidth} متر`,
    });
  }
  if (listing.pricePerMeter) {
    items.push({
      key: 'ppm',
      icon: Banknote,
      label: 'قیمت هر متر',
      value: listing.pricePerMeter,
    });
  }
  if (listing.deposit) {
    items.push({
      key: 'deposit',
      icon: KeyRound,
      label: 'ودیعه / رهن',
      value: listing.deposit,
    });
  }
  if (listing.monthlyRent) {
    items.push({
      key: 'rent',
      icon: Banknote,
      label: 'اجاره ماهانه',
      value: listing.monthlyRent,
    });
  }

  return items;
}

function SpecCard({ icon: Icon, label, value }: Omit<SpecItem, 'key'>) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

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
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    setActiveImage(0);
  }, [listing?.id]);

  if (!listing) return null;

  const images =
    listing.images?.length ? listing.images : listing.image ? [listing.image] : [];
  const price = listingPriceDisplay(listing);
  const categoryLabel = propertyListingCategoryLabel(listing.categorySlug);
  const dealLabel = listing.dealType ? propertyListingDealTypeLabel(listing.dealType) : null;
  const specs = buildSpecItems(listing);
  const heroUrl = images[activeImage] ?? listingCoverImage(listing);
  const hasMultiple = images.length > 1;

  const goPrev = () => setActiveImage((i) => (i <= 0 ? images.length - 1 : i - 1));
  const goNext = () => setActiveImage((i) => (i >= images.length - 1 ? 0 : i + 1));

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
          <div className="px-4 pt-1">
            <div className="relative mx-auto w-full max-w-lg">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                {heroUrl ? (
                  <Image
                    src={heroUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                    priority
                    sizes="(max-width: 640px) 100vw, 512px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <Building2 className="size-10 opacity-30" />
                  </div>
                )}

                <button
                  type="button"
                  className="absolute top-2 end-2 flex size-8 items-center justify-center rounded-full bg-background/90 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                  onClick={() => onOpenChange(false)}
                  aria-label="بستن"
                >
                  <X className="size-3.5" />
                </button>

                {hasMultiple && (
                  <>
                    <button
                      type="button"
                      onClick={goPrev}
                      className="absolute top-1/2 start-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                      aria-label="عکس قبلی"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="absolute top-1/2 end-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                      aria-label="عکس بعدی"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="absolute bottom-2 start-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      {(activeImage + 1).toLocaleString('fa-IR')} / {images.length.toLocaleString('fa-IR')}
                    </span>
                  </>
                )}
              </div>

              {hasMultiple && (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        'relative size-11 shrink-0 overflow-hidden rounded-md border transition-all',
                        i === activeImage
                          ? 'border-primary ring-1 ring-primary/30'
                          : 'border-border/50 opacity-60 hover:opacity-100'
                      )}
                    >
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 px-4 py-3">
            {price && (
              <p className="text-base font-bold text-primary sm:text-lg">{price}</p>
            )}

            <div className="space-y-2">
              <h2 className="text-sm font-semibold leading-snug sm:text-base">{listing.title}</h2>
              <div className="flex flex-wrap gap-1.5">
                {dealLabel && (
                  <Badge variant="secondary" className="h-6 gap-1 px-2 text-[11px] font-normal">
                    <Tag className="size-3" />
                    {dealLabel}
                  </Badge>
                )}
                {categoryLabel && (
                  <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px] font-normal">
                    <Building2 className="size-3" />
                    {categoryLabel}
                  </Badge>
                )}
                {listing.location && (
                  <Badge variant="outline" className="h-6 gap-1 px-2 text-[11px] font-normal">
                    <MapPin className="size-3" />
                    {listing.location}
                  </Badge>
                )}
              </div>
            </div>

            {specs.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {specs.map(({ key, ...spec }) => (
                  <SpecCard key={key} {...spec} />
                ))}
              </div>
            )}

            {listing.description && (
              <div className="rounded-lg border border-border/40 bg-muted/15 p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <FileText className="size-3.5" />
                  توضیحات
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                  {listing.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {(onChat || onCall) && (
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
        )}
      </SheetContent>
    </Sheet>
  );
}

export { listingCoverImage };
