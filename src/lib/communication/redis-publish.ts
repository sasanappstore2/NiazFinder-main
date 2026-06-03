import { COMM_REDIS_CHANNEL, type CommRedisEnvelope } from '@/lib/communication/constants';

let publisher: import('ioredis').default | null = null;

async function getPublisher(): Promise<import('ioredis').default | null> {
  if (publisher) return publisher;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const Redis = (await import('ioredis')).default;
    publisher = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    await publisher.connect();
    return publisher;
  } catch (e) {
    console.warn('[comm] Redis publisher unavailable:', e);
    publisher = null;
    return null;
  }
}

function chatServiceFanoutUrl(): string | null {
  const raw =
    process.env.CHAT_SERVICE_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, '');
}

async function fanoutViaChatServiceHttp(envelope: CommRedisEnvelope): Promise<void> {
  const base = chatServiceFanoutUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/internal/fanout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) {
      console.warn('[comm] HTTP fanout failed:', res.status);
    }
  } catch (e) {
    console.warn('[comm] HTTP fanout error:', e);
  }
}

/** Direct HTTP fanout to chat-service (bypasses Redis-only path). */
export async function fanoutCommEventHttp(envelope: CommRedisEnvelope): Promise<void> {
  await fanoutViaChatServiceHttp(envelope);
}

export async function publishCommEvent(envelope: CommRedisEnvelope): Promise<void> {
  const client = await getPublisher();
  if (client) {
    try {
      await client.publish(COMM_REDIS_CHANNEL, JSON.stringify(envelope));
      return;
    } catch (e) {
      console.warn('[comm] Redis publish failed, trying HTTP fanout:', e);
    }
  }
  await fanoutViaChatServiceHttp(envelope);
}

export type MessageNewPayload = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string[];
  isRead: boolean;
  createdAt: string;
  clientTempId?: string;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    senderFirstName: string;
    senderLastName: string;
  };
};

export async function publishMessageNew(payload: MessageNewPayload): Promise<void> {
  await publishCommEvent({ type: 'message:new', payload });
}
