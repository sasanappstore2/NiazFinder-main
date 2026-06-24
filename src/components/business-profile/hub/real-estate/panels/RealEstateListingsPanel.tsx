'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PropertyListing } from '@/contracts/business-profile';
import { useRealEstateHub } from '../RealEstateHubProvider';
import { IncompleteFieldHighlight } from '../IncompleteFieldHighlight';
import { HubMediaUpload } from '../shared/HubMediaUpload';

function newListingId(): string {
  return `lst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY: Omit<PropertyListing, 'id'> = {
  title: '',
  price: '',
  area: '',
  rooms: undefined,
  location: '',
  status: 'active',
  dealType: 'sale',
  image: '',
};

export function RealEstateListingsPanel() {
  const { listings, reLoading, saveListings } = useRealEstateHub();
  const [items, setItems] = useState<PropertyListing[]>([]);
  const [draft, setDraft] = useState<Omit<PropertyListing, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(listings);
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
    if (!draft.title.trim()) {
      toast.error('عنوان آگهی الزامی است');
      return;
    }
    setItems((prev) => [...prev, { ...draft, id: newListingId() }]);
    setDraft(EMPTY);
  };

  const removeListing = (id: string) => {
    setItems((prev) => prev.filter((l) => l.id !== id));
  };

  const updateListing = (id: string, patch: Partial<PropertyListing>) => {
    setItems((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveListings(items);
      toast.success('آگهی‌ها ذخیره شد');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        آگهی‌های فعال، فروخته‌شده و اجاره‌ای در ویجت‌های صفحه عمومی شما نمایش داده می‌شوند.
      </p>

      {items.map((listing) => (
        <Card key={listing.id} className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{listing.title || 'آگهی بدون عنوان'}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => removeListing(listing.id)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>عنوان</Label>
              <Input
                value={listing.title}
                onChange={(e) => updateListing(listing.id, { title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>قیمت</Label>
              <Input
                value={listing.price ?? ''}
                onChange={(e) => updateListing(listing.id, { price: e.target.value })}
                placeholder="مثلاً ۱۲ میلیارد"
              />
            </div>
            <div className="space-y-1">
              <Label>متراژ</Label>
              <Input
                value={listing.area ?? ''}
                onChange={(e) => updateListing(listing.id, { area: e.target.value })}
                placeholder="مثلاً ۱۲۰ متر"
              />
            </div>
            <div className="space-y-1">
              <Label>اتاق</Label>
              <Input
                type="number"
                min={0}
                value={listing.rooms ?? ''}
                onChange={(e) =>
                  updateListing(listing.id, {
                    rooms: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>محله / منطقه</Label>
              <Input
                value={listing.location ?? ''}
                onChange={(e) => updateListing(listing.id, { location: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>وضعیت</Label>
              <Select
                value={listing.status ?? 'active'}
                onValueChange={(v) =>
                  updateListing(listing.id, { status: v as PropertyListing['status'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">فعال</SelectItem>
                  <SelectItem value="sold">فروخته‌شده</SelectItem>
                  <SelectItem value="rented">اجاره رفته</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>نوع معامله</Label>
              <Select
                value={listing.dealType ?? 'sale'}
                onValueChange={(v) =>
                  updateListing(listing.id, { dealType: v as PropertyListing['dealType'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">فروش</SelectItem>
                  <SelectItem value="rent">اجاره</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <HubMediaUpload
                label="تصویر ملک"
                value={listing.image ?? ''}
                onChange={(url) => updateListing(listing.id, { image: url })}
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <IncompleteFieldHighlight itemId="listings">
      <Card className="border-dashed border-blue-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">افزودن آگهی جدید</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>عنوان *</Label>
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="آپارتمان ۱۲۰ متری در ..."
            />
          </div>
          <div className="space-y-1">
            <Label>قیمت</Label>
            <Input
              value={draft.price ?? ''}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>متراژ</Label>
            <Input
              value={draft.area ?? ''}
              onChange={(e) => setDraft({ ...draft, area: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <HubMediaUpload
              label="تصویر"
              value={draft.image ?? ''}
              onChange={(url) => setDraft({ ...draft, image: url })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={addListing} className="gap-1.5">
              <Plus className="size-4" />
              افزودن به لیست
            </Button>
          </div>
        </CardContent>
      </Card>
      </IncompleteFieldHighlight>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="min-h-11 gap-2 bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره همه آگهی‌ها
        </Button>
      </div>
    </div>
  );
}
