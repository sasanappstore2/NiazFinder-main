import { rm } from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { deleteBusinessProfileDocument } from '@/lib/search/typesense-business-index';
import { typesenseEnabled } from '@/lib/search/typesense-client';

export type DeleteBusinessProfileResult =
  | { ok: true; profileId: string }
  | { ok: false; error: string; status: number };

/**
 * Permanently delete a business profile and detach loose references.
 * Only the profile owner (`profile.userId`) may invoke this.
 */
export async function deleteBusinessProfileComplete(
  profileId: string,
  ownerUserId: string
): Promise<DeleteBusinessProfileResult> {
  const profile = await db.businessProfile.findUnique({
    where: { id: profileId },
    select: { id: true, userId: true, name: true, slug: true },
  });

  if (!profile) {
    return { ok: false, error: 'پروفایل کسب‌وکار یافت نشد', status: 404 };
  }

  if (profile.userId !== ownerUserId) {
    return { ok: false, error: 'فقط مالک حساب می‌تواند کسب‌وکار را حذف کند', status: 403 };
  }

  await db.$transaction(async (tx) => {
    await tx.serviceRequest.updateMany({
      where: { businessProfileId: profileId },
      data: { businessProfileId: null },
    });

    await tx.serviceRequest.updateMany({
      where: { resolvedBusinessProfileId: profileId },
      data: { resolvedBusinessProfileId: null },
    });

    await tx.serviceRequest.updateMany({
      where: { pendingVerificationBusinessProfileId: profileId },
      data: { pendingVerificationBusinessProfileId: null },
    });

    await tx.conversation.updateMany({
      where: { businessProfileId: profileId },
      data: { businessProfileId: null },
    });

    await tx.review.updateMany({
      where: { businessProfileId: profileId },
      data: { businessProfileId: null },
    });

    await tx.businessProfile.delete({ where: { id: profileId } });
  });

  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'business', profileId);
  await rm(uploadDir, { recursive: true, force: true }).catch(() => undefined);

  if (typesenseEnabled()) {
    await deleteBusinessProfileDocument(profileId).catch((err) => {
      console.warn('[typesense] profile delete failed', profileId, err);
    });
  }

  return { ok: true, profileId };
}
