'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { formatPriceText } from '@/lib/format/money';
import { useBusinessHub } from '../../BusinessHubContext';
import { IncompleteFieldHighlight } from '../IncompleteFieldHighlight';

type OfferRow = {
  id: string;
  title: string;
  description: string;
  priceRange?: string;
};

export function RealEstateServicesPanel() {
  const { refresh } = useBusinessHub();
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [draft, setDraft] = useState({ title: '', description: '', priceRange: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/me/offers', { headers: getClientAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { offers?: OfferRow[] };
        setOffers(data.offers ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      toast.error('عنوان و توضیحات الزامی است');
      return;
    }
    const res = await fetch('/api/business/me/offers', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(draft),
    });
    if (!res.ok) {
      toast.error('افزودن خدمت ناموفق بود');
      return;
    }
    toast.success('ذخیره شد');
    setDraft({ title: '', description: '', priceRange: '' });
    await load();
    void refresh();
  };

  const remove = async (id: string) => {
    await fetch(`/api/business/me/offers/${id}`, {
      method: 'DELETE',
      headers: getClientAuthHeaders(),
    });
    await load();
    void refresh();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-10 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        در حال بارگذاری...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        پکیج‌ها و خدمات در ویجت‌های «پکیج خدمات» یا «انواع پروژه» نمایش داده می‌شوند.
      </p>

      {offers.map((o) => (
        <div key={o.id} className="flex items-start justify-between gap-2 rounded-lg border p-3">
          <div>
            <p className="font-medium">{o.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{o.description}</p>
            {o.priceRange && (
              <p className="mt-1 text-xs font-medium text-blue-700">
                {formatPriceText(o.priceRange)}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => void remove(o.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <IncompleteFieldHighlight itemId="specializations">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">افزودن خدمت / پکیج</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>عنوان</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>قیمت / بازه</Label>
            <Input
              value={draft.priceRange}
              onChange={(e) => setDraft({ ...draft, priceRange: e.target.value })}
              placeholder="مثلاً از ۵۰ میلیون"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>توضیحات</Label>
            <Textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void add()} className="gap-1.5">
              <Plus className="size-4" />
              افزودن
            </Button>
          </div>
        </CardContent>
      </Card>
      </IncompleteFieldHighlight>
    </div>
  );
}
