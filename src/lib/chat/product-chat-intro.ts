import type { BusinessOffer } from '@/contracts/business-profile';
import type { ProductCardSnapshot } from '@/contracts/product-card-snapshot';
import {
  buildChatProductCardContent,
  serializeProductCardSnapshot,
} from '@/contracts/product-card-snapshot';
import { routeBuilder } from '@/config/routes';
import { formatPriceText } from '@/lib/format/money';
import { useAppStore } from '@/lib/store';

export type ProductChatIntro = {
  offerId: string;
  title: string;
  price?: string;
  productUrl: string;
  imageUrl?: string;
  businessName: string;
  businessSlug?: string;
  variantName?: string;
};

export function buildProductChatIntro(
  businessSlug: string,
  offer: BusinessOffer,
  variantId: string | null
): ProductChatIntro {
  let title = offer.title;
  let price = offer.priceRange;
  let imageUrl = offer.images[0];

  if (variantId && offer.variants) {
    const v = offer.variants.find((x) => x.id === variantId);
    if (v) {
      if (v.name) title = `${offer.title} (${v.name})`;
      if (v.price) price = v.price;
      if (v.imageUrl) imageUrl = v.imageUrl;
    }
  }

  return {
    offerId: offer.id,
    title,
    price: price ? formatPriceText(price) : undefined,
    productUrl: routeBuilder.businessProduct(businessSlug, offer.id),
    imageUrl,
    businessName: '',
    businessSlug,
    variantName: variantId
      ? offer.variants?.find((x) => x.id === variantId)?.name
      : undefined,
  };
}

export function productIntroToCardSnapshot(intro: ProductChatIntro): ProductCardSnapshot {
  return {
    v: 1,
    offerId: intro.offerId,
    title: intro.title,
    price: intro.price,
    imageUrl: intro.imageUrl,
    productUrl: intro.productUrl,
    businessName: intro.businessName || undefined,
    businessSlug: intro.businessSlug,
    introText: `سلام، دربارهٔ «${intro.title}» سوال دارم.`,
  };
}

export async function sendProductChatIntroMessage(
  conversationId: string,
  intro: ProductChatIntro,
  _token: string
): Promise<boolean> {
  const snapshot = productIntroToCardSnapshot(intro);
  const json = serializeProductCardSnapshot(snapshot);
  const { sendMessage } = useAppStore.getState();

  const asOfferCard = await sendMessage(conversationId, json, 'OFFER_CARD');
  if (asOfferCard) return true;

  return sendMessage(conversationId, buildChatProductCardContent(snapshot), 'TEXT');
}
