'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { PropertyListing } from '@/contracts/business-profile';
import { propertyListingCategoryLabel } from '@/lib/business/real-estate-listing-categories';
import {
  listingPriceDisplay,
} from '@/lib/business/real-estate-listing-deal-types';
import { normalizePropertyListings, listingCoverImage } from '@/lib/business/normalize-property-listing';
import { cn } from '@/lib/utils';
import { useRealEstateHub } from '../RealEstateHubProvider';
import { IncompleteFieldHighlight } from '../IncompleteFieldHighlight';
import { ListingEditorFields, type ListingFormValue } from '../shared/ListingEditorFields';

function newListingId(): string {
  return `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY: ListingFormValue = {
  title: '',
  price: '',
  area: '',
  rooms: undefined,
  location: '',
  description: '',
  categorySlug: undefined,
  neighborhoodId: undefined,
  cityId: undefined,
  images: [],
  image: '',
  status: 'active',
  dealType: 'sell',
};

function listingSummary(listing: PropertyListing): string {
  const priceBit = listingPriceDisplay(listing);
  const parts = [
    propertyListingCategoryLabel(listing.categorySlug),
    listing.location,
    priceBit,
    listing.area ? `${listing.area} متر` : undefined,
  ].filter(Boolean);
  return parts.join(' · ') || 'بدون جزئیات';
}

export function RealEstateListingsPanel() {
  const { listings, reLoading, saveListings } = useRealEstateHub();
  const [items, setItems] = useState<PropertyListing[]>([]);
  const [draft, setDraft] = useState<ListingFormValue>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draftUploading, setDraftUploading] = useState(false);
  const [editUploading, setEditUploading] = useState(false);

  useEffect(() => {
    setItems(normalizePropertyListings(listings));
  }, [listings]);

  if (reLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری آگهی‌ها...
      </div>
    );
  }

  const addListing = () => {
    if (draftUploading) {
      toast.message('چند ثانیه صبر کنید — آپلود عکس‌ها در حال انجام است');
      return;
    }
    if (!draft.title.trim()) {
      toast.error('عنوان آگهی الزامی است');
      return;
    }
    if (!draft.categorySlug) {
      toast.error('دسته ملک را انتخاب کنید');
      return;
    }
    const id = newListingId();
    const row = normalizePropertyListings([{ ...draft, id }])[0]!;
    setItems((prev) => [...prev, row]);
    setDraft(EMPTY);
    setOpenId(id);
  };

  const removeListing = (id: string) => {
    setItems((prev) => prev.filter((l) => l.id !== id));
    if (openId === id) setOpenId(null);
  };

  const updateListing = (id: string, patch: Partial<PropertyListing>) => {
    setItems((prev) =>
      prev.map((l) => (l.id === id ? normalizePropertyListings([{ ...l, ...patch }])[0]! : l))
    );
  };

  const save = async () => {
    if (draftUploading || editUploading) {
      toast.message('آپلود تصاویر هنوز تمام نشده');
      return;
    }
    setSaving(true);
    try {
      await saveListings(normalizePropertyListings(items));
      toast.success('آگهی‌ها ذخیره شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        تا ۵ عکس — آپلود همزمان با پر کردن فرم. فیلدها بر اساس دسته ملک تغییر می‌کنند.
      </p>

      {items.map((listing) => {
        const cover = listingCoverImage(listing);
        return (
          <Collapsible
            key={listing.id}
            open={openId === listing.id}
            onOpenChange={(open) => setOpenId(open ? listing.id : null)}
          >
            <div className="rounded-xl border border-border/60 bg-card">
              <div className="flex items-center gap-2 p-3">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="size-11 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="size-11 shrink-0 rounded-lg bg-muted" aria-hidden />
                )}
                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-right">
                  <ChevronDown
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform',
                      openId === listing.id && 'rotate-180'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {listing.title || 'آگهی بدون عنوان'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {listingSummary(listing)}
                    </p>
                  </div>
                </CollapsibleTrigger>
                <Button variant="ghost" size="icon" onClick={() => removeListing(listing.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <CollapsibleContent className="border-t border-border/50 px-4 py-4">
                <ListingEditorFields
                  showStatus
                  value={listing}
                  onChange={(patch) => updateListing(listing.id, patch)}
                  onUploadingChange={setEditUploading}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      <IncompleteFieldHighlight itemId="listings">
        <section className="rounded-xl border border-border/60 bg-muted/15 p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold">افزودن آگهی</h3>
          <ListingEditorFields
            value={draft}
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
            onUploadingChange={setDraftUploading}
          />
          <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {draftUploading && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                عکس‌ها در پس‌زمینه آپلود می‌شوند...
              </p>
            )}
            <Button
              type="button"
              size="sm"
              onClick={addListing}
              disabled={draftUploading}
              className="gap-1.5 min-h-10 w-full sm:ms-auto sm:w-auto"
            >
              <Plus className="size-4" />
              افزودن به لیست
            </Button>
          </div>
        </section>
      </IncompleteFieldHighlight>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving || draftUploading || editUploading} className="min-h-10 gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره
        </Button>
      </div>
    </div>
  );
}
