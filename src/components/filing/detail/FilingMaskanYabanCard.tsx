import Link from 'next/link';
import {
  ArrowLeft,
  ArrowLeftRight,
  Building2,
  CalendarDays,
  Car,
  ChevronLeft,
  ClipboardList,
  DoorOpen,
  Flame,
  Home,
  ImageOff,
  MapPin,
  Package,
  Phone,
  Plus,
  Shirt,
  Sun,
  User,
} from 'lucide-react';
import { toPersianDigits } from '@/lib/format/digits';
import { routeBuilder } from '@/config/routes';
import { FILING_PUBLIC_BRAND } from '@/lib/filing/presentation/public-brand';
import type { FilingViewModel } from '@/lib/filing/filing-view-model';
import type { FilingDetailSections } from '@/lib/filing/filing-detail-sections';
import {
  buildFilingListCardModel,
  parseListingAreaSqm,
} from '@/components/workspace/filings/filing-list-card-present';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilingExpandableDescription } from './FilingExpandableDescription';
import { FilingAsideShareAction } from './FilingAsideShareAction';
import { FilingFileCodeBadge } from './FilingDetailToolbar';
import { FilingGalleryCarousel } from './FilingGalleryCarousel';
import { FilingQuickStats } from './FilingQuickStats';
import { resolveFilingGalleryImages } from '@/lib/filing/filing-demo-gallery';

const FEATURE_ICONS: Record<string, LucideIcon> = {
  آسانسور: Building2,
  پارکینگ: Car,
  انباری: Package,
  تراس: Sun,
  'کمد دیواری': Shirt,
  'درب ضدسرقت': DoorOpen,
  'قابل معاوضه': ArrowLeftRight,
  'گاز روکار': Flame,
};

function featureIcon(label: string): LucideIcon {
  return FEATURE_ICONS[label] ?? Package;
}

type CardProps = {
  filing: FilingViewModel;
  sections: FilingDetailSections;
  dateLabel: string | null;
};

