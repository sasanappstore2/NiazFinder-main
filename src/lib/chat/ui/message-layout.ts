import type { Message } from '@/lib/types';
import { CHAT_CONTACT_SHARE_PREFIX } from '@/lib/chat/contact-share';
import {
  CHAT_PRODUCT_CARD_PREFIX,
  parseLegacyProductIntroText,
} from '@/contracts/product-card-snapshot';

export type MessageContentKind =
  | 'text'
  | 'deleted'
  | 'image'
  | 'voice'
  | 'file'
  | 'offer_card'
  | 'need_card'
  | 'proposal'
  | 'contact_share';

export type MessageLayoutHints = {
  kind: MessageContentKind;
  isMedia: boolean;
  isCard: boolean;
  useUnbrokenWrap: boolean;
};

const UNBROKEN_MIN_LEN = 48;

export function classifyMessageContent(msg: Message): MessageLayoutHints {
  if (msg.deletedAt) {
    return { kind: 'deleted', isMedia: false, isCard: false, useUnbrokenWrap: false };
  }

  if (msg.type === 'IMAGE') {
    return { kind: 'image', isMedia: true, isCard: false, useUnbrokenWrap: false };
  }
  if (msg.type === 'VOICE') {
    return { kind: 'voice', isMedia: true, isCard: false, useUnbrokenWrap: false };
  }
  if (msg.type === 'FILE') {
    return { kind: 'file', isMedia: false, isCard: false, useUnbrokenWrap: false };
  }
  if (msg.type === 'NEED_CARD') {
    return { kind: 'need_card', isMedia: false, isCard: true, useUnbrokenWrap: false };
  }
  if (msg.type === 'OFFER_CARD') {
    return { kind: 'offer_card', isMedia: false, isCard: true, useUnbrokenWrap: false };
  }
  if (msg.type === 'PROPOSAL') {
    return { kind: 'proposal', isMedia: false, isCard: true, useUnbrokenWrap: false };
  }

  if (msg.type === 'TEXT' && typeof msg.content === 'string') {
    if (msg.content.startsWith(CHAT_CONTACT_SHARE_PREFIX)) {
      return { kind: 'contact_share', isMedia: false, isCard: false, useUnbrokenWrap: false };
    }
    if (
      msg.content.startsWith(CHAT_PRODUCT_CARD_PREFIX) ||
      parseLegacyProductIntroText(msg.content)
    ) {
      return { kind: 'offer_card', isMedia: false, isCard: true, useUnbrokenWrap: false };
    }

    const compact = msg.content.replace(/\s/g, '');
    const useUnbrokenWrap =
      compact.length >= UNBROKEN_MIN_LEN && !/\s/.test(msg.content.slice(0, 80));

    return { kind: 'text', isMedia: false, isCard: false, useUnbrokenWrap };
  }

  return { kind: 'text', isMedia: false, isCard: false, useUnbrokenWrap: false };
}

export function messageTextClassName(hints: MessageLayoutHints): string {
  return hints.useUnbrokenWrap
    ? 'chat-message-text chat-message-text--unbroken'
    : 'chat-message-text';
}
