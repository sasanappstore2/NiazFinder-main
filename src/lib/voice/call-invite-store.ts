import 'server-only';

const INVITE_TTL_SEC = 120;

let redis: import('ioredis').default | null = null;

async function getRedis(): Promise<import('ioredis').default | null> {
  if (redis) return redis;
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(url, { maxRetriesPerRequest: 1, lazyConnect: true });
    await redis.connect();
    return redis;
  } catch {
    redis = null;
    return null;
  }
}

function inviteKey(callId: string): string {
  return `voice:call:invite:${callId}`;
}

export async function storeCallInvite(
  callId: string,
  sdpOffer: RTCSessionDescriptionInit
): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    await client.set(
      inviteKey(callId),
      JSON.stringify(sdpOffer),
      'EX',
      INVITE_TTL_SEC
    );
  } catch (e) {
    console.warn('[voice] storeCallInvite failed:', e);
  }
}

export async function getCallInvite(
  callId: string
): Promise<RTCSessionDescriptionInit | null> {
  const client = await getRedis();
  if (!client) return null;
  try {
    const raw = await client.get(inviteKey(callId));
    if (!raw) return null;
    return JSON.parse(raw) as RTCSessionDescriptionInit;
  } catch {
    return null;
  }
}

export async function clearCallInvite(callId: string): Promise<void> {
  const client = await getRedis();
  if (!client) return;
  try {
    await client.del(inviteKey(callId));
  } catch {
    /* ignore */
  }
}
