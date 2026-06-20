import { db } from '@/lib/db';

/** Bookmarks with type `specialist` are business stars (target = business userId). */
export const BUSINESS_STAR_BOOKMARK_TYPE = 'specialist' as const;

export async function countBusinessStars(businessUserId: string): Promise<number> {
  return db.bookmark.count({
    where: {
      type: BUSINESS_STAR_BOOKMARK_TYPE,
      targetId: businessUserId,
    },
  });
}

/** Keep `BusinessProfile.saveCount` aligned with live star count. */
export async function syncBusinessSaveCount(businessUserId: string): Promise<number> {
  const count = await countBusinessStars(businessUserId);
  await db.businessProfile.updateMany({
    where: { userId: businessUserId },
    data: { saveCount: count },
  });
  return count;
}
