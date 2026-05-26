import { db } from '@/lib/db';
import crypto from 'crypto';

const PLATFORM_AI_EMAIL = 'platform-ai@needfinder.internal';

function simpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + '_needfinder_salt').digest('hex');
}

/** Resolve platform AI user id from env or DB (auto-create in dev). */
export async function getPlatformAiUserId(): Promise<string> {
  const fromEnv = process.env.PLATFORM_AI_USER_ID?.trim();
  if (fromEnv) return fromEnv;

  const existing = await db.user.findUnique({
    where: { email: PLATFORM_AI_EMAIL },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await db.user.create({
    data: {
      email: PLATFORM_AI_EMAIL,
      password: simpleHash(crypto.randomBytes(32).toString('hex')),
      firstName: 'هوش',
      lastName: 'مصنوعی',
      displayName: 'هوش مصنوعی نیازفایندر',
      role: 'ADMIN',
      isVerified: true,
      isActive: true,
      emailVerified: true,
    },
    select: { id: true },
  });

  return created.id;
}

export async function getPlatformAiUser() {
  const id = await getPlatformAiUserId();
  return db.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatar: true,
      online: true,
    },
  });
}
