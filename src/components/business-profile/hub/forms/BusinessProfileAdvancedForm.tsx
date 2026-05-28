'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Search, Sparkles } from 'lucide-react';
import { sanitizeBusinessProfileSlug } from '@/lib/business/profile-slug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { useBusinessHub } from '../BusinessHubContext';

export function BusinessProfileAdvancedForm({
  onSaved,
}: {
  onSaved?: (data: { slug: string; name: string }) => void;
}) {
  const { profile, patchProfile, refresh } = useBusinessHub();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    seoTitle: '',
    seoDescription: '',
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      slug: sanitizeBusinessProfileSlug(profile.slug) || profile.slug,
      seoTitle: profile.seoTitle,
      seoDescription: profile.seoDescription,
    });
  }, [profile]);

  if (!profile) return null;

  const suggested = profile.suggestedProfileSlug;

  const save = async () => {
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
        slug: data.slug ?? form.slug,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
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
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="hub-slug">نام کاربری صفحه شما</Label>
        <p className="text-xs text-muted-foreground">
          آدرس عمومی: فقط حروف کوچک انگلیسی، عدد، خط تیره و زیرخط
        </p>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-sm text-muted-foreground" dir="ltr">
            /b/
          </span>
          <Input
            id="hub-slug"
            dir="ltr"
            className="font-mono text-sm"
            value={form.slug}
            onChange={(e) =>
              setForm((f) => ({ ...f, slug: sanitizeBusinessProfileSlug(e.target.value) }))
            }
          />
        </div>
        {suggested && suggested !== form.slug && suggested.length >= 3 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setForm((f) => ({ ...f, slug: suggested }))}
          >
            <Sparkles className="size-3.5" />
            پیشنهاد از شبکه‌ها:
            <span dir="ltr" className="font-mono">
              {suggested}
            </span>
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Search className="size-3.5" />
          عنوان در گوگل (اختیاری)
        </Label>
        <Input value={form.seoTitle} onChange={(e) => setForm((f) => ({ ...f, seoTitle: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>توضیح در گوگل (اختیاری)</Label>
        <Textarea
          value={form.seoDescription}
          onChange={(e) => setForm((f) => ({ ...f, seoDescription: e.target.value }))}
          rows={2}
        />
      </div>

      <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void save()} disabled={saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        ذخیره تنظیمات پیشرفته
      </Button>
    </div>
  );
}
