'use client';

import { Globe } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BusinessImageUpload } from '@/components/business-profile/onboarding/BusinessImageUpload';

export type StepBrandValues = {
  logo: string;
  coverImage: string;
  website: string;
  instagram: string;
  telegram: string;
  bale: string;
  rubika: string;
  eitaa: string;
};

const CHANNELS: {
  key: keyof Pick<
    StepBrandValues,
    'website' | 'instagram' | 'telegram' | 'bale' | 'rubika' | 'eitaa'
  >;
  label: string;
  placeholder: string;
}[] = [
  { key: 'website', label: 'وب‌سایت فروشگاه', placeholder: 'tizkharid.com' },
  { key: 'instagram', label: 'اینستاگرام', placeholder: '@username یا instagram.com/...' },
  { key: 'telegram', label: 'تلگرام', placeholder: '@channel یا t.me/...' },
  { key: 'bale', label: 'بله', placeholder: 'ble.ir/...' },
  { key: 'rubika', label: 'روبیکا', placeholder: 'rubika.ir/...' },
  { key: 'eitaa', label: 'ایتا', placeholder: 'eitaa.com/...' },
];

export function StepBrand({
  values,
  errors,
  onChange,
}: {
  values: StepBrandValues;
  errors: Partial<Record<keyof StepBrandValues, string>>;
  onChange: (patch: Partial<StepBrandValues>) => void;
}) {
  return (
    <div className="space-y-[21px]">
      <p className="text-sm text-muted-foreground">
        عکس پروفایل و کاور اختیاری است. آدرس فروشگاه و شبکه‌های اجتماعی را وارد کنید — سیستم
        لینک را یکدست می‌کند (مثلاً tizkharid.com به https://tizkharid.com).
      </p>

      <BusinessImageUpload
        label="عکس پروفایل (لوگو)"
        hint="مربع — حداکثر ۴ مگابایت"
        value={values.logo}
        kind="logo"
        aspectClass="aspect-square max-w-[140px] mx-auto sm:mx-0"
        onChange={(url) => onChange({ logo: url })}
        error={errors.logo}
      />

      <BusinessImageUpload
        label="تصویر کاور"
        hint="افقی — حداکثر ۶ مگابایت"
        value={values.coverImage}
        kind="cover"
        aspectClass="aspect-[1.618/1] w-full"
        onChange={(url) => onChange({ coverImage: url })}
        error={errors.coverImage}
      />

      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Globe className="size-4 text-emerald-600" />
          لینک فروشگاه و شبکه‌های اجتماعی
        </div>
        <p className="text-xs text-muted-foreground">
          همه فیلدها اختیاری‌اند. می‌توانید فقط همان کانالی که مشتریان از آن خرید می‌کنند را پر
          کنید.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map(({ key, label, placeholder }) => (
            <div key={key} className={cn('space-y-1.5', key === 'website' && 'sm:col-span-2')}>
              <Label htmlFor={`biz-${key}`}>{label}</Label>
              <Input
                id={`biz-${key}`}
                dir="ltr"
                value={values[key]}
                onChange={(e) => onChange({ [key]: e.target.value })}
                placeholder={placeholder}
                className={cn('h-10', errors[key] && 'border-destructive')}
              />
              {errors[key] && <p className="text-xs text-destructive">{errors[key]}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
