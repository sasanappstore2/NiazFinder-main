'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, Clock } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BusinessOffer, StorefrontCategory } from '@/contracts/business-profile';
import { routeBuilder } from '@/config/routes';
import { groupOffersByVitrineCategory } from '@/lib/business/storefront';
import { offerMatchesCategoryFilter } from '@/lib/business/offer-storefront-meta';
import type { SectionProps } from './types';
import { CTA_LABEL } from './types';

const PREVIEW_PER_CATEGORY = 8;

const PRODUCT_GRID_CLASS =
  'grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3';

function ServiceCard({
  offer,
  onAction,
}: {
  offer: BusinessOffer;
  onAction: () => void;
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {offer.images[0] && (
        <div className="relative aspect-16/10 bg-muted">
          <Image src={offer.images[0]} alt="" fill className="object-cover" />
        </div>
      )}
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{offer.title}</CardTitle>
        {offer.priceRange && <p className="text-sm font-semibold text-primary">{offer.priceRange}</p>}
        {offer.duration && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {offer.duration}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3 pt-0">
        <p className="line-clamp-3 text-sm text-muted-foreground">{offer.description}</p>
        {offer.features.length > 0 && (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {offer.features.slice(0, 5).map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        )}
        {offer.faq && offer.faq.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            {offer.faq.slice(0, 3).map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="py-2 text-xs">{item.q}</AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        <Button className="mt-auto w-full" size="sm" onClick={onAction}>
          {CTA_LABEL[offer.ctaType]}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProductTile({
  offer,
  profileSlug,
}: {
  offer: BusinessOffer;
  profileSlug: string;
}) {
  const href = routeBuilder.businessProduct(profileSlug, offer.id);
  const image =
    offer.variants?.find((v) => v.imageUrl)?.imageUrl ?? offer.images[0];
  const price =
    offer.priceRange ??
    offer.variants?.find((v) => v.price)?.price;

  return (
    <Link
      href={href}
      className="profile-surface group flex flex-col overflow-hidden rounded-2xl text-right shadow-sm transition hover:border-emerald-500/35 hover:shadow-md hover:shadow-emerald-500/5"
    >
      <div className="relative aspect-[4/5] bg-muted">
        {image ? (
          <Image
            src={image}
            alt={offer.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
            بدون تصویر
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <p className="line-clamp-2 text-base font-medium leading-snug">{offer.title}</p>
        {price && (
          <p className="text-base font-bold text-emerald-700 dark:text-emerald-400">{price}</p>
        )}
        {offer.variants && offer.variants.length > 1 && (
          <p className="text-xs text-muted-foreground">
            {offer.variants.length.toLocaleString('fa-IR')} گزینه
          </p>
        )}
      </div>
    </Link>
  );
}

function CategoryRowHeader({
  title,
  profileSlug,
  categoryId,
  totalCount,
  showViewAll,
}: {
  title: string;
  profileSlug: string;
  categoryId: string | null;
  totalCount: number;
  showViewAll: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/60 pb-2">
      <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">{title}</h3>
      {showViewAll && categoryId && totalCount > PREVIEW_PER_CATEGORY && (
        <Link
          href={routeBuilder.businessVitrine(profileSlug, categoryId)}
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          مشاهده تمام محصولات این دسته ({totalCount.toLocaleString('fa-IR')})
          <ChevronLeft className="size-4" />
        </Link>
      )}
    </div>
  );
}

function filterOffersByCategory(offers: BusinessOffer[], categoryId: string): BusinessOffer[] {
  return offers.filter((o) =>
    offerMatchesCategoryFilter(
      {
        categoryIds: o.categoryIds ?? (o.vitrineCategoryId ? [o.vitrineCategoryId] : []),
        primaryCategoryId: o.primaryCategoryId ?? o.vitrineCategoryId ?? null,
      },
      categoryId
    )
  );
}

export function ServicesSection({ business, onOfferAction }: SectionProps) {
  if (business.offers.length === 0) return null;

  return (
    <section id="section-services" className="scroll-mt-24 space-y-4">
      <h2 className="text-lg font-semibold">خدمات و پیشنهادها</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {business.offers.map((o) => (
          <ServiceCard
            key={o.id}
            offer={o}
            onAction={() => onOfferAction?.(o.id, o.ctaType)}
          />
        ))}
      </div>
    </section>
  );
}

export function ProductsSection({ business }: SectionProps) {
  const searchParams = useSearchParams();
  const categoryFilter =
    searchParams.get('vitrineCategory') ?? searchParams.get('category');

  if (business.offers.length === 0) return null;

  const categories: StorefrontCategory[] = business.extensions?.storefront?.categories ?? [];
  const profileSlug = business.slug;

  if (categoryFilter && categories.length > 0) {
    const cat = categories.find((c) => c.id === categoryFilter);
    const filtered = filterOffersByCategory(business.offers, categoryFilter);

    return (
      <section id="section-products" className="scroll-mt-24 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
            {cat?.title ?? 'محصولات'}
          </h2>
          <Link
            href={routeBuilder.businessProfile(profileSlug, { tab: 'products' })}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            همه دسته‌ها
          </Link>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">در این دسته محصولی نیست.</p>
        ) : (
          <div className={PRODUCT_GRID_CLASS}>
            {filtered.map((o) => (
              <ProductTile key={o.id} offer={o} profileSlug={profileSlug} />
            ))}
          </div>
        )}
      </section>
    );
  }

  const useVitrine = categories.length > 0;

  if (useVitrine) {
    const groups = groupOffersByVitrineCategory(
      business.offers.map((o) => ({
        ...o,
        categoryIds: o.categoryIds ?? (o.vitrineCategoryId ? [o.vitrineCategoryId] : []),
      })),
      categories
    );

    return (
      <section id="section-products" className="scroll-mt-24 space-y-10">
        <h2 className="border-b border-border/50 pb-3 text-lg font-semibold text-emerald-900 dark:text-emerald-200">
          ویترین محصولات
        </h2>
        {groups.map(({ category, offers }) => {
          if (!category || offers.length === 0) return null;
          const preview = offers.slice(0, PREVIEW_PER_CATEGORY);
          return (
            <div key={category.id} className="space-y-4">
              <CategoryRowHeader
                title={category.title}
                profileSlug={profileSlug}
                categoryId={category.id}
                totalCount={offers.length}
                showViewAll
              />
              <div className={PRODUCT_GRID_CLASS}>
                {preview.map((o) => (
                  <ProductTile key={o.id} offer={o} profileSlug={profileSlug} />
                ))}
              </div>
            </div>
          );
        })}
        {groups
          .filter((g) => !g.category && g.offers.length > 0)
          .map(({ offers }) => (
            <div key="uncategorized" className="space-y-4">
              <CategoryRowHeader
                title="سایر محصولات"
                profileSlug={profileSlug}
                categoryId={null}
                totalCount={offers.length}
                showViewAll={false}
              />
              <div className={PRODUCT_GRID_CLASS}>
                {offers.slice(0, PREVIEW_PER_CATEGORY).map((o) => (
                  <ProductTile key={o.id} offer={o} profileSlug={profileSlug} />
                ))}
              </div>
            </div>
          ))}
      </section>
    );
  }

  return (
    <section id="section-products" className="scroll-mt-24 space-y-4">
      <h2 className="border-b border-border/50 pb-3 text-lg font-semibold text-emerald-900 dark:text-emerald-200">
        محصولات
      </h2>
      <div className={PRODUCT_GRID_CLASS}>
        {business.offers.map((o) => (
          <ProductTile key={o.id} offer={o} profileSlug={profileSlug} />
        ))}
      </div>
    </section>
  );
}
