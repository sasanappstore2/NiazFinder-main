'use client';

import { useCallback, useEffect, useState } from 'react';
import { getBusinessCategoryTitle } from '@/lib/business/business-category';
import { createStorefrontBrandId, parseStorefrontExtension } from '@/lib/business/storefront';
import type { StorefrontBrand, StorefrontCategory } from '@/contracts/business-profile';
import { getClientAuthHeaders } from '@/lib/auth/client-auth';
import { toast } from 'sonner';
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
  const [brands, setBrands] = useState<StorefrontBrand[]>([]);
  const [offers, setOffers] = useState<StorefrontOfferRow[]>([]);
  const [loading, setLoading] = useState(true);

  const saveStorefront = async (patch: {
    categories?: StorefrontCategory[];
    brands?: StorefrontBrand[];
  }) => {
    const nextCategories = patch.categories ?? categories;
    const nextBrands = patch.brands ?? brands;
    const res = await fetch('/api/business/me/extensions', {
      method: 'PATCH',
      headers: getClientAuthHeaders(),
      body: JSON.stringify({
        extensions: { storefront: { categories: nextCategories, brands: nextBrands } },
      }),
    });
    if (!res.ok) return false;
    setCategories(nextCategories);
    setBrands(nextBrands);
    return true;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [extRes, offersRes] = await Promise.all([
        fetch('/api/business/me/extensions', { headers: getClientAuthHeaders() }),
        fetch('/api/business/me/offers', { headers: getClientAuthHeaders() }),
      ]);
      if (extRes.ok) {
        const data = (await extRes.json()) as { extensions?: { storefront?: unknown } };
        const storefront = parseStorefrontExtension(data.extensions?.storefront);
        setCategories(storefront.categories);
        setBrands(storefront.brands ?? []);
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
            brandId: o.brandId ?? null,
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

  const saveCategories = async (next: StorefrontCategory[]) => saveStorefront({ categories: next });

  const addBrand = async (title: string): Promise<string | null> => {
    const trimmed = title.trim();
    if (!trimmed) return null;
    const existing = brands.find((b) => b.title === trimmed);
    if (existing) {
      toast.info('این برند قبلاً ثبت شده');
      return existing.id;
    }
    const nextBrand: StorefrontBrand = {
      id: createStorefrontBrandId(),
      title: trimmed,
      sortOrder: brands.length,
    };
    const next = [...brands, nextBrand];
    const ok = await saveStorefront({ brands: next });
    if (!ok) {
      toast.error('ذخیره برند ناموفق بود');
      return null;
    }
    toast.success('برند اضافه شد');
    return nextBrand.id;
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
        brands={brands}
        onAddBrand={addBrand}
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
