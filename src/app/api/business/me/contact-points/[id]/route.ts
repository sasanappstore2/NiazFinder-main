import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessAccess } from '@/lib/business/require-business-access';
import { loadMyBusinessProfile } from '@/lib/business/load-my-business-profile';
import {
  getBusinessTeamAccess,
  assertActiveAssignee,
} from '@/lib/business/team/access';
import { contactPointSlugFromLabel, uniqueContactSlug } from '@/lib/business/team/slugify-contact';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const { id } = await params;
  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageContacts) {
    return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
  }

  const existing = await db.businessContactPoint.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'مخاطب یافت نشد' }, { status: 404 });
  }

  const body = await request.json();
  const data: Record<string, unknown> = {};

  if (body.label !== undefined) {
    const label = String(body.label).trim();
    if (label.length < 2) {
      return NextResponse.json({ error: 'عنوان مخاطب نامعتبر است' }, { status: 400 });
    }
    data.label = label;
    if (!existing.isDefault && body.slug === undefined) {
      data.slug = await uniqueContactSlug(
        profile.id,
        contactPointSlugFromLabel(label),
        id
      );
    }
  }

  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.displayName !== undefined) data.displayName = body.displayName?.trim() || null;
  if (body.avatar !== undefined) data.avatar = body.avatar?.trim() || null;
  if (body.chatEnabled !== undefined) data.chatEnabled = Boolean(body.chatEnabled);
  if (body.voiceEnabled !== undefined) data.voiceEnabled = Boolean(body.voiceEnabled);
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);

  if (body.assignedUserId !== undefined) {
    const assignedUserId = String(body.assignedUserId).trim();
    const isActive = await assertActiveAssignee(profile.id, assignedUserId);
    if (!isActive) {
      return NextResponse.json(
        { error: 'فقط اعضای فعال تیم قابل انتساب هستند' },
        { status: 400 }
      );
    }
    data.assignedUserId = assignedUserId;
  }

  const updated = await db.businessContactPoint.update({
    where: { id },
    data,
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

  return NextResponse.json({ contactPoint: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireBusinessAccess(request);
  if ('error' in access) return access.error;

  const { id } = await params;
  const profile = await loadMyBusinessProfile(access.user);
  const teamAccess = await getBusinessTeamAccess(profile.id, access.user.id);
  if (!teamAccess?.canManageContacts) {
    return NextResponse.json({ error: 'دسترسی مجاز نیست' }, { status: 403 });
  }

  const existing = await db.businessContactPoint.findFirst({
    where: { id, profileId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'مخاطب یافت نشد' }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json(
      { error: 'مخاطب پیش‌فرض قابل حذف نیست' },
      { status: 400 }
    );
  }

  await db.businessContactPoint.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
