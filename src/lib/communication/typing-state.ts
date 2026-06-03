const TYPING_TTL_SEC = 3;

export type StoredTypingState = {
  userId: string;
  firstName: string;
  lastName: string;
  isTyping: boolean;
  updatedAt: number;
};

function typingKey(conversationId: string): string {
  return `comm:typing:${conversationId}`;
}

async function getRedis(): Promise<import('ioredis').default | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const Redis = (await import('ioredis')).default;
    const client = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    if (client.status !== 'ready') await client.connect();
    return client;
  } catch {
    return null;
  }
}

/** In-process fallback when Redis is unavailable (single dev server). */
const memoryTyping = new Map<string, StoredTypingState>();

export async function setConversationTypingState(
  conversationId: string,
  state: StoredTypingState | null
): Promise<void> {
  if (!state || !state.isTyping) {
    memoryTyping.delete(conversationId);
    const redis = await getRedis();
    if (redis) {
      await redis.del(typingKey(conversationId)).catch(() => {});
      redis.disconnect();
    }
    return;
  }

  memoryTyping.set(conversationId, state);
  const redis = await getRedis();
  if (redis) {
    await redis
      .set(typingKey(conversationId), JSON.stringify(state), 'EX', TYPING_TTL_SEC)
      .catch(() => {});
    redis.disconnect();
  }
}

export async function getConversationTypingState(
  conversationId: string
): Promise<StoredTypingState | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      const raw = await redis.get(typingKey(conversationId));
      redis.disconnect();
      if (raw) {
        const parsed = JSON.parse(raw) as StoredTypingState;
        if (parsed.isTyping && Date.now() - parsed.updatedAt < TYPING_TTL_SEC * 1000) {
          return parsed;
        }
      }
    } catch {
      redis.disconnect();
    }
  }

  const mem = memoryTyping.get(conversationId);
  if (!mem?.isTyping) return null;
  if (Date.now() - mem.updatedAt > TYPING_TTL_SEC * 1000) {
    memoryTyping.delete(conversationId);
    return null;
  }
  return mem;
}

export type ActiveTypingEntry = {
  conversationId: string;
  userId: string;
  displayName: string;
};

/** All active typing sessions for the given conversation ids (in-memory; dev/single-node). */
export function listActiveTypingForConversations(
  conversationIds: string[]
): ActiveTypingEntry[] {
  const now = Date.now();
  const idSet = new Set(conversationIds);
  const out: ActiveTypingEntry[] = [];

  for (const [conversationId, state] of memoryTyping.entries()) {
    if (!idSet.has(conversationId)) continue;
    if (!state.isTyping || now - state.updatedAt > TYPING_TTL_SEC * 1000) {
      continue;
    }
    out.push({
      conversationId,
      userId: state.userId,
      displayName: `${state.firstName} ${state.lastName}`.trim(),
    });
  }

  return out;
}
