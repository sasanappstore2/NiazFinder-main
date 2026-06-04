export const PENDING_CONTACT_STORAGE_KEY = 'nf_pending_contact';

export type PendingContactAction = 'chat' | 'call';

import type { ProductChatIntro } from '@/lib/chat/product-chat-intro';

export interface PendingContactIntent {
  action: PendingContactAction;
  otherUserId: string;
  requestId?: string;
  returnTo?: string;
  productIntro?: ProductChatIntro;
  contactPointId?: string;
  businessProfileId?: string;
  businessSlug?: string;
}
