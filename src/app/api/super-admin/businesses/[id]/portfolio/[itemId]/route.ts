import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { toJson } from '@/lib/business/json-fields';
import { isAllowedMediaUrl } from '@/lib/media/is-allowed-media-url';

export const runtime = 'nodejs';

const MEDIA_MAP: Record<string, 'IMAGE' | 'VIDEO' | 'BEFORE_AFTER'> = {
  image: 'IMAGE',
  video: 'VIDEO',
  before_after: 'BEFORE_AFTER',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id, itemId } = await params;
    const existing = await db.businessPortfolioItem.findFirst({
      where: { id: itemId, profileId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'آیتم یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    if (body.mediaUrl != null) {
      const mediaUrl = String(body.mediaUrl).trim();
      if (mediaUrl && !isAllowedMediaUrl(mediaUrl)) {
        return NextResponse.json(
          { error: 'آدرس رسانه باید از مسیر داخلی (/uploads/ یا /images/) باشد' },
          { status: 400 }
        );
      }
    }

    await db.businessPortfolioItem.update({
      where: { id: itemId },
      data: {
        ...(body.title != null ? { title: String(body.title).trim() } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.mediaUrl != null ? { mediaUrl: String(body.mediaUrl).trim() } : {}),
        ...(body.type ? { type: MEDIA_MAP[body.type as string] ?? existing.type } : {}),
        ...(body.metadata ? { metadata: toJson(body.metadata) } : {}),
        ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      },
    });

    await logAdminAction(
      request,
      authz.user.id,
      'market.business.portfolio.update',
      'BusinessPortfolioItem',
      itemId,
      { profileId: id }
    );

    return NextResponse.json({ message: 'به‌روزرسانی شد' });
  } catch (error) {
    console.error('Super admin business portfolio PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id, itemId } = await params;
    const existing = await db.businessPortfolioItem.findFirst({
      where: { id: itemId, profileId: id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'آیتم یافت نشد' }, { status: 404 });
    }

    await db.businessPortfolioItem.delete({ where: { id: itemId } });

    await logAdminAction(
      request,
      authz.user.id,
      'market.business.portfolio.delete',
      'BusinessPortfolioItem',
      itemId,
      { profileId: id }
    );

    return NextResponse.json({ message: 'حذف شد' });
  } catch (error) {
    console.error('Super admin business portfolio DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
