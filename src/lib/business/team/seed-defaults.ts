import { db } from '@/lib/db';

/** Ensure owner membership + default «مدیریت» contact point (idempotent). */
export async function seedBusinessTeamDefaults(profileId: string, ownerUserId: string) {
  const existingMember = await db.businessMember.findUnique({
    where: { profileId_userId: { profileId, userId: ownerUserId } },
  });
  if (!existingMember) {
    await db.businessMember.create({
      data: {
        profileId,
        userId: ownerUserId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  const defaultContact = await db.businessContactPoint.findFirst({
    where: { profileId, isDefault: true },
  });
  if (!defaultContact) {
    const profile = await db.businessProfile.findUnique({
      where: { id: profileId },
      select: { chatEnabled: true },
    });
    await db.businessContactPoint.create({
      data: {
        profileId,
        label: 'مدیریت',
        slug: 'management',
        assignedUserId: ownerUserId,
        chatEnabled: profile?.chatEnabled ?? true,
        voiceEnabled: true,
        isDefault: true,
        sortOrder: 0,
        isPublished: true,
      },
    });
  }
}
