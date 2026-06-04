/**
 * Structured vitrine data stored in BusinessOffer.features (no DB migration).
 */
import type { OfferVariant } from '@/contracts/business-profile';

export const OFFER_STOREFRONT_META_PREFIX = '__storefrontMeta:';
export const LEGACY_VITRINE_CATEGORY_PREFIX = '__vitrineCategoryId:';

export type OfferStorefrontMeta = {
  categoryIds: string[];
  primaryCategoryId: string | null;
  variants: OfferVariant[];
  brandId: string | null;
};

export const EMPTY_OFFER_STOREFRONT_META: OfferStorefrontMeta = {
  categoryIds: [],
  primaryCategoryId: null,
  variants: [],
  brandId: null,
};

function parseMetaJson(raw: string): OfferStorefrontMeta | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const categoryIds = Array.isArray(o.categoryIds)
      ? o.categoryIds.filter((x): x is string => typeof x === 'string' && x.length > 0)
      : [];
    const primaryCategoryId =
      typeof o.primaryCategoryId === 'string' && o.primaryCategoryId
        ? o.primaryCategoryId
        : null;
    const variants: OfferVariant[] = Array.isArray(o.variants)
      ? o.variants
          .filter((v): v is Record<string, unknown> => v != null && typeof v === 'object')
          .map((v) => ({
            id: String(v.id ?? `var-${Math.random().toString(36).slice(2, 9)}`),
            name: String(v.name ?? '').trim(),
            price: typeof v.price === 'string' ? v.price.trim() : undefined,
            imageUrl: typeof v.imageUrl === 'string' ? v.imageUrl.trim() : undefined,
          }))
          .filter((v) => v.name)
      : [];
    const primary =
      primaryCategoryId && categoryIds.includes(primaryCategoryId)
        ? primaryCategoryId
        : categoryIds[0] ?? null;
    const brandId =
      typeof o.brandId === 'string' && o.brandId.trim() ? o.brandId.trim() : null;
    return { categoryIds, primaryCategoryId: primary, variants, brandId };
  } catch {
    return null;
  }
}

export function parseOfferStorefrontFromFeatures(features: string[]): {
  meta: OfferStorefrontMeta;
  displayFeatures: string[];
} {
  const displayFeatures = features.filter(
    (f) =>
      !f.startsWith(OFFER_STOREFRONT_META_PREFIX) &&
      !f.startsWith(LEGACY_VITRINE_CATEGORY_PREFIX)
  );

  const metaTag = features.find((f) => f.startsWith(OFFER_STOREFRONT_META_PREFIX));
  if (metaTag) {
    const parsed = parseMetaJson(metaTag.slice(OFFER_STOREFRONT_META_PREFIX.length));
    if (parsed) return { meta: parsed, displayFeatures };
  }

  const legacy = features.find((f) => f.startsWith(LEGACY_VITRINE_CATEGORY_PREFIX));
  if (legacy) {
    const id = legacy.slice(LEGACY_VITRINE_CATEGORY_PREFIX.length);
    return {
      meta: { categoryIds: id ? [id] : [], primaryCategoryId: id || null, variants: [], brandId: null },
      displayFeatures,
    };
  }

  return { meta: { ...EMPTY_OFFER_STOREFRONT_META }, displayFeatures };
}

export function serializeOfferStorefrontFeatures(
  displayFeatures: string[],
  meta: OfferStorefrontMeta
): string[] {
  const cleanDisplay = displayFeatures.filter(
    (f) =>
      !f.startsWith(OFFER_STOREFRONT_META_PREFIX) &&
      !f.startsWith(LEGACY_VITRINE_CATEGORY_PREFIX)
  );

  const categoryIds = [...new Set(meta.categoryIds.filter(Boolean))];
  let primaryCategoryId = meta.primaryCategoryId;
  if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
    primaryCategoryId = categoryIds[0] ?? null;
  }
  if (!primaryCategoryId && categoryIds.length > 0) {
    primaryCategoryId = categoryIds[0];
  }

  const variants = meta.variants
    .filter((v) => v.name.trim())
    .map((v) => ({
      id: v.id || `var-${Math.random().toString(36).slice(2, 9)}`,
      name: v.name.trim(),
      ...(v.price?.trim() ? { price: v.price.trim() } : {}),
      ...(v.imageUrl?.trim() ? { imageUrl: v.imageUrl.trim() } : {}),
    }));

  const hasMeta =
    categoryIds.length > 0 ||
    variants.length > 0 ||
    primaryCategoryId != null ||
    meta.brandId != null;

  if (!hasMeta) return cleanDisplay;

  const payload: OfferStorefrontMeta = {
    categoryIds,
    primaryCategoryId,
    variants,
    brandId: meta.brandId?.trim() || null,
  };

  return [
    `${OFFER_STOREFRONT_META_PREFIX}${JSON.stringify(payload)}`,
    ...cleanDisplay,
  ];
}

/** @deprecated use parseOfferStorefrontFromFeatures */
export function parseOfferFeatures(features: string[]): {
  vitrineCategoryId: string | null;
  displayFeatures: string[];
} {
  const { meta, displayFeatures } = parseOfferStorefrontFromFeatures(features);
  return {
    vitrineCategoryId: meta.primaryCategoryId ?? meta.categoryIds[0] ?? null,
    displayFeatures,
  };
}

export function withVitrineCategoryId(
  features: string[],
  categoryId: string | null | undefined
): string[] {
  const { meta, displayFeatures } = parseOfferStorefrontFromFeatures(features);
  if (!categoryId) {
    return serializeOfferStorefrontFeatures(displayFeatures, {
      ...meta,
      categoryIds: [],
      primaryCategoryId: null,
    });
  }
  return serializeOfferStorefrontFeatures(displayFeatures, {
    ...meta,
    categoryIds: [categoryId],
    primaryCategoryId: categoryId,
  });
}

export function offerMatchesCategoryFilter(
  meta: Pick<OfferStorefrontMeta, 'categoryIds' | 'primaryCategoryId'>,
  filterCategoryId: string | null
): boolean {
  if (!filterCategoryId) return true;
  if (meta.categoryIds.includes(filterCategoryId)) return true;
  return meta.primaryCategoryId === filterCategoryId;
}

export function createVariantId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `var-${Date.now().toString(36)}`;
}
