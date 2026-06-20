import './load-env';
import { db } from './prisma';

export interface SocketAuthUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

function isDevAuthToken(token: string): boolean {
  return token.startsWith('dev_');
}

async function resolveUserViaNextApi(token: string): Promise<SocketAuthUser | null> {
  const base =
    process.env.NEXT_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://127.0.0.1:3000';
  try {
    const res = await fetch(`${base.replace(/\/$/, '')}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { user?: Record<string, unknown> };
    const user = json.user;
    if (!user || typeof user.id !== 'string') return null;
    return {
      id: user.id,
      firstName: typeof user.firstName === 'string' ? user.firstName : '',
      lastName: typeof user.lastName === 'string' ? user.lastName : '',
      avatar: typeof user.avatar === 'string' ? user.avatar : null,
    };
  } catch {
    return null;
  }
}

export async function resolveUserFromSocketAuth(auth: {
  token?: unknown;
  userId?: unknown;
}): Promise<SocketAuthUser | null> {
  const token = typeof auth.token === 'string' ? auth.token.trim() : '';
  if (!token) return null;

  try {
    const authToken = await db.authToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            isActive: true,
            isBanned: true,
          },
        },
      },
    });
    if (authToken && authToken.expiresAt >= new Date()) {
      const user = authToken.user;
      if (user.isActive && !user.isBanned) {
        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
        };
      }
    }
  } catch (err) {
    console.error('[chat-service] Auth DB lookup failed:', err);
  }

  if (isDevAuthToken(token) || process.env.NODE_ENV !== 'production') {
    return resolveUserViaNextApi(token);
  }

  return null;
}
