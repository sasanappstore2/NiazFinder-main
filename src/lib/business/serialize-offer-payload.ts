import type { OfferVariant } from '@/contracts/business-profile';
import {
  parseOfferStorefrontFromFeatures,
  serializeOfferStorefrontFeatures,
  type OfferStorefrontMeta,
} from '@/lib/business/offer-storefront-meta';
import { parseJsonArray } from '@/lib/business/json-fields';

export type OfferWriteBody = {
  title?: string;
  description?: string;
  priceRange?: string | null;
  duration?: string | null;
  images?: string[];
  features?: string[];
  categoryIds?: string[];
  primaryCategoryId?: string | null;
  vitrineCategoryId?: string | null;
  variants?: OfferVariant[];
  brandId?: string | null;
  ctaType?: string;
  isPublished?: boolean;
};

export function buildOfferFeaturesFromBody(
  existingFeaturesJson: string,
  body: OfferWriteBody
): string[] | undefined {
  const hasStorefrontPatch =
    body.categoryIds !== undefined ||
    body.primaryCategoryId !== undefined ||
    body.vitrineCategoryId !== undefined ||
    body.variants !== undefined ||
    body.brandId !== undefined ||
    body.features !== undefined;

  if (!hasStorefrontPatch) return undefined;

  const current = parseOfferStorefrontFromFeatures(parseJsonArray<string>(existingFeaturesJson));
  const displayFeatures = Array.isArray(body.features)
    ? body.features
    : current.displayFeatures;

  let categoryIds = body.categoryIds ?? current.meta.categoryIds;
  if (body.vitrineCategoryId !== undefined && body.categoryIds === undefined) {
    categoryIds = body.vitrineCategoryId ? [body.vitrineCategoryId] : [];
  }

  let primaryCategoryId =
    body.primaryCategoryId !== undefined ? body.primaryCategoryId : current.meta.primaryCategoryId;

  if (primaryCategoryId && !categoryIds.includes(primaryCategoryId)) {
    primaryCategoryId = categoryIds[0] ?? null;
  }
  if (!primaryCategoryId && categoryIds.length > 0) {
    primaryCategoryId = categoryIds[0];
  }

  const meta: OfferStorefrontMeta = {
    categoryIds,
    primaryCategoryId,
    variants: body.variants ?? current.meta.variants,
    brandId: body.brandId !== undefined ? body.brandId : current.meta.brandId,
  };

  return serializeOfferStorefrontFeatures(displayFeatures, meta);
}
