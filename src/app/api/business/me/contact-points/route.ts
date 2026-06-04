import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import {
  getBusinessTeamAccess,
  assertActiveAssignee,
} from '@/lib/business/team/access';
import {
  MAX_BUSINESS_CONTACT_POINTS,
  CONTACT_POINT_PRESETS,
} from '@/lib/business/team/constants';
import {
  contactPointSlugFromLabel,
  uniqueContactSlug,
} from '@/lib/business/team/slugify-contact';

export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageContacts) {
    return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
  }

  const [contactPoints, members, invites] = await Promise.all([
    db.businessContactPoint.findMany({
      where: { profileId: profile.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            phone: true,
          },
        },
      },
    }),
    db.businessMember.findMany({
      where: { profileId: profile.id, status: { not: 'REMOVED' } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            phone: true,
            online: true,
          },
        },
      },
      orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    }),
    db.businessMemberInvite.findMany({
      where: { profileId: profile.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    contactPoints,
    members,
    invites,
    presets: CONTACT_POINT_PRESETS,
    limits: { maxContactPoints: MAX_BUSINESS_CONTACT_POINTS },
    teamAccess,
  });
}

export async function POST(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageContacts) {
    return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
  }

  const count = await db.businessContactPoint.count({ where: { profileId: profile.id } });
  if (count >= MAX_BUSINESS_CONTACT_POINTS) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_BUSINESS_CONTACT_POINTS} مخاطب مجاز است` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const label = String(body.label ?? '').trim();
  const assignedUserId = String(body.assignedUserId ?? '').trim();
  if (!label || label.length < 2) {
    return NextResponse.json({ error: 'عنوان مخاطب الزامی است' }, { status: 400 });
  }
  if (!assignedUserId) {
    return NextResponse.json({ error: 'انتخاب عضو تیم الزامی است' }, { status: 400 });
  }

  const isActive = await assertActiveAssignee(profile.id, assignedUserId);
  if (!isActive) {
    return NextResponse.json(
      { error: 'فقط اعضای فعال تیم قابل انتساب هستند' },
      { status: 400 }
    );
  }

  const baseSlug = body.slug?.trim() || contactPointSlugFromLabel(label);
  const slug = await uniqueContactSlug(profile.id, baseSlug);
  const maxOrder = await db.businessContactPoint.aggregate({
    where: { profileId: profile.id },
    _max: { sortOrder: true },
  });

  const point = await db.businessContactPoint.create({
    data: {
      profileId: profile.id,
      label,
      slug,
      description: body.description?.trim() || null,
      assignedUserId,
      displayName: body.displayName?.trim() || null,
      avatar: body.avatar?.trim() || null,
      chatEnabled: body.chatEnabled !== false,
      voiceEnabled: body.voiceEnabled !== false,
      isPublished: body.isPublished !== false,
      isDefault: false,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
    include: {
      assignedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
        },
      },
    },
  });

  return NextResponse.json({ contactPoint: point }, { status: 201 });
}
