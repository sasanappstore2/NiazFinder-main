import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';
import { buildOfferFeaturesFromBody } from '@/lib/business/serialize-offer-payload';
import { queueBusinessProfileSearchSync } from '@/lib/rag/sync';

export const runtime = 'nodejs';

const CTA_REVERSE: Record<string, string> = {
  book: 'BOOK',
  quote: 'QUOTE',
  call: 'CALL',
  chat: 'CHAT',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessManager(request);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const profile = await ensureBusinessProfile(user);
    const existing = await db.businessOffer.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    const body = await request.json().catch(() => ({}));

    const featuresUpdate = buildOfferFeaturesFromBody(existing.features, body);

    await db.businessOffer.update({
      where: { id },
      data: {
        ...(body.title != null ? { title: String(body.title) } : {}),
        ...(body.description != null ? { description: String(body.description) } : {}),
        ...(body.priceRange !== undefined ? { priceRange: body.priceRange } : {}),
        ...(body.duration !== undefined ? { duration: body.duration } : {}),
        ...(body.images ? { images: toJson(body.images) } : {}),
        ...(featuresUpdate ? { features: toJson(featuresUpdate) } : {}),
        ...(body.ctaType ? { ctaType: (CTA_REVERSE[body.ctaType as string] ?? 'CHAT') as 'CHAT' } : {}),
        ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      },
    });

    queueBusinessProfileSearchSync(profile.id);

    return NextResponse.json({ message: 'به‌روزرسانی شد' });
  } catch (error) {
    console.error('Business offer PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireBusinessManager(_request);
    if ('error' in auth) return auth.error;
    const user = auth.user;

    const { id } = await params;
    const profile = await ensureBusinessProfile(user);
    const existing = await db.businessOffer.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    await db.businessOffer.delete({ where: { id } });
    queueBusinessProfileSearchSync(profile.id);
    return NextResponse.json({ message: 'حذف شد' });
  } catch (error) {
    console.error('Business offer DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
