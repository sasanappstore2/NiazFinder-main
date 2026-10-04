'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Building2 } from 'lucide-react';
import { toPersianDigits } from '@/lib/format/digits';
import { formatPriceText } from '@/lib/format/money';
import { cn } from '@/lib/utils';
import type { FilingViewModel } from '@/lib/filing/filing-view-model';
import type { FilingDetailSections } from '@/lib/filing/filing-detail-sections';
import {
  FILING_HIGHLIGHT_CLASS,
  FILING_PRICE_ACCENT_CLASS,
  buildFilingListCardModel,
} from '@/components/workspace/filings/filing-list-card-present';
import type { WorkspaceFileItem } from '@/components/workspace/types';

export function FilingCompletenessBar({ percent }: { percent: number }) {
  return (
    <div className="filing-box filing-box-pad border-amber-500/30 bg-amber-500/5">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="font-medium text-amber-800 dark:text-amber-300">
          در حال تکمیل اطلاعات آگهی
        </span>
        <span className="tabular-nums text-muted-foreground">{toPersianDigits(percent)}٪</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-amber-500 transition-all"
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
    </div>
  );
}

export function FilingSourceBadge(_props: { filing: FilingViewModel }) {
  return null;
}

export function FilingImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  if (!images.length) {
    return (
      <div className="filing-box filing-gallery-main flex items-center justify-center bg-muted/40">
        <Building2 className="size-12 text-muted-foreground/40" />
      </div>
    );
  }

  const main = images[active] ?? images[0]!;

  return (
    <div className="space-y-2">
      <div className="filing-box relative overflow-hidden filing-gallery-main">
        <Image
          src={main}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 61vw"
          priority
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'filing-gallery-thumb relative overflow-hidden rounded-lg border-2',
                i === active ? 'border-primary' : 'border-transparent'
              )}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FilingHeroCard({
  filing,
  dateLabel,
}: {
  filing: FilingViewModel;
  dateLabel: string | null;
}) {
  const item: WorkspaceFileItem = {
    kind: 'file',
    id: filing.id,
    listing: {
      id: filing.id,
      title: filing.title,
      dealType: filing.dealType ?? undefined,
      propertyType: filing.propertyKind ?? undefined,
      area: filing.area ?? undefined,
    },
    dealLabel: filing.dealLabel ?? '',
    categoryLabel: filing.categoryLabel,
    priceDisplay: filing.priceDisplay,
    colorLabel: filing.kindLabel ?? '',
    createdAt: filing.postedAt ?? filing.createdAt,
    sourceProvider: filing.sourceLabel,
    detailUrl: filing.detailPath,
  };
  const model = buildFilingListCardModel(item);
  const highlightClass = FILING_HIGHLIGHT_CLASS[model.dealTone];

  return (
    <div className="filing-box filing-box-pad">
      <div className="flex flex-wrap items-start gap-4">
        <div className={cn('filing-hero-highlight', highlightClass)}>
          <p className="text-xs font-bold leading-snug">{model.dealKindLine}</p>
          {model.areaSqm ? (
            <>
              <p className="mt-1 text-4xl font-bold tabular-nums leading-none">
                {toPersianDigits(model.areaSqm)}
              </p>
              <p className="text-xs font-semibold opacity-90">متری</p>
            </>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {dateLabel ? <p className="text-xs text-muted-foreground">{dateLabel}</p> : null}
          {filing.location ? (
            <p className="text-sm font-medium text-foreground">{filing.location}</p>
          ) : null}
          {(filing.neighborhood || filing.city) && (
            <p className="text-xs text-muted-foreground">
              {[filing.neighborhood, filing.city].filter(Boolean).join(' · ')}
            </p>
          )}
          <span className="inline-block rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white">
            کد فایل: {toPersianDigits(filing.fileCode ?? filing.id.slice(-6))}
          </span>
          <h1 className="text-lg font-bold leading-snug sm:text-xl">{filing.title}</h1>
          <FilingSourceBadge filing={filing} />
        </div>
      </div>
    </div>
  );
}

export function FilingPricePanel({
  sections,
  dealTone,
}: {
  sections: FilingDetailSections;
  dealTone: keyof typeof FILING_PRICE_ACCENT_CLASS;
}) {
  const accent = FILING_PRICE_ACCENT_CLASS[dealTone];
  if (!sections.priceRows.length) return null;

  return (
    <div
      className={cn(
        'filing-box filing-box-pad filing-price-grid',
        sections.priceRows.length > 1 && 'filing-price-grid--multi'
      )}
    >
      {sections.priceRows.map((row) => (
        <div key={row.key} className="filing-price-item">
          <p className="text-xs text-muted-foreground">{row.label}</p>
          <p className={cn('mt-1 text-lg font-bold tabular-nums sm:text-xl', accent)}>
            {row.value}
          </p>
          {row.hint ? (
            <p className="mt-1 text-[11px] text-muted-foreground">{row.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function FilingSpecGrid({ specs }: { specs: FilingDetailSections['specs'] }) {
  return (
    <section className="filing-box filing-box-pad">
      <h2 className="mb-3 text-base font-semibold">مشخصات ملک</h2>
      <ul>
        {specs.map((row) => (
          <li key={row.key} className="filing-spec-row">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-medium text-foreground">{row.value ?? '—'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FilingAmenityStrip({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <section className="filing-box filing-box-pad">
      <h2 className="mb-3 text-base font-semibold">امکانات</h2>
      <div className="flex flex-wrap gap-2">
        {labels.map((label) => (
          <span
            key={label}
            className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary"
          >
            {label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function FilingDescriptionBlock({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="filing-box filing-box-pad">
      <h2 className="mb-2 text-base font-semibold">توضیحات ملک</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{text}</p>
    </section>
  );
}

export function FilingPricePerMeter({ value }: { value: string | null }) {
  if (!value?.trim()) return null;
  const formatted = formatPriceText(value) ?? value;
  return (
    <p className="text-sm text-muted-foreground">
      هر متر: <span className="font-medium text-foreground">{formatted}</span>
    </p>
  );
}
