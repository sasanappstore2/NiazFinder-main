import { toast } from 'sonner';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { clearPendingContact, loadPendingContact } from './pending-contact';
import { fetchUserContact } from './fetch-contact';
import {
  navigateToConversation,
  startConversation,
  ContactAuthRequiredError,
} from './start-conversation';

export interface ResumeDeps {
  isAuthenticated: boolean;
  authToken: string | null;
  router: AppRouterInstance;
  openVoiceCall: (user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    displayName?: string;
    online?: boolean;
  }) => void;
}

/** After login, continue chat or voice call from saved intent. */
export async function resumePendingContact(deps: ResumeDeps): Promise<boolean> {
  const intent = loadPendingContact();
  if (!intent || !deps.isAuthenticated || !deps.authToken) return false;

  try {
    if (intent.action === 'chat') {
      const { conversationId } = await startConversation(
        {
          otherUserId: intent.otherUserId,
          requestId: intent.requestId,
          returnTo: intent.returnTo,
          productIntro: intent.productIntro,
        },
        deps.authToken
      );
      navigateToConversation(deps.router, conversationId);
      toast.success('گفتگو باز شد');
      clearPendingContact();
      return true;
    }

    if (intent.action === 'call') {
      const contact = await fetchUserContact(intent.otherUserId, deps.authToken);
      const parts = contact.displayName.split(/\s+/);
      deps.openVoiceCall({
        id: contact.userId,
        firstName: parts[0] ?? contact.displayName,
        lastName: parts.slice(1).join(' ') || '',
        displayName: contact.displayName,
        online: false,
      });
      clearPendingContact();
      return true;
    }
  } catch (e) {
    if (e instanceof ContactAuthRequiredError) return false;
    toast.error(e instanceof Error ? e.message : 'خطا در ادامه ارتباط');
    clearPendingContact();
  }

  return false;
}
