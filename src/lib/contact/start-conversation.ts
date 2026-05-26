import { routeBuilder } from '@/config/routes';
import type { PendingContactIntent } from './constants';
import { clearPendingContact, savePendingContact } from './pending-contact';

export interface StartConversationParams {
  otherUserId: string;
  requestId?: string;
  returnTo?: string;
}

export interface StartConversationResult {
  conversationId: string;
  existed: boolean;
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
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'خطا در ایجاد گفتگو');
  }

  clearPendingContact();
  return {
    conversationId: json.conversation.id as string,
    existed: Boolean(json.message?.includes('قبلاً')),
  };
}

export function navigateToConversation(
  router: { push: (url: string) => void },
  conversationId: string
): void {
  router.push(routeBuilder.chatConversation(conversationId));
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
    });
    openAuthModal();
    return;
  }
}
