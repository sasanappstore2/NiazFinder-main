import { getRootCategorySlug } from '@/config/need-schemas/resolve-schema';
import {
  PRODUCT_DEAL_LABELS,
  PROPERTY_DEAL_LABELS,
  VEHICLE_DEAL_LABELS,
} from '@/config/need-schemas/labels';
import { extractProductSubjectFromText } from '@/lib/need-intake/product-buy-hints';

export function dealLabelForCategory(
  categorySlug: string | undefined,
  deal: string
): string | undefined {
  if (!deal) return undefined;
  const root = categorySlug ? getRootCategorySlug(categorySlug) : null;
  if (root === 'real-estate') return PROPERTY_DEAL_LABELS[deal];
  if (root === 'vehicles') return VEHICLE_DEAL_LABELS[deal];
  return PRODUCT_DEAL_LABELS[deal];
}

/** Join title segments; drops empty / lone punctuation. */
export function joinListingTitleParts(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && p !== '،' && p !== ',')
    .join(' — ');
}

export function buildProductSearchTitle(
  rawText: string,
  deal: string | undefined,
  city?: string
): string {
  const dealFa = deal ? (PRODUCT_DEAL_LABELS[deal] ?? 'خرید') : 'خرید';
  const subject = extractProductSubjectFromText(rawText);
  const parts = [dealFa];
  if (subject) parts.push(subject);
  if (city?.trim()) parts.push(city.trim());
  return joinListingTitleParts(parts).slice(0, 120) || 'خرید کالا';
}
