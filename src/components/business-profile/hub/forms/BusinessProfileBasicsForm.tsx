'use client';

import { useEffect, useState } from 'react';
import { Loader2, MapPin, Phone, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { useBusinessHub } from '../BusinessHubContext';

export function BusinessProfileBasicsForm({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { profile, patchProfile, refresh } = useBusinessHub();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    city: '',
    province: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    chatEnabled: true,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name,
      description: profile.description,
      city: profile.city,
      province: profile.province,
      address: profile.address,
      phone: profile.phone,
      whatsapp: profile.whatsapp,
      email: profile.email,
      chatEnabled: profile.chatEnabled,
    });
  }, [profile]);

  if (!profile) return null;

  const update = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('نام کسب‌وکار الزامی است');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/business/me', {
        method: 'PATCH',
        headers: getClientAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; slug?: string; name?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'ذخیره ناموفق بود');
        return;
      }
      toast.success('ذخیره شد');
      patchProfile({
        name: data.name ?? form.name,
        description: form.description,
        city: form.city,
        province: form.province,
        address: form.address,
        phone: form.phone,
        whatsapp: form.whatsapp,
        email: form.email,
        chatEnabled: form.chatEnabled,
      });
      if (data.slug && data.name) {
        onSaved?.({ slug: data.slug, name: data.name });
      }
      void refresh();
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">معرفی کسب‌وکار</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-1">
            <Label>نام کسب‌وکار</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>توضیحات</Label>
            <Textarea
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              rows={4}
              placeholder="به زبان ساده بنویسید مشتری چرا باید شما را انتخاب کند..."
            />
            <p className="text-xs text-muted-foreground">حداقل ۲۰ کاراکتر برای تکمیل پروفایل</p>
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
          <div className="space-y-1 sm:col-span-2">
            <Label>ایمیل (اختیاری)</Label>
            <Input dir="ltr" value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </div>
          <div className="flex items-center gap-4 rounded-xl border px-4 py-4 sm:col-span-2">
            <div className="min-w-0 flex-1 space-y-0.5">
              <Label htmlFor="hub-chat-enabled" className="cursor-pointer text-sm font-medium">
                پیام آنلاین در نیازفایندر
              </Label>
              <p className="text-xs text-muted-foreground">
                مشتریان می‌توانند از صفحه شما پیام بفرستند
              </p>
            </div>
            <Switch
              id="hub-chat-enabled"
              className="shrink-0"
              checked={form.chatEnabled}
              onCheckedChange={(checked) => update({ chatEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={saving} className="min-h-11 gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          ذخیره
        </Button>
      </div>
    </div>
  );
}
