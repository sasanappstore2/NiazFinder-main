import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import { getBusinessTeamAccess } from '@/lib/business/team/access';
import {
  MAX_BUSINESS_MEMBERS,
  BUSINESS_INVITE_TTL_DAYS,
} from '@/lib/business/team/constants';
import { normalizePhone } from '@/lib/super-admin';
import type { BusinessMemberRole } from '@prisma/client';

const ALLOWED_ROLES: BusinessMemberRole[] = ['MANAGER', 'STAFF'];

export async function GET(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess) {
    return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
  }

  const [members, invites] = await Promise.all([
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

  return NextResponse.json({ members, invites, teamAccess });
}

export async function POST(request: NextRequest) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageTeam) {
    return NextResponse.json({ error: 'فقط مالک می‌تواند دعوت کند' }, { status: 403 });
  }

  const activeCount = await db.businessMember.count({
    where: { profileId: profile.id, status: 'ACTIVE' },
  });
  const pendingInvites = await db.businessMemberInvite.count({
    where: { profileId: profile.id, status: 'PENDING' },
  });
  if (activeCount + pendingInvites >= MAX_BUSINESS_MEMBERS) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_BUSINESS_MEMBERS} عضو مجاز است` },
      { status: 400 }
    );
  }

  const body = await request.json();
  const phone = normalizePhone(String(body.phone ?? ''));
  const role = (body.role ?? 'STAFF') as BusinessMemberRole;
  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: 'شماره موبایل نامعتبر است' }, { status: 400 });
  }
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'نقش نامعتبر است' }, { status: 400 });
  }

  const existingUser = await db.user.findUnique({ where: { phone } });
  if (existingUser) {
    const member = await db.businessMember.findUnique({
      where: { profileId_userId: { profileId: profile.id, userId: existingUser.id } },
    });
    if (member?.status === 'ACTIVE') {
      return NextResponse.json({ error: 'این کاربر قبلاً عضو تیم است' }, { status: 400 });
    }
    if (member?.status === 'REMOVED') {
      await db.businessMember.update({
        where: { id: member.id },
        data: { role, status: 'ACTIVE', invitedByUserId: access.user.id },
      });
      return NextResponse.json({ member: member.id, reactivated: true });
    }
    await db.businessMember.create({
      data: {
        profileId: profile.id,
        userId: existingUser.id,
        role,
        status: 'ACTIVE',
        invitedByUserId: access.user.id,
      },
    });
    return NextResponse.json({ added: true, userId: existingUser.id });
  }

  const pending = await db.businessMemberInvite.findFirst({
    where: { profileId: profile.id, phone, status: 'PENDING' },
  });
  if (pending) {
    return NextResponse.json({ error: 'دعوت قبلی برای این شماره در انتظار است' }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + BUSINESS_INVITE_TTL_DAYS);
  const token = randomBytes(24).toString('hex');

  const invite = await db.businessMemberInvite.create({
    data: {
      profileId: profile.id,
      phone,
      role,
      token,
      expiresAt,
      invitedByUserId: access.user.id,
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}
