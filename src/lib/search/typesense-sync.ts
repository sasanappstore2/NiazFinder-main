import { db } from '@/lib/db';
import { isPublicBusinessProfile } from '@/lib/business/load-profile';
import {
  businessProfileToTypesenseDocument,
  deleteBusinessProfileDocument,
  isIndexableBusinessProfile,
  upsertBusinessProfileDocuments,
} from '@/lib/search/typesense-business-index';
import { typesenseEnabled } from '@/lib/search/typesense-client';

const profileSelect = {
  id: true,
  userId: true,
  name: true,
  slug: true,
  logo: true,
  description: true,
  categorySlugs: true,
  tags: true,
  city: true,
  province: true,
  lat: true,
  lng: true,
  status: true,
  rating: true,
  reviewCount: true,
  verified: true,
  viewCount: true,
  createdAt: true,
  extensions: true,
  user: {
    select: {
      isActive: true,
      isVerified: true,
      avatar: true,
      online: true,
    },
  },
} as const;

/**
 * Real-time sync hook ? call after BusinessProfile create/update/delete.
 *
 * Alternative: Prisma `$extends` query middleware on `businessProfile` mutations
 * can invoke this automatically, but explicit calls keep sync scope visible.
 */
export async function syncBusinessProfileToTypesense(profileId: string): Promise<void> {
  if (!typesenseEnabled()) return;

  const profile = await db.businessProfile.findUnique({
    where: { id: profileId },
    select: profileSelect,
  });

  if (!profile || !isIndexableBusinessProfile(profile)) {
    await deleteBusinessProfileDocument(profileId);
    return;
  }

  if (!isPublicBusinessProfile(profile)) {
    await deleteBusinessProfileDocument(profileId);
    return;
  }

  await upsertBusinessProfileDocuments([businessProfileToTypesenseDocument(profile)]);
}

/** Fire-and-forget wrapper for API routes ? never blocks the response. */
export function queueBusinessProfileTypesenseSync(profileId: string): void {
  if (!typesenseEnabled()) return;
  void syncBusinessProfileToTypesense(profileId).catch((err) => {
    console.warn('[typesense] profile sync failed', profileId, err);
  });
}

export async function syncBusinessProfileByUserId(userId: string): Promise<void> {
  const profile = await db.businessProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) return;
  await syncBusinessProfileToTypesense(profile.id);
}

export function queueBusinessProfileTypesenseSyncByUserId(userId: string): void {
  if (!typesenseEnabled()) return;
  void syncBusinessProfileByUserId(userId).catch((err) => {
    console.warn('[typesense] profile sync by user failed', userId, err);
  });
}
