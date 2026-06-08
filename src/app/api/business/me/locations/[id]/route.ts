import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const profile = await ensureBusinessProfile(auth.user);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const existing = await db.businessLocation.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    if (body.isPrimary) {
      await db.businessLocation.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });
    }

    const location = await db.businessLocation.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: String(body.label) } : {}),
        ...(body.city !== undefined ? { city: String(body.city) } : {}),
        ...(body.province !== undefined ? { province: body.province ? String(body.province) : null } : {}),
        ...(body.address !== undefined ? { address: body.address ? String(body.address) : null } : {}),
        ...(body.lat === null || body.lat === ''
          ? { lat: null }
          : body.lat !== undefined
            ? { lat: Number(body.lat) }
            : {}),
        ...(body.lng === null || body.lng === ''
          ? { lng: null }
          : body.lng !== undefined
            ? { lng: Number(body.lng) }
            : {}),
        ...(body.isPrimary !== undefined ? { isPrimary: Boolean(body.isPrimary) } : {}),
        ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error('Business location PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const profile = await ensureBusinessProfile(auth.user);
    const { id } = await params;
    const existing = await db.businessLocation.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });
    await db.businessLocation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Business location DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
