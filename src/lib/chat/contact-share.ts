import { CHAT_PRODUCT_CARD_PREFIX, parseLegacyProductIntroText } from '@/contracts/product-card-snapshot';

/** Marker for v1 structured contact-share payloads inside message `content` (type TEXT). */
export const CHAT_CONTACT_SHARE_PREFIX = '__NF_CONTACT_V1__:' as const;

export type ChatContactSharePayloadV1 = {
  v: 1;
  phone: string;
  avatar?: string | null;
};

export function buildChatContactShareContent(payload: ChatContactSharePayloadV1): string {
  return `${CHAT_CONTACT_SHARE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseChatContactShareContent(content: string): ChatContactSharePayloadV1 | null {
  if (!content.startsWith(CHAT_CONTACT_SHARE_PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(CHAT_CONTACT_SHARE_PREFIX.length)) as ChatContactSharePayloadV1;
    if (raw?.v !== 1 || typeof raw.phone !== 'string' || !raw.phone.trim()) return null;
    return raw;
  } catch {
    return null;
  }
}

/** E.164-ish display for Iran mobile; falls back to original. */
export function formatPhoneDisplayFa(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length >= 12) {
    const rest = digits.slice(2);
    if (rest.length === 10) {
      return `+98 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
    }
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10 && digits.startsWith('9')) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone.trim();
}

/** Force LTR visual order inside RTL chat bubbles (avoids "3028 433 0937"). */
export function isolatePhoneDisplay(display: string): string {
  return `\u2066${display}\u2069`;
}

export function chatMessageListPreview(content: string, type?: string): string {
  if (type === 'NEED_CARD') return 'نیاز';
  if (type === 'OFFER_CARD') {
    try {
      const p = JSON.parse(content) as { title?: string };
      return p.title ? `محصول: ${p.title}` : 'محصول';
    } catch {
      return 'محصول';
    }
  }
  if (type === 'IMAGE') return 'تصویر';
  if (type === 'FILE') return 'فایل';
  if (content.startsWith(CHAT_PRODUCT_CARD_PREFIX)) {
    try {
      const p = JSON.parse(content.slice(CHAT_PRODUCT_CARD_PREFIX.length)) as { title?: string };
      return p.title ? `محصول: ${p.title}` : 'محصول';
    } catch {
      return 'محصول';
    }
  }
  const legacyProduct = parseLegacyProductIntroText(content);
  if (legacyProduct?.title) return `محصول: ${legacyProduct.title}`;
  if (legacyProduct) return 'محصول';
  if (parseChatContactShareContent(content)) return 'شمارهٔ تماس';
  return content;
}

export function phoneToTelHref(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('98')) return `tel:+${d}`;
  if (d.startsWith('0') && d.length >= 10) return `tel:+98${d.slice(1)}`;
  if (d.length === 10 && d.startsWith('9')) return `tel:+98${d}`;
  return `tel:${encodeURIComponent(phone.trim())}`;
}
