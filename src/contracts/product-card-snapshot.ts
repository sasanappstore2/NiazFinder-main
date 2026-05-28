import { z } from 'zod';

/** Structured product card inside TEXT messages (same pattern as contact share). */
export const CHAT_PRODUCT_CARD_PREFIX = '__NF_PRODUCT_V1__:' as const;

/** Payload in Message.content when type = OFFER_CARD */
export const productCardSnapshotSchema = z.object({
  v: z.literal(1).default(1),
  offerId: z.string(),
  title: z.string(),
  price: z.string().optional(),
  imageUrl: z.string().optional(),
  productUrl: z.string(),
  businessName: z.string().optional(),
  businessSlug: z.string().optional(),
  introText: z.string().optional(),
});

export type ProductCardSnapshot = z.infer<typeof productCardSnapshotSchema>;

export function parseProductCardSnapshot(content: string): ProductCardSnapshot | null {
  try {
    const parsed = JSON.parse(content);
    const result = productCardSnapshotSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function buildChatProductCardContent(snapshot: ProductCardSnapshot): string {
  return `${CHAT_PRODUCT_CARD_PREFIX}${serializeProductCardSnapshot(snapshot)}`;
}

export function parseChatProductCardContent(content: string): ProductCardSnapshot | null {
  if (!content.startsWith(CHAT_PRODUCT_CARD_PREFIX)) return null;
  return parseProductCardSnapshot(content.slice(CHAT_PRODUCT_CARD_PREFIX.length));
}

/** Pre–OFFER_CARD plain-text intros still in older conversations. */
export function parseLegacyProductIntroText(content: string): ProductCardSnapshot | null {
  const text = content.trim();
  const match = text.match(
    /^سلام، دربارهٔ «(.+)» سوال دارم\.(?:\nقیمت: (.+))?\nلینک محصول: (\S+)/u
  );
  if (!match) return null;
  const [, title, price, productUrl] = match;
  const offerId = productUrl.match(/\/p\/([^/?#]+)/)?.[1] ?? 'unknown';
  return {
    v: 1,
    offerId,
    title: title.trim(),
    price: price?.trim() || undefined,
    productUrl: productUrl.trim(),
    introText: `سلام، دربارهٔ «${title.trim()}» سوال دارم.`,
  };
}

export function serializeProductCardSnapshot(snapshot: ProductCardSnapshot): string {
  return JSON.stringify(snapshot);
}
