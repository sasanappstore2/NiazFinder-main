'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { getBusinessCategoryTitle } from '@/lib/business/business-category';
import { BusinessProfileCategoryTabs } from '@/components/business-profile/BusinessProfileCategoryTabs';
import {
  getDisplayNamePlaceholder,
  isGenericBusinessName,
  suggestBusinessDisplayName,
} from '@/lib/business/suggest-display-name';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StepIdentityValues = {
  name: string;
  occupationSlugs: string[];
  primaryCategorySlug: string;
  description: string;
  city?: string;
};

export function StepIdentity({
  values,
  errors,
  personName,
  onChange,
}: {
  values: StepIdentityValues;
  errors: Partial<Record<keyof StepIdentityValues | 'occupationSlugs', string>>;
  /** Account display name — used for individual trades without a brand. */
  personName?: string | null;
  onChange: (patch: Partial<StepIdentityValues>) => void;
}) {
  const [nameTouched, setNameTouched] = useState(false);
  const lastAutoName = useRef<string | null>(null);

  const primarySlug = values.occupationSlugs[0] ?? values.primaryCategorySlug;

  const buildSuggestion = () =>
    primarySlug
      ? suggestBusinessDisplayName({
          primaryOccupationSlug: primarySlug,
          personName,
          city: values.city,
        })
      : '';

  const applySuggestion = () => {
    const suggested = buildSuggestion();
    if (!suggested) return;
    lastAutoName.current = suggested;
    onChange({ name: suggested });
  };

  const handleOccupationsChange = (slugs: string[]) => {
    const primary = slugs[0] ?? '';
    onChange({
      occupationSlugs: slugs,
      primaryCategorySlug: primary,
    });
  };

  // Auto-suggest when primary job is set and user has not typed a custom name
  useEffect(() => {
    if (!primarySlug) return;
    const suggested = buildSuggestion();
    if (!suggested) return;

    const shouldAutoFill =
      !nameTouched &&
      (isGenericBusinessName(values.name) ||
        values.name === lastAutoName.current ||
        !values.name.trim());

    if (shouldAutoFill) {
      lastAutoName.current = suggested;
      onChange({ name: suggested });
    }
     
  }, [primarySlug, personName, values.city]);

  const suggestedPreview = buildSuggestion();
  const showSuggestAction = Boolean(primarySlug && suggestedPreview);

  return (
    <div className="space-y-[21px]">
      <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground">
        تا ۳ مورد از زبانهٔ مشاغل یا فروشگاه اینترنتی انتخاب کنید (اولین = اصلی). اگر نام
        تجاری ندارید، نام خودتان یا پیشنهاد سیستم برای نمایش در پروفایل و جستجو کافی است.
      </div>

      <div className="space-y-2">
        <Label>شغل یا حوزهٔ فروشگاه اینترنتی *</Label>
        <BusinessProfileCategoryTabs
          selectedSlugs={values.occupationSlugs}
          onChange={handleOccupationsChange}
        />
        {(errors.occupationSlugs || errors.primaryCategorySlug) && (
          <p className="text-xs text-destructive">
            {errors.occupationSlugs ?? errors.primaryCategorySlug}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="biz-name">نام نمایشی در پروفایل *</Label>
        <p className="text-xs text-muted-foreground">
          همان عنوانی که مشتری در نتایج جستجو و صفحهٔ شما می‌بیند — نام شخص، نام مغازه، یا
          ترکیب شغل + شهر.
        </p>
        <Input
          id="biz-name"
          value={values.name}
          onChange={(e) => {
            setNameTouched(true);
            onChange({ name: e.target.value });
          }}
          placeholder={getDisplayNamePlaceholder(primarySlug)}
          className={cn('h-11', errors.name && 'border-destructive')}
        />
        {showSuggestAction && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-emerald-500/30 text-emerald-800 hover:bg-emerald-500/10 dark:text-emerald-300"
              onClick={applySuggestion}
            >
              <Sparkles className="size-3.5" />
              پیشنهاد برای سئو
            </Button>
            <span className="text-xs text-muted-foreground truncate" title={suggestedPreview}>
              {suggestedPreview}
            </span>
          </div>
        )}
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="biz-desc">معرفی کوتاه (اختیاری)</Label>
        <Textarea
          id="biz-desc"
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="چند جمله درباره خدمات شما — اگر خالی بماند، برای سئو یک متن کوتاه خودکار ساخته می‌شود."
          rows={3}
          maxLength={500}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-left" dir="ltr">
          {values.description.length}/500
        </p>
      </div>
    </div>
  );
}
