'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ListingPreview } from '@/contracts/need-intake';
import { formatMoneyToman } from '@/lib/format/money';

export interface NeedListingPreviewProps {
  preview: ListingPreview;
  onChange: (preview: ListingPreview) => void;
  onRepolish: () => void;
  onPublish: () => void;
  isLoading?: boolean;
  isRepublishing?: boolean;
}

export function NeedListingPreview({
  preview,
  onChange,
  onRepolish,
  onPublish,
  isLoading,
  isRepublishing,
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

  return (
    <div className="space-y-5 rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">پیش‌نمایش آگهی</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        عنوان و متن را بررسی کنید. می‌توانید ویرایش دستی کنید یا با بازنویسی خودکار
        به‌روزرسانی شود.
      </p>

      <div className="space-y-2">
        <Label htmlFor="preview-title">عنوان آگهی</Label>
        <Input
          id="preview-title"
          value={preview.title}
          onChange={(e) => onChange({ ...preview, title: e.target.value })}
          className="text-base"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preview-desc">توضیحات</Label>
        <Textarea
          id="preview-desc"
          value={preview.description}
          onChange={(e) => onChange({ ...preview, description: e.target.value })}
          className="min-h-[140px] leading-relaxed"
        />
      </div>

      {(preview.budgetMax || preview.budgetMin) && (
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
          بودجه تقریبی:{' '}
          <span className="font-medium text-foreground">
            {preview.budgetMax
              ? formatMoneyToman(preview.budgetMax)
              : preview.budgetMin
                ? formatMoneyToman(preview.budgetMin)
                : '—'}
          </span>
        </div>
      )}

      <div className="space-y-2">
        <Label>گزینه‌های اضافه (اختیاری)</Label>
        <div className="flex gap-2">
          <Input
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

      <div className="flex flex-col gap-2 sm:flex-row">
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
          className="flex-1 h-12"
          onClick={onPublish}
          disabled={isLoading || isRepublishing || !preview.title.trim()}
        >
          {isLoading ? (
            <Loader2 className="size-4 ml-2 animate-spin" />
          ) : null}
          تأیید و ثبت نیاز
        </Button>
      </div>
    </div>
  );
}
