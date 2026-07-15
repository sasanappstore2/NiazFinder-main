import type { MessageNewPayload } from '@/lib/communication/redis-publish';
import { db } from '@/lib/db';

/**
 * Hook for FCM / Web Push — enqueue when message:new is persisted.
 * Respects ConversationMute for the recipient. Wire a worker in production.
 */
export async function enqueueMessagePushNotification(
  recipientUserId: string,
  payload: MessageNewPayload
): Promise<void> {
  if (process.env.PUSH_NOTIFICATIONS_ENABLED !== 'true') return;

  try {
    const mute = await db.conversationMute.findUnique({
      where: {
        conversationId_userId: {
          conversationId: payload.conversationId,
          userId: recipientUserId,
        },
      },
    });
    if (mute && (mute.mutedUntil == null || mute.mutedUntil > new Date())) {
      return;
    }
  } catch {
    // ignore mute lookup failures
  }

  console.info('[push] queued', recipientUserId, payload.conversationId, payload.id);
}
