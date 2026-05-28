'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, MapPin, Phone, Save, Search, Sparkles } from 'lucide-react';
import { sanitizeBusinessProfileSlug } from '@/lib/business/profile-slug';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type IdentityForm = {
  name: string;
  slug: string;
  description: string;
  logo: string;
  coverImage: string;
  city: string;
  province: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  chatEnabled: boolean;
  seoTitle: string;
  seoDescription: string;
};

const EMPTY: IdentityForm = {
  name: '',
  slug: '',
  description: '',
  logo: '',
  coverImage: '',
  city: '',
  province: '',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  chatEnabled: true,
  seoTitle: '',
  seoDescription: '',
};

export function BusinessIdentityEditor({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  const [form, setForm] = useState<IdentityForm>(EMPTY);
  const [suggestedProfileSlug, setSuggestedProfileSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/me', { headers: getAuthHeaders() });
      if (!res.ok) {
        toast.error('بارگذاری اطلاعات کسب‌وکار ناموفق بود');
        return;
      }
      const data = (await res.json()) as IdentityForm & {
        suggestedProfileSlug?: string | null;
      };
      setSuggestedProfileSlug(data.suggestedProfileSlug ?? null);
      setForm({
        name: data.name ?? '',
        slug: sanitizeBusinessProfileSlug(data.slug ?? '') || (data.slug ?? ''),
        description: data.description ?? '',
        logo: data.logo ?? '',
        coverImage: data.coverImage ?? '',
        city: data.city ?? '',
        province: data.province ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        whatsapp: data.whatsapp ?? '',
        email: data.email ?? '',
        chatEnabled: data.chatEnabled ?? true,
        seoTitle: data.seoTitle ?? '',
        seoDescription: data.seoDescription ?? '',
      });
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (patch: Partial<IdentityForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('نام کسب‌وکار الزامی است');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/business/me', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; slug?: string; name?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'ذخیره ناموفق بود');
        return;
      }
      toast.success('اطلاعات کسب‌وکار ذخیره شد');
      if (data.slug && data.name) {
        onSaved?.({ slug: data.slug, name: data.name });
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          در حال بارگذاری اطلاعات پایه...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Building2 className="size-4 text-emerald-600" />
          <CardTitle className="text-base">هویت و معرفی</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>نام کسب‌وکار</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="biz-username">نام کاربری پروفایل</Label>
            <p className="text-xs text-muted-foreground">
              آدرس عمومی شما: فقط حروف کوچک انگلیسی، عدد، خط تیره و زیرخط (۳ تا ۴۰ کاراکتر).
              مثال: <span dir="ltr" className="font-mono">fnjekwnkv</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0" dir="ltr">
                /b/
              </span>
              <Input
                id="biz-username"
                dir="ltr"
                className="font-mono text-sm"
                value={form.slug}
                onChange={(e) => update({ slug: sanitizeBusinessProfileSlug(e.target.value) })}
                placeholder="myshop"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {suggestedProfileSlug &&
              suggestedProfileSlug !== form.slug &&
              suggestedProfileSlug.length >= 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  onClick={() => update({ slug: suggestedProfileSlug })}
                >
                  <Sparkles className="size-3.5" />
                  پیشنهاد از شبکه‌های اجتماعی:
                  <span dir="ltr" className="font-mono">
                    {suggestedProfileSlug}
                  </span>
                </Button>
              )}
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>توضیحات</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              placeholder="معرفی کوتاه کسب‌وکار برای بازدیدکنندگان..."
            />
          </div>
          <div className="space-y-1">
            <Label>لوگو (URL)</Label>
            <Input dir="ltr" value={form.logo} onChange={(e) => update({ logo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>تصویر کاور (URL)</Label>
            <Input
              dir="ltr"
              value={form.coverImage}
              onChange={(e) => update({ coverImage: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <MapPin className="size-4 text-emerald-600" />
          <CardTitle className="text-base">موقعیت</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>شهر</Label>
            <Input value={form.city} onChange={(e) => update({ city: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>استان</Label>
            <Input value={form.province} onChange={(e) => update({ province: e.target.value })} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>آدرس</Label>
            <Textarea
              value={form.address}
              onChange={(e) => update({ address: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Phone className="size-4 text-emerald-600" />
          <CardTitle className="text-base">تماس</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>تلفن</Label>
            <Input dir="ltr" value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>واتساپ</Label>
            <Input
              dir="ltr"
              value={form.whatsapp}
              onChange={(e) => update({ whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>ایمیل</Label>
            <Input dir="ltr" value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-xl border px-4 py-3">
            <Label htmlFor="chat-enabled" className="cursor-pointer">
              چت آنلاین فعال
            </Label>
            <Switch
              id="chat-enabled"
              checked={form.chatEnabled}
              onCheckedChange={(checked) => update({ chatEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Search className="size-4 text-emerald-600" />
          <CardTitle className="text-base">سئو</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1">
            <Label>عنوان سئو</Label>
            <Input value={form.seoTitle} onChange={(e) => update({ seoTitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>توضیحات سئو</Label>
            <Textarea
              value={form.seoDescription}
              onChange={(e) => update({ seoDescription: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره اطلاعات پایه
        </Button>
      </div>
    </div>
  );
}
