import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';
import { buildOfferFeaturesFromBody } from '@/lib/business/serialize-offer-payload';

export const runtime = 'nodejs';

const CTA_REVERSE: Record<string, 'BOOK' | 'QUOTE' | 'CALL' | 'CHAT'> = {
  book: 'BOOK',
  quote: 'QUOTE',
  call: 'CALL',
  chat: 'CHAT',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id, offerId } = await params;
    const existing = await db.businessOffer.findFirst({
      where: { id: offerId, profileId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'پیشنهاد یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const featuresUpdate = buildOfferFeaturesFromBody(existing.features, body);

    const offer = await db.businessOffer.update({
      where: { id: offerId },
      data: {
        ...(body.title != null ? { title: String(body.title).trim() } : {}),
        ...(body.description != null ? { description: String(body.description).trim() } : {}),
        ...(body.priceRange !== undefined ? { priceRange: body.priceRange } : {}),
        ...(body.duration !== undefined ? { duration: body.duration } : {}),
        ...(body.images ? { images: toJson(body.images) } : {}),
        ...(featuresUpdate ? { features: toJson(featuresUpdate) } : {}),
        ...(body.ctaType ? { ctaType: CTA_REVERSE[body.ctaType as string] ?? 'CHAT' } : {}),
        ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      },
    });

    await logAdminAction(request, authz.user.id, 'market.business.offer.update', 'BusinessOffer', offerId, {
      profileId: id,
    });

    return NextResponse.json({ message: 'به‌روزرسانی شد' });
  } catch (error) {
    console.error('Super admin business offer PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id, offerId } = await params;
    const existing = await db.businessOffer.findFirst({
      where: { id: offerId, profileId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'پیشنهاد یافت نشد' }, { status: 404 });
    }

    await db.businessOffer.delete({ where: { id: offerId } });

    await logAdminAction(request, authz.user.id, 'market.business.offer.delete', 'BusinessOffer', offerId, {
      profileId: id,
    });

    return NextResponse.json({ message: 'حذف شد' });
  } catch (error) {
    console.error('Super admin business offer DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
