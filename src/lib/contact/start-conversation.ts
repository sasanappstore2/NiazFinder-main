import { routeBuilder } from '@/config/routes';
import type { ProductChatIntro } from '@/lib/chat/product-chat-intro';
import { sendProductChatIntroMessage } from '@/lib/chat/product-chat-intro';
import { mapApiConversationItem } from '@/lib/chat/map-conversation-item';
import { tryJoinConversation } from '@/lib/chat/socket-bridge';
import { useAppStore } from '@/lib/store';
import type { Conversation } from '@/lib/types';
import type { PendingContactIntent } from './constants';
import { clearPendingContact, savePendingContact } from './pending-contact';

export interface StartConversationParams {
  otherUserId: string;
  requestId?: string;
  returnTo?: string;
  contactPointId?: string;
  businessProfileId?: string;
  /** Auto-send product context as first message after opening chat */
  productIntro?: ProductChatIntro;
}

export interface StartConversationResult {
  conversationId: string;
  existed: boolean;
  conversation?: Conversation;
}

export class ContactAuthRequiredError extends Error {
  constructor(public intent: PendingContactIntent) {
    super('AUTH_REQUIRED');
    this.name = 'ContactAuthRequiredError';
  }
}

/** Create or reuse a conversation via site chat API. */
export async function startConversation(
  params: StartConversationParams,
  token: string | null
): Promise<StartConversationResult> {
  if (!token) {
    const intent: PendingContactIntent = {
      action: 'chat',
      otherUserId: params.otherUserId,
      requestId: params.requestId,
      returnTo: params.returnTo,
      productIntro: params.productIntro,
      contactPointId: params.contactPointId,
      businessProfileId: params.businessProfileId,
    };
    savePendingContact(intent);
    throw new ContactAuthRequiredError(intent);
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      otherUserId: params.otherUserId,
      requestId: params.requestId,
      contactPointId: params.contactPointId,
      businessProfileId: params.businessProfileId,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'خطا در ایجاد گفتگو');
  }

  clearPendingContact();

  const conversationId = json.conversation.id as string;

  const { trackAnalyticsEvent } = await import('@/lib/analytics/track');
  trackAnalyticsEvent('chat_started', {
    conversationId,
    requestId: params.requestId,
    businessProfileId: params.businessProfileId,
    contactPointId: params.contactPointId,
  });

  if (params.productIntro) {
    const sent = await sendProductChatIntroMessage(
      conversationId,
      params.productIntro,
      token
    );
    if (!sent) {
      throw new Error('ارسال کارت محصول در گفتگو انجام نشد');
    }
  }

  return {
    conversationId,
    existed: Boolean(json.message?.includes('قبلاً')),
    conversation: json.conversation
      ? mapApiConversationItem(json.conversation)
      : undefined,
  };
}

/** Add conversation to store and join socket room before navigation. */
export function syncConversationAfterStart(result: StartConversationResult): void {
  if (result.conversation) {
    useAppStore.getState().addOrUpdateConversation(result.conversation);
  }
  tryJoinConversation(result.conversationId);
}

export function navigateToConversation(
  router: { push: (url: string) => void },
  conversationId: string
): void {
  router.push(routeBuilder.chatConversation(conversationId));
}

export function syncAndNavigateToConversation(
  router: { push: (url: string) => void },
  result: StartConversationResult
): void {
  syncConversationAfterStart(result);
  navigateToConversation(router, result.conversationId);
}

export function requestChatWithAuthGate(
  params: StartConversationParams,
  isAuthenticated: boolean,
  openAuthModal: () => void
): void {
  if (!isAuthenticated) {
    savePendingContact({
      action: 'chat',
      otherUserId: params.otherUserId,
      requestId: params.requestId,
      returnTo: params.returnTo,
      productIntro: params.productIntro,
    });
    openAuthModal();
    return;
  }
}
