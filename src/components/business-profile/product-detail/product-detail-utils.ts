import type { BusinessOffer } from '@/contracts/business-profile';

export function displayPrice(offer: BusinessOffer, variantId: string | null): string | undefined {
  if (variantId) {
    const v = offer.variants?.find((x) => x.id === variantId);
    if (v?.price) return v.price;
  }
  return offer.priceRange;
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
