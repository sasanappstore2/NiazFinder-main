import { db } from '@/lib/db';

/**
 * Returns true if either user has blocked the other.
 * Fail-open when UserBlock model is unavailable (avoids blocking all chat
 * for clients with a stale Prisma generate).
 */
export async function isBlockedEitherWay(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  if (typeof db.userBlock?.findFirst !== 'function') {
    console.warn('[block-check] userBlock model missing — allowing chat');
    return false;
  }
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
  });
  return Boolean(block);
}
