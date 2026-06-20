import type { Message } from '@/lib/types';
import { CHAT_CONTACT_SHARE_PREFIX } from '@/lib/chat/contact-share';
import { CHAT_LOCATION_SHARE_PREFIX } from '@/lib/chat/location-share';
import {
  CHAT_PRODUCT_CARD_PREFIX,
  parseLegacyProductIntroText,
} from '@/contracts/product-card-snapshot';

/** Plain TEXT messages sent by the viewer (not cards/contact/deleted). */
export function canEditChatMessage(msg: Message, viewerId?: string): boolean {
  if (!viewerId || msg.senderId !== viewerId || msg.deletedAt) return false;
  if (msg.type !== 'TEXT') return false;
  if (typeof msg.content !== 'string') return false;
  if (msg.content.startsWith(CHAT_CONTACT_SHARE_PREFIX)) return false;
  if (msg.content.startsWith(CHAT_LOCATION_SHARE_PREFIX)) return false;
  if (
    msg.content.startsWith(CHAT_PRODUCT_CARD_PREFIX) ||
    parseLegacyProductIntroText(msg.content)
  ) {
    return false;
  }
  return true;
}
