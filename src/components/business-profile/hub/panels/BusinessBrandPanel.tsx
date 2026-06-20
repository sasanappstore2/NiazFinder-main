'use client';

import { useEffect, useState } from 'react';
import { Globe, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { normalizeWebPresence } from '@/lib/business/normalize-web-presence';
import { BusinessImageUpload } from '@/components/business-profile/onboarding/BusinessImageUpload';
import { SiteImportWizard } from '@/components/business-profile/site-import/SiteImportWizard';
import { useBusinessHub } from '../BusinessHubContext';

const CHANNELS = [
  { key: 'website' as const, label: 'وب‌سایت', placeholder: 'tizkharid.com' },
  { key: 'instagram' as const, label: 'اینستاگرام', placeholder: '@username' },
  { key: 'telegram' as const, label: 'تلگرام', placeholder: '@channel' },
  { key: 'bale' as const, label: 'بله', placeholder: 'ble.ir/...' },
  { key: 'rubika' as const, label: 'روبیکا', placeholder: 'rubika.ir/...' },
  { key: 'eitaa' as const, label: 'ایتا', placeholder: 'eitaa.com/...' },
];

export function BusinessBrandPanel() {
  const { profile, patchProfile, refresh, setActiveTask } = useBusinessHub();
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [links, setLinks] = useState({
    website: '',
    instagram: '',
    telegram: '',
    bale: '',
    rubika: '',
    eitaa: '',
  });

  useEffect(() => {
    if (!profile) return;
    setLogo(profile.logo);
    setCoverImage(profile.coverImage);
    setLinks({
      website: profile.website,
      instagram: profile.instagram,
      telegram: profile.telegram,
      bale: profile.bale,
      rubika: profile.rubika,
      eitaa: profile.eitaa,
    });
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    try {
      const normalized = normalizeWebPresence(links);
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(normalized)) {
        if (v) cleaned[k] = v;
      }

      const [profileRes, extRes] = await Promise.all([
        fetch('/api/business/me', {
          method: 'PATCH',
          headers: getClientAuthHeaders(),
          body: JSON.stringify({ logo: logo || null, coverImage: coverImage || null }),
        }),
        fetch('/api/business/me/extensions', {
          method: 'PATCH',
          headers: getClientAuthHeaders(),
          body: JSON.stringify({ extensions: { webPresence: cleaned } }),
        }),
      ]);

      if (!profileRes.ok) {
        const data = (await profileRes.json()) as { error?: string };
        toast.error(data.error ?? 'ذخیره تصاویر ناموفق بود');
        return;
      }
      if (!extRes.ok) {
        toast.error('ذخیره لینک‌ها ناموفق بود');
        return;
      }

      toast.success('ذخیره شد');
      patchProfile({
        logo,
        coverImage,
        ...normalized,
      });
      void refresh();
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        عکس پروفایل و کاور اختیاری است. لینک فروشگاه و شبکه‌های اجتماعی را وارد کنید.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <BusinessImageUpload
          label="عکس پروفایل (لوگو)"
          hint="مربعی — بعد از انتخاب، برش دلخواه"
          value={logo}
          kind="logo"
          aspectClass="aspect-square max-w-[140px]"
          onChange={setLogo}
        />
        <BusinessImageUpload
          label="تصویر کاور"
          hint="افقی ۲:۱ — تصویر تمیز؛ بدون اسکرین‌شات منو"
          value={coverImage}
          kind="cover"
          aspectClass="aspect-[21/9] w-full"
          onChange={setCoverImage}
        />
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Globe className="size-4 text-emerald-600" />
          <CardTitle className="text-base">لینک‌ها</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map(({ key, label, placeholder }) => (
            <div key={key} className={key === 'website' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}>
              <Label>{label}</Label>
              <Input
                dir="ltr"
                value={links[key]}
                onChange={(e) => setLinks((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <SiteImportWizard
              websiteUrl={links.website}
              occupationSlugs={profile.occupationSlugs}
              onApplied={() => {
                void refresh();
                setActiveTask('storefront');
              }}
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
