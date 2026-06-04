import { db } from '@/lib/db';
import type { BusinessMemberRole, BusinessMemberStatus } from '@prisma/client';

export type BusinessTeamAccess = {
  profileId: string;
  userId: string;
  role: BusinessMemberRole;
  status: BusinessMemberStatus;
  isOwner: boolean;
  canManageTeam: boolean;
  canManageContacts: boolean;
};

export async function getOwnedBusinessProfile(userId: string) {
  return db.businessProfile.findUnique({ where: { userId } });
}

export async function getBusinessTeamAccess(
  profileId: string,
  userId: string
): Promise<BusinessTeamAccess | null> {
  const member = await db.businessMember.findUnique({
    where: { profileId_userId: { profileId, userId } },
  });
  if (!member || member.status === 'REMOVED') return null;

  const isOwner = member.role === 'OWNER';
  const canManageTeam = isOwner;
  const canManageContacts = isOwner || member.role === 'MANAGER';

  return {
    profileId,
    userId,
    role: member.role,
    status: member.status,
    isOwner,
    canManageTeam,
    canManageContacts,
  };
}

export async function requireOwnedOrMemberProfile(userId: string) {
  const owned = await getOwnedBusinessProfile(userId);
  if (owned) {
    await ensureOwnerMembership(owned.id, userId);
    return owned;
  }

  const membership = await db.businessMember.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: { profile: true },
    orderBy: { joinedAt: 'asc' },
  });
  return membership?.profile ?? null;
}

async function ensureOwnerMembership(profileId: string, userId: string) {
  const member = await db.businessMember.findUnique({
    where: { profileId_userId: { profileId, userId } },
  });
  if (!member) {
    await db.businessMember.create({
      data: { profileId, userId, role: 'OWNER', status: 'ACTIVE' },
    });
  } else if (member.role !== 'OWNER') {
    await db.businessMember.update({
      where: { id: member.id },
      data: { role: 'OWNER', status: 'ACTIVE' },
    });
  }
}

export async function assertActiveAssignee(profileId: string, assigneeUserId: string) {
  const member = await db.businessMember.findUnique({
    where: { profileId_userId: { profileId, userId: assigneeUserId } },
  });
  return member?.status === 'ACTIVE';
}
