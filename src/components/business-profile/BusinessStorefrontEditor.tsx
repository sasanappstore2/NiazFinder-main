'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBusinessCategoryTitle } from '@/lib/business/business-category';
import { parseStorefrontExtension } from '@/lib/business/storefront';
import type { StorefrontCategory } from '@/contracts/business-profile';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import {
  StorefrontCategoriesSection,
  stripCategoryFromOffers,
} from '@/components/business-profile/storefront/StorefrontCategoriesSection';
import {
  StorefrontProductsSection,
  type StorefrontOfferRow,
} from '@/components/business-profile/storefront/StorefrontProductsSection';

export function BusinessStorefrontEditor({
  primaryCategorySlug,
  occupationSlugs = [],
  onMutate,
}: {
  primaryCategorySlug?: string;
  occupationSlugs?: string[];
  onMutate?: () => void;
}) {
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [offers, setOffers] = useState<StorefrontOfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [extRes, offersRes] = await Promise.all([
        fetch('/api/business/me/extensions', { headers: getClientAuthHeaders() }),
        fetch('/api/business/me/offers', { headers: getClientAuthHeaders() }),
      ]);
      if (extRes.ok) {
        const data = (await extRes.json()) as { extensions?: { storefront?: unknown } };
        setCategories(parseStorefrontExtension(data.extensions?.storefront).categories);
      }
      if (offersRes.ok) {
        const data = (await offersRes.json()) as { offers?: StorefrontOfferRow[] };
        setOffers(
          (data.offers ?? []).map((o) => ({
            ...o,
            images: o.images ?? [],
            categoryIds: o.categoryIds ?? (o.vitrineCategoryId ? [o.vitrineCategoryId] : []),
            primaryCategoryId:
              o.primaryCategoryId ?? o.vitrineCategoryId ?? o.categoryIds?.[0] ?? null,
            variants: o.variants ?? [],
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCategories = async (next: StorefrontCategory[]) => {
    const res = await fetch('/api/business/me/extensions', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({ extensions: { storefront: { categories: next } } }),
    });
    if (!res.ok) return false;
    setCategories(next);
    return true;
  };

  const productCountByCategory = (id: string) =>
    offers.filter((o) => o.categoryIds.includes(id)).length;

  const primaryLabel = primaryCategorySlug
    ? getBusinessCategoryTitle(primaryCategorySlug)
    : null;

  return (
    <div className="space-y-8">
      <StorefrontCategoriesSection
        categories={categories}
        productCountByCategory={productCountByCategory}
        onCategoriesChange={saveCategories}
        onCategoryDeleted={async (id) => {
          await stripCategoryFromOffers(id);
          await load();
          onMutate?.();
        }}
      />

      <StorefrontProductsSection
        categories={categories}
        offers={offers}
        loading={loading}
        primaryLabel={
          primaryLabel
            ? occupationSlugs.length > 1
              ? `${primaryLabel} (+${occupationSlugs.length - 1})`
              : primaryLabel
            : null
        }
        onReload={load}
        onMutate={onMutate}
      />
    </div>
  );
}
