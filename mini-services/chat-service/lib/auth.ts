import { db } from './prisma';

export interface SocketAuthUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export async function resolveUserFromSocketAuth(auth: {
  token?: unknown;
  userId?: unknown;
}): Promise<SocketAuthUser | null> {
  const token = typeof auth.token === 'string' ? auth.token.trim() : '';
  if (token) {
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
    if (!authToken || authToken.expiresAt < new Date()) return null;
    const user = authToken.user;
    if (!user.isActive || user.isBanned) return null;
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
    };
  }

  const userId = typeof auth.userId === 'string' ? auth.userId.trim() : '';
  if (!userId) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatar: true,
      isActive: true,
      isBanned: true,
    },
  });
  if (!user || !user.isActive || user.isBanned) return null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
  };
}
