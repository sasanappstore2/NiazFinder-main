import { publishCommEvent } from '@/lib/communication/redis-publish';

export type TypingFanoutPayload = {
  conversationId: string;
  userId: string;
  targetUserId: string;
  isTyping: boolean;
  user: { firstName: string; lastName: string };
};

export async function publishTypingEvent(payload: TypingFanoutPayload): Promise<void> {
  await publishCommEvent({
    type: 'typing',
    payload: payload as unknown as Record<string, unknown>,
  });
}
