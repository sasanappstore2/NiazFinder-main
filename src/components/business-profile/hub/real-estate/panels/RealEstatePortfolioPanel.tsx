'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { useBusinessHub } from '../../BusinessHubContext';
import { useRealEstateHub } from '../RealEstateHubProvider';
import { IncompleteFieldHighlight } from '../IncompleteFieldHighlight';
import { HubMediaUpload } from '../shared/HubMediaUpload';

type PortfolioRow = {
  id: string;
  title: string;
  mediaUrl: string;
  type: string;
};

export function RealEstatePortfolioPanel() {
  const { refresh } = useBusinessHub();
  const { refreshAll } = useRealEstateHub();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PortfolioRow[]>([]);
  const [kind, setKind] = useState<'image' | 'before_after'>('image');
  const [form, setForm] = useState({
    title: '',
    mediaUrl: '',
    beforeUrl: '',
    afterUrl: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/me/portfolio', { headers: getClientAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as { items?: PortfolioRow[] };
        setItems(data.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!form.title.trim()) {
      toast.error('عنوان الزامی است');
      return;
    }
    if (kind === 'before_after') {
      if (!form.beforeUrl || !form.afterUrl) {
        toast.error('تصویر قبل و بعد الزامی است');
        return;
      }
    } else if (!form.mediaUrl) {
      toast.error('تصویر الزامی است');
      return;
    }

    const payload =
      kind === 'before_after'
        ? {
            title: form.title,
            type: 'before_after',
            mediaUrl: form.afterUrl,
            metadata: { beforeUrl: form.beforeUrl, afterUrl: form.afterUrl },
          }
        : { title: form.title, mediaUrl: form.mediaUrl };

    const res = await fetch('/api/business/me/portfolio', {
      method: 'POST',
      headers: getClientAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error('افزودن نمونه‌کار ناموفق بود');
      return;
    }
    toast.success('ذخیره شد');
    setForm({ title: '', mediaUrl: '', beforeUrl: '', afterUrl: '' });
    await load();
    void refresh();
    void refreshAll();
  };

  const remove = async (id: string) => {
    await fetch(`/api/business/me/portfolio/${id}`, {
      method: 'DELETE',
      headers: getClientAuthHeaders(),
    });
    await load();
    void refresh();
    void refreshAll();
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
        نمونه‌کارها در ویجت‌های «گالری»، «قبل و بعد» یا «نمونه‌کار معماری» صفحه عمومی نمایش داده
        می‌شوند.
      </p>

      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
          <div>
            <p className="font-medium">{item.title}</p>
            <p className="text-xs text-muted-foreground">
              {item.type === 'before_after' ? 'قبل / بعد' : 'تصویر'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void remove(item.id)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}

      <IncompleteFieldHighlight itemId="portfolio">
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">افزودن نمونه‌کار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === 'image' ? 'default' : 'outline'}
              onClick={() => setKind('image')}
            >
              تصویر / ویدیو
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === 'before_after' ? 'default' : 'outline'}
              onClick={() => setKind('before_after')}
            >
              قبل / بعد
            </Button>
          </div>
          <div className="space-y-1">
            <Label>عنوان پروژه</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          {kind === 'image' ? (
            <HubMediaUpload
              label="تصویر پروژه"
              value={form.mediaUrl}
              onChange={(url) => setForm({ ...form, mediaUrl: url })}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <HubMediaUpload
                label="قبل"
                value={form.beforeUrl}
                onChange={(url) => setForm({ ...form, beforeUrl: url })}
              />
              <HubMediaUpload
                label="بعد"
                value={form.afterUrl}
                onChange={(url) => setForm({ ...form, afterUrl: url })}
              />
            </div>
          )}
          <Separator />
          <Button type="button" onClick={() => void add()} className="gap-1.5">
            <Plus className="size-4" />
            افزودن
          </Button>
        </CardContent>
      </Card>
      </IncompleteFieldHighlight>
    </div>
  );
}
