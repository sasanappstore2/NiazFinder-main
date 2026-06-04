import type { BusinessOffer } from '@/contracts/business-profile';
import { formatPriceText } from '@/lib/format/money';

export function displayPrice(offer: BusinessOffer, variantId: string | null): string | undefined {
  let raw: string | undefined;
  if (variantId) {
    const v = offer.variants?.find((x) => x.id === variantId);
    if (v?.price) raw = v.price;
  }
  if (!raw) raw = offer.priceRange;
  return raw ? formatPriceText(raw) : undefined;
}

export function displayImages(offer: BusinessOffer, variantId: string | null): string[] {
  const base = offer.images.filter(Boolean);
  if (variantId) {
    const v = offer.variants?.find((x) => x.id === variantId);
    if (v?.imageUrl) {
      return [v.imageUrl, ...base.filter((u) => u !== v.imageUrl)];
    }
  }
  return base;
}
