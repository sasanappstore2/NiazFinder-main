'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BedDouble,
  Building2,
  CalendarDays,
  Clock3,
  Compass,
  FileText,
  Layers,
  MapPin,
  Ruler,
  Store,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';
import type { WorkspaceFileItem } from '../types';
import {
  buildFilingListCardModel,
  type FilingSpecItem,
} from './filing-list-card-present';

function SpecFeature({ spec }: { spec: FilingSpecItem }) {
  const icon: ReactNode = (() => {
    switch (spec.icon) {
      case 'area':
        return <Building2 className="size-4" aria-hidden />;
      case 'rooms':
        return <BedDouble className="size-4" aria-hidden />;
      case 'age':
        return <Clock3 className="size-4" aria-hidden />;
      case 'document':
        return <FileText className="size-4" aria-hidden />;
      case 'landUse':
        return <MapPin className="size-4" aria-hidden />;
      case 'frontage':
      case 'plotWidth':
        return <Ruler className="size-4" aria-hidden />;
      case 'orientation':
        return <Compass className="size-4" aria-hidden />;
      case 'commercialUse':
        return <Store className="size-4" aria-hidden />;
      case 'facade':
        return <Building2 className="size-4" aria-hidden />;
      case 'floor':
      default:
        return <Layers className="size-4" aria-hidden />;
    }
  })();

  return (
    <div className="item">
      {icon}
      <span>{spec.label}</span>
    </div>
  );
}

function pricePerMeterDisplay(raw: string): { value: string; showCurrency: boolean } {
  const cleaned = raw.replace(/\s*\/\s*متر\s*$/u, '').trim();
  const showCurrency = !cleaned.includes('تومان');
  return { value: cleaned, showCurrency };
}

export function PropertyFilingListCard({ item }: { item: WorkspaceFileItem }) {
  const model = buildFilingListCardModel(item);
  const detailUrl = item.detailUrl?.trim() || null;
  const cover = item.listing.image ?? item.listing.images?.[0] ?? null;
  const hasCover = Boolean(cover);
  const specs = model.specs;
  const ppm = model.pricePerMeterLabel
    ? pricePerMeterDisplay(model.pricePerMeterLabel)
    : null;

  const priceItems = [
    ...model.priceRows.map((row) => ({
      key: row.key,
      label: row.label,
      value: row.value,
      hint: row.hint,
      compact: false,
      showCurrency: !row.value.includes('تومان'),
    })),
    ...(ppm
      ? [
          {
            key: 'ppm',
            label: 'متری',
            value: ppm.value,
            hint: null as string | null,
            compact: true,
            showCurrency: ppm.showCurrency,
          },
        ]
      : []),
  ];

  const ariaLabel = [model.title, model.locationLine, model.priceRows[0]?.value]
    .filter(Boolean)
    .join(' — ');

  const inner = (
    <article
      className={cn(
        'filing-list-card',
        'box',
        'box-list',
        'file',
        'clearfix',
        hasCover && 'has-cover'
      )}
      aria-label={ariaLabel}
    >
      <div className="top position-relative">
        <div className="top__media">
          {hasCover ? (
            <div className="ImageFream">
              <Image src={cover!} alt="" fill className="object-cover" sizes="163px" />
            </div>
          ) : null}
          <div className={cn('size', hasCover && 'sizeWithImg')}>
            <span className="small">{model.dealKindLine}</span>
            {model.areaSqm ? (
              <span className="large">{toPersianDigits(model.areaSqm)}</span>
            ) : null}
            <span className="small">متری</span>
          </div>
        </div>

        <div className="top__main">
          <div className="top__meta">
            {model.dateLabel ? (
              <div className={cn('Box_Date', hasCover && 'BoxDateWithImg')}>
                <CalendarDays className="size-3.5 shrink-0 opacity-60" aria-hidden />
                <time>{model.dateLabel}</time>
              </div>
            ) : null}
            <span className="file-code">
              کد فایل:<span>{model.fileCode}</span>
            </span>
          </div>

          <h2 className={cn('filing-list-address', hasCover && 'AddressWithImg')}>
            {model.locationLine ?? model.title}
          </h2>
        </div>
      </div>

      {priceItems.length > 0 ? (
        <div
          className={cn(
            'pricing',
            hasCover && 'pricingWithImg',
            priceItems.length > 1 && 'pricing--multi'
          )}
        >
          {priceItems.map((row) => (
            <div key={row.key} className="item">
              <div className="price">
                <span className={cn('title', row.compact && 'small')}>{row.label}:</span>
                <span className={cn('PriceKama', row.compact && 'small')}>{row.value}</span>
                {row.showCurrency ? <span className="currency">تومان</span> : null}
              </div>
              {row.hint ? <div className="price-text">{row.hint}</div> : null}
            </div>
          ))}
        </div>
      ) : null}

      {specs.length > 0 ? (
        <div className={cn('features', hasCover && 'features--with-img')}>
          {specs.map((spec) => (
            <SpecFeature key={spec.key} spec={spec} />
          ))}
        </div>
      ) : null}
    </article>
  );

  if (!detailUrl) return inner;

  return (
    <Link href={detailUrl} className="filing-list-card__link" aria-label={`مشاهده ${model.title}`}>
      {inner}
    </Link>
  );
}

/** @deprecated Use PropertyFilingListCard */
export const PropertyFilingGridCard = PropertyFilingListCard;
