import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureBusinessProfile(user);
    const locations = await db.businessLocation.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    });
    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Business locations GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const profile = await ensureBusinessProfile(auth.user);
    const body = await request.json().catch(() => ({}));
    const label = String(body.label ?? '').trim();
    const city = String(body.city ?? '').trim();
    if (!label || !city) {
      return NextResponse.json({ error: 'برچسب و شهر الزامی است' }, { status: 400 });
    }

    const count = await db.businessLocation.count({ where: { profileId: profile.id } });
    const isPrimary = Boolean(body.isPrimary) || count === 0;

    if (isPrimary) {
      await db.businessLocation.updateMany({
        where: { profileId: profile.id },
        data: { isPrimary: false },
      });
    }

    const location = await db.businessLocation.create({
      data: {
        profileId: profile.id,
        label,
        city,
        province: body.province ? String(body.province) : null,
        address: body.address ? String(body.address) : null,
        lat: typeof body.lat === 'number' ? body.lat : null,
        lng: typeof body.lng === 'number' ? body.lng : null,
        isPrimary,
        sortOrder: count,
        isPublished: body.isPublished !== false,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error('Business locations POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
