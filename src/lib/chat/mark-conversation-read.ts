import { apiFetch } from '@/lib/api-client';

/** Mark incoming messages as read (REST fallback when socket is down). */
export async function markConversationRead(conversationId: string): Promise<void> {
  try {
    await apiFetch(`/api/chat/${conversationId}/read`, { method: 'POST' });
  } catch {
    /* best-effort */
  }
}
