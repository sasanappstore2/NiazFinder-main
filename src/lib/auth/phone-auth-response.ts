import { db } from '@/lib/db';
import { generateToken, daysFromNow } from '@/lib/auth';
import type { User } from '@/lib/types';

type DbUser = Awaited<ReturnType<typeof db.user.findUnique>> & object;

export function mapDbUserToResponse(user: NonNullable<DbUser>): User {
  return {
    id: user.id,
    phone: user.phone ?? undefined,
    username: user.username ?? undefined,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName ?? undefined,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    city: user.city ?? undefined,
    province: user.province ?? undefined,
    role: user.role as User['role'],
    isVerified: user.isVerified,
    isActive: user.isActive,
    online: true,
    rating: 0,
    projectCount: 0,
    completionRate: 0,
    responseRate: 0,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function issueAuthToken(userId: string): Promise<string> {
  const token = generateToken();
  await db.authToken.create({
    data: {
      userId,
      token,
      type: 'auth',
      expiresAt: daysFromNow(30),
    },
  });
  await db.user.update({
    where: { id: userId },
    data: { lastSeenAt: new Date(), online: true },
  });
  return token;
}
