'use client';

import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ListingPreview } from '@/contracts/need-intake';
import { formatMoneyToman } from '@/lib/format/money';
import { toPersianDigits } from '@/lib/format/digits';

interface IntakePreviewCardProps {
  preview: ListingPreview;
  onPublish: () => void;
  onEdit: () => void;
  isPublishing?: boolean;
  needsAuth?: boolean;
}

export function IntakePreviewCard({
  preview,
  onPublish,
  onEdit,
  isPublishing,
  needsAuth,
}: IntakePreviewCardProps) {
  return (
    <div className="mx-4 my-2 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h3 className="font-semibold">پیش‌نمایش آگهی</h3>
      </div>
      <p className="mb-1 text-sm font-medium">{preview.title || '—'}</p>
      <p className="mb-3 line-clamp-4 text-sm text-muted-foreground whitespace-pre-wrap">
        {preview.description}
      </p>
      {(preview.budgetMin ?? preview.budgetMax) ? (
        <p className="mb-3 text-xs text-muted-foreground">
          بودجه:{' '}
          {preview.budgetMax
            ? `${formatMoneyToman(preview.budgetMax)} تومان`
            : preview.budgetMin
              ? `از ${formatMoneyToman(preview.budgetMin)}`
              : null}
        </p>
      ) : null}
      {preview.extras?.length ? (
        <ul className="mb-3 list-inside list-disc text-xs text-muted-foreground">
          {preview.extras.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={onPublish}
          disabled={isPublishing}
        >
          {isPublishing ? (
            <>
              <Loader2 className="ms-1 size-3.5 animate-spin" />
              در حال انتشار…
            </>
          ) : (
            'انتشار آگهی'
          )}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          ادامه چت
        </Button>
      </div>
      {needsAuth ? (
        <p className="mt-2 text-xs text-amber-600">
          برای انتشار، با شماره موبایل وارد حساب کاربری شوید.
        </p>
      ) : null}
      {preview.titleSource ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          عنوان: {preview.titleSource === 'qwen' ? 'هوش مصنوعی' : 'الگو'}
          {preview.title.length
            ? ` · ${toPersianDigits(String(preview.title.length))} کاراکتر`
            : ''}
        </p>
      ) : null}
    </div>
  );
}
