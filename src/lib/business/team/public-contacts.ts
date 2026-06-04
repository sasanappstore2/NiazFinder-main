import { db } from '@/lib/db';

export type PublicContactPoint = {
  id: string;
  label: string;
  description: string | null;
  slug: string;
  chatEnabled: boolean;
  voiceEnabled: boolean;
  assignee: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    online: boolean;
    displayName: string;
  };
};

export type PublicBusinessContacts = {
  business: { id: string; name: string; slug: string; logo: string | null };
  contactPoints: PublicContactPoint[];
  defaultContactPointId: string | null;
  chatDisabledMessage?: string;
};

export async function loadPublicContactPointsBySlug(
  slug: string
): Promise<PublicBusinessContacts | null> {
  const profile = await db.businessProfile.findFirst({
    where: { slug, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      chatEnabled: true,
      userId: true,
    },
  });

  if (!profile) return null;

  if (!profile.chatEnabled) {
    return {
      business: {
        id: profile.id,
        name: profile.name,
        slug: profile.slug,
        logo: profile.logo,
      },
      contactPoints: [],
      defaultContactPointId: null,
      chatDisabledMessage: 'چت برای این کسب‌وکار غیرفعال است',
    };
  }

  const points = await db.businessContactPoint.findMany({
    where: {
      profileId: profile.id,
      isPublished: true,
      chatEnabled: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          online: true,
        },
      },
    },
  });

  const activeMemberIds = new Set(
    (
      await db.businessMember.findMany({
        where: { profileId: profile.id, status: 'ACTIVE' },
        select: { userId: true },
      })
    ).map((m) => m.userId)
  );

  const contactPoints: PublicContactPoint[] = points
    .filter((p) => activeMemberIds.has(p.assignedUserId))
    .map((p) => {
      const u = p.assignedUser;
      const displayName =
        p.displayName?.trim() ||
        u.displayName?.trim() ||
        `${u.firstName} ${u.lastName}`.trim() ||
        'کارشناس';
      return {
        id: p.id,
        label: p.label,
        description: p.description,
        slug: p.slug,
        chatEnabled: p.chatEnabled,
        voiceEnabled: p.voiceEnabled,
        assignee: {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          avatar: p.avatar ?? u.avatar,
          online: u.online,
          displayName,
        },
      };
    });

  const defaultRaw = points.find((p) => p.isDefault && activeMemberIds.has(p.assignedUserId));
  const defaultPoint =
    (defaultRaw && contactPoints.find((p) => p.id === defaultRaw.id)) ??
    contactPoints[0] ??
    null;

  return {
    business: {
      id: profile.id,
      name: profile.name,
      slug: profile.slug,
      logo: profile.logo,
    },
    contactPoints,
    defaultContactPointId: defaultPoint?.id ?? null,
  };
}

export async function validateContactPointForChat(
  contactPointId: string,
  otherUserId: string,
  businessProfileId?: string
) {
  const point = await db.businessContactPoint.findUnique({
    where: { id: contactPointId },
    include: {
      profile: { select: { id: true, name: true, chatEnabled: true, slug: true, logo: true } },
    },
  });
  if (!point || !point.isPublished || !point.chatEnabled) return null;
  if (businessProfileId && point.profileId !== businessProfileId) return null;
  if (point.assignedUserId !== otherUserId) return null;
  if (!point.profile.chatEnabled) return null;

  const member = await db.businessMember.findUnique({
    where: {
      profileId_userId: { profileId: point.profileId, userId: otherUserId },
    },
  });
  if (!member || member.status !== 'ACTIVE') return null;

  return point;
}
