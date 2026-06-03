'use client';

import { MapPin } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { BusinessLocationPicker } from '@/components/business-profile/onboarding/BusinessLocationPicker';
import { PhoneField } from '@/components/business-profile/onboarding/PhoneField';

export type StepContactValues = {
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  province: string;
  address: string;
};

export function StepContact({
  values,
  errors,
  onChange,
}: {
  values: StepContactValues;
  errors: Partial<Record<keyof StepContactValues, string>>;
  onChange: (patch: Partial<StepContactValues>) => void;
}) {
  return (
    <div className="space-y-[21px]">
      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        شمارهٔ تماس برای مشتریان و پیام‌های سیستم نمایش داده می‌شود. می‌توانید همان شمارهٔ ورود
        خود را وارد کنید.
      </div>

      <PhoneField
        id="biz-phone"
        label="شماره موبایل"
        required
        value={values.phone}
        onChange={(phone) => onChange({ phone })}
        error={errors.phone}
      />

      <PhoneField
        id="biz-whatsapp"
        label="واتساپ (اختیاری)"
        value={values.whatsapp}
        onChange={(whatsapp) => onChange({ whatsapp })}
        error={errors.whatsapp}
      />

      <div className="space-y-2">
        <Label htmlFor="biz-email">ایمیل (اختیاری)</Label>
        <Input
          id="biz-email"
          dir="ltr"
          type="email"
          value={values.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="name@example.com"
          className={cn('h-11', errors.email && 'border-destructive')}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin className="size-4 text-emerald-600" />
        مکان (اختیاری)
      </div>

      <BusinessLocationPicker
        city={values.city}
        province={values.province}
        onChange={onChange}
      />

      <div className="space-y-2">
        <Label htmlFor="biz-address">آدرس</Label>
        <Textarea
          id="biz-address"
          value={values.address}
          onChange={(e) => onChange({ address: e.target.value })}
          rows={2}
          placeholder="خیابان، پلاک، محله..."
          className="resize-none"
        />
      </div>
    </div>
  );
}
