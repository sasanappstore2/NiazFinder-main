import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/super-admin';
import type { BusinessMemberRole } from '@prisma/client';

/** Accept pending business invites matching the user's phone (after login/register). */
export async function acceptBusinessInvitesForUser(userId: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const now = new Date();

  const invites = await db.businessMemberInvite.findMany({
    where: {
      phone: normalizedPhone,
      status: 'PENDING',
      expiresAt: { gt: now },
    },
  });

  for (const invite of invites) {
    const existing = await db.businessMember.findUnique({
      where: { profileId_userId: { profileId: invite.profileId, userId } },
    });

    if (existing?.status === 'ACTIVE') {
      await db.businessMemberInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED', acceptedUserId: userId },
      });
      continue;
    }

    if (existing) {
      await db.businessMember.update({
        where: { id: existing.id },
        data: { role: invite.role, status: 'ACTIVE', invitedByUserId: invite.invitedByUserId },
      });
    } else {
      await db.businessMember.create({
        data: {
          profileId: invite.profileId,
          userId,
          role: invite.role as BusinessMemberRole,
          status: 'ACTIVE',
          invitedByUserId: invite.invitedByUserId,
        },
      });
    }

    await db.businessMemberInvite.update({
      where: { id: invite.id },
      data: { status: 'ACCEPTED', acceptedUserId: userId },
    });
  }
}
