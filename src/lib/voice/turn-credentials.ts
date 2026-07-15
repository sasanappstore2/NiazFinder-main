import crypto from 'crypto';

export function generateTurnCredentials(
  userId: string,
  secret: string,
  ttlSec = 86400
): { username: string; credential: string } {
  const epoch = Math.floor(Date.now() / 1000) + ttlSec;
  const username = `${epoch}:${userId}`;
  const credential = crypto
    .createHmac('sha1', secret)
    .update(username)
    .digest('base64');
  return { username, credential };
}

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export function buildIceServersFromEnv(userId: string): IceServerConfig[] {
  const turnHost = process.env.NEXT_PUBLIC_TURN_HOST || process.env.TURN_HOST;
  const stunFromEnv =
    process.env.NEXT_PUBLIC_STUN_URLS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

  const stun =
    stunFromEnv.length > 0
      ? stunFromEnv
      : turnHost
        ? [`stun:${turnHost}:3478`]
        : ['stun:stun.l.google.com:19302'];

  const turnSecret = process.env.TURN_STATIC_AUTH_SECRET;
  const relayOnly = process.env.NEXT_PUBLIC_VOICE_RELAY_ONLY === 'true';

  const servers: IceServerConfig[] = stun.map((urls) => ({ urls }));

  if (turnHost && turnSecret) {
    const { username, credential } = generateTurnCredentials(userId, turnSecret);
    servers.push({
      urls: [
        `turns:${turnHost}:443?transport=tcp`,
        `turn:${turnHost}:443?transport=tcp`,
      ],
      username,
      credential,
    });
  }

  if (relayOnly && servers.length > 1) {
    return servers.slice(-1);
  }

  return servers;
}
