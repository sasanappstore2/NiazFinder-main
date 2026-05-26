import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const needs = await db.serviceRequest.findMany({
      where: { businessProfileId: profile.id, status: { not: 'CANCELLED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        moderationStatus: true,
        createdAt: true,
        city: true,
      },
    });

    return NextResponse.json({
      needs: needs.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
    });
  } catch (error) {
    console.error('Business me needs GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const needId = body.needId as string | undefined;
    if (!needId) return NextResponse.json({ error: 'شناسه نیاز الزامی است' }, { status: 400 });

    const profile = await ensureBusinessProfile(user);
    const need = await db.serviceRequest.findFirst({
      where: { id: needId, businessProfileId: profile.id },
    });
    if (!need) return NextResponse.json({ error: 'نیاز یافت نشد' }, { status: 404 });

    await db.serviceRequest.update({
      where: { id: needId },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ message: 'نیاز حذف شد' });
  } catch (error) {
    console.error('Business me needs DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
