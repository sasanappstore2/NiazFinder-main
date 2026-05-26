import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';

export const runtime = 'nodejs';

const CTA_REVERSE: Record<string, string> = {
  book: 'BOOK',
  quote: 'QUOTE',
  call: 'CALL',
  chat: 'CHAT',
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const offers = await db.businessOffer.findMany({
      where: { profileId: profile.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      offers: offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        priceRange: o.priceRange,
        duration: o.duration,
        images: parseJsonArray<string>(o.images),
        features: parseJsonArray<string>(o.features),
        ctaType: o.ctaType.toLowerCase(),
        order: o.order,
        isPublished: o.isPublished,
      })),
    });
  } catch (error) {
    console.error('Business offers GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    if (!title || !description) {
      return NextResponse.json({ error: 'عنوان و توضیحات الزامی است' }, { status: 400 });
    }

    const profile = await ensureBusinessProfile(user);
    const count = await db.businessOffer.count({ where: { profileId: profile.id } });

    const offer = await db.businessOffer.create({
      data: {
        profileId: profile.id,
        title,
        description,
        priceRange: body.priceRange ?? null,
        duration: body.duration ?? null,
        images: toJson(body.images ?? []),
        features: toJson(body.features ?? []),
        faq: toJson([]),
        ctaType: (CTA_REVERSE[body.ctaType as string] ?? 'CHAT') as 'CHAT',
        order: count,
      },
    });

    return NextResponse.json({ id: offer.id, message: 'ذخیره شد' }, { status: 201 });
  } catch (error) {
    console.error('Business offers POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
