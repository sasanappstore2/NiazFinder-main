import type { PendingContactIntent } from './constants';
import { PENDING_CONTACT_STORAGE_KEY } from './constants';

export function savePendingContact(intent: PendingContactIntent): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(PENDING_CONTACT_STORAGE_KEY, JSON.stringify(intent));
}

export function loadPendingContact(): PendingContactIntent | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_CONTACT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingContactIntent;
  } catch {
    return null;
  }
}

export function clearPendingContact(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(PENDING_CONTACT_STORAGE_KEY);
}
