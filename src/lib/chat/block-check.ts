import { db } from '@/lib/db';

export async function isBlockedEitherWay(
  userIdA: string,
  userIdB: string
): Promise<boolean> {
  if (typeof db.userBlock?.findFirst !== 'function') {
    return true;
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
