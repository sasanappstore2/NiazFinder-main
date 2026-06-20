'use client';

import { useState } from 'react';
import { MapPin, Sparkles, Loader2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import type { ListingPreview } from '@/contracts/need-intake';
import { formatMoneyToman } from '@/lib/format/money';
import { cn } from '@/lib/utils';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import {
  rejectListingTitleReason,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';
import { toPersianDigits } from '@/lib/format/digits';
import { intakePrimaryCta } from './intake-ui-tokens';

export interface NeedListingPreviewProps {
  preview: ListingPreview;
  onChange: (preview: ListingPreview) => void;
  onRepolish: () => void;
  onPublish: () => void;
  isLoading?: boolean;
  isRepublishing?: boolean;
  isTitleEnriching?: boolean;
  isDescEnriching?: boolean;
  publishDisabled?: boolean;
  categoryLabel?: string;
  cityLabel?: string;
  nested?: boolean;
}

export function NeedListingPreview({
  preview,
  onChange,
  onRepolish,
  onPublish,
  isLoading,
  isRepublishing,
  isTitleEnriching,
  isDescEnriching,
  publishDisabled = false,
  categoryLabel,
  cityLabel,
  nested = false,
}: NeedListingPreviewProps) {
  const [extraLine, setExtraLine] = useState('');

  const addExtra = () => {
    const line = extraLine.trim();
    if (!line) return;
    const extras = [...(preview.extras ?? []), line];
    onChange({ ...preview, extras });
    setExtraLine('');
  };

  const removeExtra = (index: number) => {
    const extras = (preview.extras ?? []).filter((_, i) => i !== index);
    onChange({ ...preview, extras: extras.length ? extras : undefined });
  };

  const titleLen = preview.title.length;
  const titlePending = isTitleEnriching && !preview.title.trim();
  const titleRejectReason = preview.title.trim()
    ? rejectListingTitleReason(preview.title)
    : null;

  return (
    <div
      className={cn(
        'intake-form-card intake-form-card--composer',
        nested && 'intake-form-card--nested'
      )}
    >
      {nested ? (
        <h2 className="intake-form-card__title">پیش‌نمایش</h2>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">پیش‌نمایش آگهی</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {titlePending
              ? 'در حال نوشتن عنوان آگهی بر اساس تمام اطلاعات شما…'
              : isTitleEnriching || isDescEnriching
                ? 'عنوان و توضیحات در حال بهینه‌سازی هستند؛ می‌توانید همین‌جا ویرایش کنید.'
                : 'این شکلی در لیست نیازها نمایش داده می‌شود.'}
          </p>
        </>
      )}

      <div className="intake-listing-preview-card">
        <div className="intake-listing-preview-card__media" aria-hidden>
          پیش‌نمایش تصویر
        </div>
        <div className="intake-listing-preview-card__body">
          {(categoryLabel || cityLabel) && (
            <div className="flex flex-wrap gap-1.5">
              {categoryLabel ? (
                <Badge variant="secondary" className="gap-1 text-xs font-normal">
                  <Tag className="size-3" />
                  {categoryLabel}
                </Badge>
              ) : null}
              {cityLabel ? (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <MapPin className="size-3" />
                  {cityLabel}
                </Badge>
              ) : null}
            </div>
          )}
          <p className="text-base font-semibold leading-snug">
            {preview.title.trim() || (titlePending ? '…' : 'عنوان آگهی')}
          </p>
          <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {preview.description.trim() || 'توضیحات آگهی'}
          </p>
          {(preview.budgetMax || preview.budgetMin) && (
            <p className="text-sm font-medium text-foreground">
              بودجه:{' '}
              {preview.budgetMax
                ? formatMoneyToman(preview.budgetMax)
                : preview.budgetMin
                  ? formatMoneyToman(preview.budgetMin)
                  : '—'}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="preview-title" className="flex items-center gap-2">
            عنوان آگهی
            {isTitleEnriching ? (
              <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            ) : null}
          </Label>
          <span
            className={`text-xs tabular-nums ${titleLen > LISTING_TITLE_MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {toPersianDigits(String(titleLen))}/{toPersianDigits(String(LISTING_TITLE_MAX_LENGTH))}
          </span>
        </div>
        <Input
          id="preview-title"
          name="previewTitle"
          value={preview.title}
          maxLength={LISTING_TITLE_MAX_LENGTH}
          placeholder={titlePending ? 'در حال نوشتن عنوان…' : 'عنوان آگهی'}
          disabled={titlePending}
          onChange={(e) =>
            onChange({
              ...preview,
              title: truncateListingTitle(e.target.value),
            })
          }
          className={cn(
            'text-base',
            !preview.title.trim() && !titlePending && 'border-amber-500/60 bg-amber-500/5'
          )}
        />
        {!preview.title.trim() && !titlePending ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            عنوان خالی است — قبل از انتشار حتماً بررسی یا ویرایش کنید.
          </p>
        ) : null}
        {titleRejectReason && !titlePending ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            عنوان کلی به نظر می‌رسد؛ «بازنویسی خودکار» را بزنید یا دستی دقیق‌تر کنید.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="preview-desc" className="flex items-center gap-2">
          توضیحات
          {isDescEnriching ? (
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
          ) : null}
        </Label>
        <Textarea
          id="preview-desc"
          name="previewDescription"
          value={preview.description}
          onChange={(e) => onChange({ ...preview, description: e.target.value })}
          className={cn(
            'min-h-[140px] leading-relaxed',
            !preview.description.trim() && 'border-amber-500/60 bg-amber-500/5'
          )}
        />
        {!preview.description.trim() ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            توضیحات خالی است — جزئیات نیاز را قبل از انتشار تکمیل کنید.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="preview-extra">گزینه‌های اضافه (اختیاری)</Label>
        <div className="flex gap-2">
          <Input
            id="preview-extra"
            name="previewExtra"
            value={extraLine}
            onChange={(e) => setExtraLine(e.target.value)}
            placeholder="مثلاً: مصالح با کارفرما"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addExtra();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addExtra}>
            افزودن
          </Button>
        </div>
        {(preview.extras ?? []).length > 0 && (
          <ul className="space-y-1 text-sm">
            {(preview.extras ?? []).map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1"
              >
                <span>{item}</span>
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => removeExtra(i)}
                >
                  حذف
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="intake-sticky-actions intake-actions flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={onRepolish}
          disabled={isRepublishing || isLoading}
        >
          {isRepublishing ? (
            <Loader2 className="size-4 ml-2 animate-spin" />
          ) : (
            <Sparkles className="size-4 ml-2" />
          )}
          بازنویسی خودکار
        </Button>
        <Button
          type="button"
          className={cn('flex-1 h-12', intakePrimaryCta)}
          onClick={onPublish}
          disabled={
            isLoading ||
            isRepublishing ||
            isTitleEnriching ||
            isDescEnriching ||
            !preview.title.trim() ||
            publishDisabled
          }
        >
          {isLoading ? <Loader2 className="size-4 ml-2 animate-spin" /> : null}
          تأیید و ثبت نیاز
        </Button>
      </div>
    </div>
  );
}
