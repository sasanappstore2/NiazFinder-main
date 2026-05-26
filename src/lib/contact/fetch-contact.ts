import type { PendingContactIntent } from './constants';
import { savePendingContact } from './pending-contact';
import { ContactAuthRequiredError } from './start-conversation';

export interface UserContactInfo {
  userId: string;
  phone: string | null;
  hasPhone: boolean;
  chatEnabled: boolean;
  displayName: string;
}

export async function fetchUserContact(
  userId: string,
  token: string | null
): Promise<UserContactInfo> {
  if (!token) {
    const intent: PendingContactIntent = {
      action: 'call',
      otherUserId: userId,
    };
    savePendingContact(intent);
    throw new ContactAuthRequiredError(intent);
  }

  const res = await fetch(`/api/users/${encodeURIComponent(userId)}/contact`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'خطا در دریافت اطلاعات تماس');
  }
  return json as UserContactInfo;
}
