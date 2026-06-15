import crypto from 'crypto';
import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { devAuthFallbackEnabled, devGetUserByToken, isDevAuthToken } from '@/lib/auth/dev-phone-auth';

export interface AuthUser {
  id: string;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  role: 'CLIENT' | 'SPECIALIST' | 'ADMIN' | 'SUPER_ADMIN';
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: Date;
}

/**
 * Extract the authenticated user from a request's Authorization header.
 * Looks up the token in the AuthToken table and returns the associated user.
 * Returns null if no valid token/user is found.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return null;
    }

    if (isDevAuthToken(token) && devAuthFallbackEnabled()) {
      const devUser = devGetUserByToken(token);
      if (devUser) {
        return {
          id: devUser.id,
          email: devUser.email ?? `${devUser.phone}@needfinder.local`,
          phone: devUser.phone ?? null,
          phoneVerified: true,
          firstName: devUser.firstName ?? 'کاربر',
          lastName: devUser.lastName ?? 'تست',
          displayName: devUser.displayName ?? null,
          avatar: devUser.avatar ?? null,
          bio: devUser.bio ?? null,
          city: devUser.city ?? null,
          province: devUser.province ?? null,
          role: (devUser.role ?? 'CLIENT') as AuthUser['role'],
          isVerified: devUser.isVerified ?? true,
          isActive: devUser.isActive ?? true,
          isBanned: false,
          createdAt: new Date(devUser.createdAt ?? Date.now()),
        };
      }
      return null;
    }

    const authToken = await db.authToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!authToken) {
      return null;
    }

    // Check if token is expired
    if (authToken.expiresAt < new Date()) {
      // Clean up expired token
      await db.authToken.delete({ where: { id: authToken.id } });
      return null;
    }

    const user = authToken.user;

    // Check if user is active and not banned
    if (!user.isActive || user.isBanned) {
      return null;
    }

    // Touch last seen only — online is owned by chat-service socket presence.
    await db.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      phoneVerified: user.phoneVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      city: user.city,
      province: user.province,
      role: user.role as AuthUser['role'],
      isVerified: user.isVerified,
      isActive: user.isActive,
      isBanned: user.isBanned,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to create a slug from Persian/English text.
 */
export function createSlug(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Helper to generate a random token string.
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper to create a date N days from now.
 */
export function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Standard paginated response shape.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
