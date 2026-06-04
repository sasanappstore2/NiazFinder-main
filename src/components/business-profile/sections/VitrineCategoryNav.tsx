'use client';

import type { BusinessOffer, StorefrontCategory } from '@/contracts/business-profile';
import { offerMatchesCategoryFilter } from '@/lib/business/offer-storefront-meta';
import { cn } from '@/lib/utils';

function countOffersInCategory(offers: BusinessOffer[], categoryId: string): number {
  return offers.filter((o) =>
    offerMatchesCategoryFilter(
      {
        categoryIds: o.categoryIds ?? (o.vitrineCategoryId ? [o.vitrineCategoryId] : []),
        primaryCategoryId: o.primaryCategoryId ?? o.vitrineCategoryId ?? null,
      },
      categoryId
    )
  ).length;
}

export function VitrineCategoryNav({
  categories,
  offers,
  activeCategoryId,
  onCategorySelect,
}: {
  categories: StorefrontCategory[];
  offers: BusinessOffer[];
  activeCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}) {
  if (categories.length === 0) return null;

  const pillClass = (active: boolean) =>
    cn(
      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'border-emerald-600/40 bg-emerald-600 text-white shadow-sm dark:border-emerald-500/50 dark:bg-emerald-600'
        : 'border-border/60 bg-background text-foreground/85 hover:border-emerald-500/35 hover:bg-accent dark:bg-card'
    );

  return (
    <nav
      dir="rtl"
      className="-mx-1 flex w-full flex-row flex-wrap justify-start gap-2 px-1 pb-0.5 sm:flex-nowrap sm:overflow-x-auto sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden"
      aria-label="دسته‌بندی ویترین"
    >
      <button
        type="button"
        onClick={() => onCategorySelect(null)}
        className={pillClass(!activeCategoryId)}
        aria-current={!activeCategoryId ? 'true' : undefined}
      >
        همه
        <span className={cn('text-xs tabular-nums', activeCategoryId ? 'opacity-70' : 'opacity-90')}>
          ({offers.length.toLocaleString('fa-IR')})
        </span>
      </button>
      {categories.map((cat) => {
        const count = countOffersInCategory(offers, cat.id);
        const active = activeCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onCategorySelect(cat.id)}
            className={pillClass(active)}
            aria-current={active ? 'true' : undefined}
          >
            {cat.title}
            <span className={cn('text-xs tabular-nums', active ? 'opacity-90' : 'opacity-70')}>
              ({count.toLocaleString('fa-IR')})
            </span>
          </button>
        );
      })}
    </nav>
  );
}
