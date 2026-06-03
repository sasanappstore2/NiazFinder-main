import { db } from '@/lib/db';

export async function isBlockedEitherWay(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  try {
    if (typeof db.userBlock?.findFirst !== 'function') {
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
  } catch {
    return false;
  }
}
