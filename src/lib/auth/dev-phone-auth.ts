import crypto from 'crypto';
import { isTestOtpMode } from '@/lib/auth/test-otp';
import type { User } from '@/lib/types';

const DEV_TOKEN_PREFIX = 'dev_';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const usersByPhone = new Map<string, User>();
const tokens = new Map<string, { userId: string; expiresAt: number }>();

/** In-memory phone auth when Postgres is down (local test OTP only). */
export function devAuthFallbackEnabled(): boolean {
  return isTestOtpMode();
}

function devUserId(phone: string): string {
  return `dev-user-${phone}`;
}

function buildDevUser(phone: string): User {
  return {
    id: devUserId(phone),
    phone,
    email: `${phone}@needfinder.local`,
    firstName: 'کاربر',
    lastName: 'تست',
    displayName: 'کاربر تست',
    role: 'CLIENT',
    isVerified: true,
    phoneVerified: true,
    isActive: true,
    online: true,
    rating: 0,
    projectCount: 0,
    completionRate: 0,
    responseRate: 0,
    createdAt: new Date().toISOString(),
  };
}

export function devUserExists(phone: string): boolean {
  return usersByPhone.has(phone);
}

export function devUserHasPassword(_phone: string): boolean {
  return false;
}

export function devIssueAuth(phone: string, isNewUser: boolean): { user: User; token: string } {
  let user = usersByPhone.get(phone);
  if (!user || isNewUser) {
    user = buildDevUser(phone);
    usersByPhone.set(phone, user);
  }
  const token = `${DEV_TOKEN_PREFIX}${crypto.randomBytes(24).toString('hex')}`;
  tokens.set(token, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL_MS });
  return { user, token };
}

export function devGetUserByToken(token: string): User | null {
  if (!token.startsWith(DEV_TOKEN_PREFIX)) return null;
  const record = tokens.get(token);
  if (!record || record.expiresAt < Date.now()) {
    tokens.delete(token);
    return null;
  }
  for (const user of usersByPhone.values()) {
    if (user.id === record.userId) return user;
  }
  return null;
}

export function isDevAuthToken(token: string): boolean {
  return token.startsWith(DEV_TOKEN_PREFIX);
}
