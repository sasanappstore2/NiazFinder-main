import { db } from '@/lib/db';
import { queueBusinessRagIndex } from '@/lib/rag/queue';
import {
  queueBusinessProfileTypesenseSync,
  syncBusinessProfileToTypesense,
} from '@/lib/search/typesense-sync';

/**
 * Unified search sync for businesses: Typesense (keyword) + RAG embedding job (vector).
 * Call after BusinessProfile create/update/moderation/user-status changes.
 */
export function queueBusinessProfileSearchSync(profileId: string): void {
  queueBusinessProfileTypesenseSync(profileId);
  queueBusinessRagIndex(profileId, 'UPSERT');
}

export function queueBusinessProfileSearchSyncByUserId(userId: string): void {
  void (async () => {
    const profile = await db.businessProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return;
    queueBusinessProfileSearchSync(profile.id);
  })().catch((err) => console.warn('[rag] business sync by user failed', userId, err));
}

export async function syncBusinessProfileSearch(profileId: string): Promise<void> {
  await syncBusinessProfileToTypesense(profileId);
  queueBusinessRagIndex(profileId, 'UPSERT');
}