export function FilingMaskanYabanCard({ filing, sections, dateLabel }: CardProps) {
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
    detailUrl: filing.detailUrl,
  };
  const model = buildFilingListCardModel(item);
  const areaSqm = parseListingAreaSqm(filing.area ?? undefined);
  const fileCode = filing.fileCode ?? filing.id.slice(-6);
  const galleryImages = resolveFilingGalleryImages(filing.images);
  const usingDemoGallery = filing.images.length === 0 && galleryImages.length > 0;
  const hasGallery = galleryImages.length > 0;
  const displaySpecs = sections.filledSpecs;

  return (
    <div className="box file clearfix">
        {hasGallery ? (
          <div className="filing-detail-gallery-wrap">
            {usingDemoGallery ? (
              <span className="filing-detail-gallery-demo" aria-hidden>
                تصاویر نمونه
              </span>
            ) : null}
            <FilingGalleryCarousel
              images={galleryImages}
              alt={filing.title}
              fileCode={fileCode}
              className="melk-gallery"
            />
          </div>
        ) : (
          <div className="filing-detail-media-empty" aria-hidden>
            <ImageOff className="size-8 opacity-25" />
            <span>بدون تصویر</span>
          </div>
        )}

        <header className="filing-detail-header">
          <div className="filing-detail-header__row top position-relative">
            <div className="top__media">
              <div className="size filing-detail-size" aria-label={model.dealKindLine}>
                <span className="small">{model.dealKindLine}</span>
                {areaSqm ? (
                  <>
                    <span className="large">{toPersianDigits(areaSqm)}</span>
                    <span className="small">متری</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="top__main filing-detail-header__main">
              <div className="top__meta filing-detail-meta">
                {dateLabel ? (
                  <span className="filing-detail-meta__item Box_Date">
                    <CalendarDays className="size-3.5 opacity-55" aria-hidden />
                    <time>{dateLabel}</time>
                  </span>
                ) : null}
                <FilingFileCodeBadge fileCode={fileCode} />
              </div>

              <h1 className="filing-detail-title filing-list-address">
                <MapPin className="filing-detail-title__pin" aria-hidden />
                <span>{filing.location ?? filing.title}</span>
              </h1>
            </div>
          </div>
        </header>

        {sections.priceRows.length > 0 ? (
          <section className="filing-detail-prices" aria-label="قیمت‌ها">
            {sections.priceRows.map((row, i) => (
              <div
                key={row.key}
                className={cn(
                  'filing-detail-prices__item',
                  i === 0 ? 'filing-detail-prices__item--primary' : 'filing-detail-prices__item--secondary'
                )}
              >
                <span className="filing-detail-prices__label">{row.label}</span>
                <div className="filing-detail-prices__value">
                  <span className="PriceKama">{row.value}</span>
                  <span className="filing-detail-prices__currency">تومان</span>
                </div>
                {row.hint ? <span className="filing-detail-prices__hint">{row.hint}</span> : null}
              </div>
            ))}
          </section>
        ) : null}

        <FilingQuickStats
          specs={sections.specs}
          quickStatKeys={sections.categoryTemplate.quickStatKeys}
        />

        <section className="filing-detail-specs" aria-labelledby="filing-specs-heading">
          <h2 id="filing-specs-heading" className="filing-section-heading">
            {sections.specsSectionTitle}
          </h2>

          {displaySpecs.length > 0 ? (
            <dl className="spec-grid-compact" id="filing-specs">
              {displaySpecs.map((spec) => (
                <div key={spec.key} className="spec-grid-compact__item">
                  <dt className="spec-label">{spec.label}</dt>
                  <dd>{spec.value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          {sections.amenities.length > 0 ? (
            <div className="filing-detail-amenities" id="filing-amenities" aria-label="امکانات">
              {sections.amenities.map((label) => {
                const Icon = featureIcon(label);
                return (
                  <span key={label} className="filing-detail-amenity">
                    <Icon className="size-4" strokeWidth={2} aria-hidden />
                    <span>{label}</span>
                  </span>
                );
              })}
            </div>
          ) : null}
        </section>

        {filing.description?.trim() ? (
          <section className="filing-detail-description" id="filing-desc" aria-labelledby="filing-desc-heading">
            <h2 id="filing-desc-heading" className="filing-section-heading">
              توضیحات
            </h2>
            <FilingExpandableDescription text={filing.description} />
          </section>
        ) : null}
      </div>
  );
}

export function FilingBrokerSidebar({
  filing,
  fileCode,
}: {
  filing: FilingViewModel;
  fileCode: string;
}) {
  const meta = filing.sourceMeta;
  const hasBroker = Boolean(meta.brokerOffice || meta.brokerPhone || meta.brokerAddress);
  const displayCode = toPersianDigits(fileCode);
  const regionTag = filing.city?.trim() ? `${filing.city.trim()} · فایلینگ منطقه` : 'فایلینگ منطقه';

  return (
    <aside className="filing-detail-aside" aria-label="اطلاعات کارگزاری و اقدامات">
      <div className="filing-aside-card">
        <header className="filing-aside-card__brand">
          <div className="filing-aside-card__brand-mark" aria-hidden>
            <Building2 className="size-4" strokeWidth={1.75} />
          </div>
          <div className="filing-aside-card__brand-text">
            <div className="filing-aside-card__brand-row">
              <span className="filing-aside-card__brand-name">{FILING_PUBLIC_BRAND}</span>
            </div>
            <span className="filing-aside-card__brand-tag">{regionTag}</span>
          </div>
          <span className="filing-aside-card__file-pill" title="کد فایل">
            <span className="filing-aside-card__file-pill-label">کد</span>
            <span dir="ltr">{displayCode}</span>
          </span>
        </header>

        <div className="filing-aside-card__broker">
          {hasBroker ? (
            <>
              <div className="broker-row">
                <span className="broker-avatar" aria-hidden>
                  <User className="size-4" strokeWidth={1.75} />
                </span>
                <div className="broker-row__text">
                  <p className="broker-eyebrow">کارگزاری</p>
                  {meta.brokerOffice ? (
                    <p className="broker-office">{meta.brokerOffice}</p>
                  ) : null}
                  {meta.brokerAddress ? (
                    <p className="broker-address">{meta.brokerAddress}</p>
                  ) : null}
                </div>
              </div>
              {meta.brokerPhone ? (
                <a href={`tel:${meta.brokerPhone}`} className="broker-phone broker-phone--hero">
                  <span className="broker-phone__icon" aria-hidden>
                    <Phone className="size-4" />
                  </span>
                  <span className="broker-phone__copy">
                    <span className="broker-phone__label">تماس با مشاور</span>
                    <span className="broker-phone__number" dir="ltr">
                      {toPersianDigits(meta.brokerPhone)}
                    </span>
                  </span>
                  <ChevronLeft className="broker-phone__chevron size-4" aria-hidden />
                </a>
              ) : null}
            </>
          ) : (
            <div className="broker-row broker-row--placeholder">
              <span className="broker-avatar broker-avatar--lg" aria-hidden>
                <User className="size-5" strokeWidth={1.5} />
              </span>
              <div className="broker-row__text">
                <p className="broker-eyebrow">مشاور املاک</p>
                <p className="broker-office">اطلاعات تماس</p>
                <p className="broker-address">
                  برای هماهنگی بازدید، درخواست ثبت کنید.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="filing-aside-card__cta">
          <Link href={routeBuilder.needNew()} className="filing-aside-need-cta">
            <Plus className="size-4 shrink-0" aria-hidden />
            <span>ثبت نیاز</span>
          </Link>
        </div>

        <div className="filing-aside-card__divider" aria-hidden>
          <span>اقدامات</span>
        </div>

        <nav className="filing-aside-card__actions" aria-label="اقدامات">
          <Link href={routeBuilder.needNew()} className="filing-aside-action filing-aside-action--primary">
            <span className="filing-aside-action__icon" aria-hidden>
              <Home className="size-4" />
            </span>
            <span className="filing-aside-action__body">
              <span className="filing-aside-action__title">ثبت ملک</span>
              <span className="filing-aside-action__hint">آگهی رایگان در نیازفایندر</span>
            </span>
            <ChevronLeft className="filing-aside-action__chevron size-4" aria-hidden />
          </Link>

          <Link href={routeBuilder.needNew()} className="filing-aside-action">
            <span className="filing-aside-action__icon" aria-hidden>
              <ClipboardList className="size-4" />
            </span>
            <span className="filing-aside-action__body">
              <span className="filing-aside-action__title">درخواست ملک</span>
              <span className="filing-aside-action__hint">نیاز خود را ثبت کنید</span>
            </span>
            <ChevronLeft className="filing-aside-action__chevron size-4" aria-hidden />
          </Link>

          <FilingAsideShareAction title={filing.title} fileCode={fileCode} />
        </nav>

        <footer className="filing-aside-card__footer">
          <Link href={routeBuilder.filingBrowse()} className="filing-aside-back">
            <ArrowLeft className="size-3.5 shrink-0" aria-hidden />
            <span>بازگشت به فایلینگ</span>
          </Link>
        </footer>
      </div>
    </aside>
  );
}
