import type { MessageNewPayload } from '@/lib/communication/redis-publish';

/**
 * Hook for FCM / Web Push — enqueue when message:new is persisted.
 * Wire a worker in production; no-op in dev.
 */
export async function enqueueMessagePushNotification(
  recipientUserId: string,
  payload: MessageNewPayload
): Promise<void> {
  if (process.env.PUSH_NOTIFICATIONS_ENABLED !== 'true') return;
  console.info('[push] queued', recipientUserId, payload.conversationId, payload.id);
}
