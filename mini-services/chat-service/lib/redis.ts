import Redis from 'ioredis';

const CHANNEL = process.env.COMM_REDIS_CHANNEL || 'comm:events';

let subscriber: Redis | null = null;

export type CommEventHandler = (type: string, payload: Record<string, unknown>) => void;

export async function startCommRedisSubscriber(onEvent: CommEventHandler): Promise<void> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    console.warn('[chat-service] REDIS_URL not set — REST fanout disabled');
    return;
  }

  subscriber = new Redis(url, { maxRetriesPerRequest: null });
  subscriber.on('error', (err) => console.warn('[chat-service] Redis sub error:', err.message));

  await subscriber.subscribe(CHANNEL);
  console.log(`[chat-service] Subscribed to Redis channel: ${CHANNEL}`);

  subscriber.on('message', (_channel, raw) => {
    try {
      const parsed = JSON.parse(raw) as { type?: string; payload?: Record<string, unknown> };
      if (parsed.type && parsed.payload) {
        onEvent(parsed.type, parsed.payload);
      }
    } catch (e) {
      console.warn('[chat-service] Invalid Redis message:', e);
    }
  });
}

export async function stopCommRedisSubscriber(): Promise<void> {
  if (subscriber) {
    await subscriber.quit().catch(() => {});
    subscriber = null;
  }
}
