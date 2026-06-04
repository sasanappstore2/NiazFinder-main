import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { toJson } from '@/lib/business/json-fields';
import { isAllowedMediaUrl } from '@/lib/media/is-allowed-media-url';

export const runtime = 'nodejs';

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
    const existing = await db.businessPortfolioItem.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

    await db.businessPortfolioItem.delete({ where: { id } });
    return NextResponse.json({ message: 'حذف شد' });
  } catch (error) {
    console.error('Business portfolio DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

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
    const existing = await db.businessPortfolioItem.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) return NextResponse.json({ error: 'یافت نشد' }, { status: 404 });

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

    if (body.metadata && typeof body.metadata === 'object') {
      const metadata = body.metadata as Record<string, unknown>;
      for (const key of ['beforeUrl', 'afterUrl'] as const) {
        const v = metadata[key];
        if (typeof v === 'string' && v.trim() && !isAllowedMediaUrl(v)) {
          return NextResponse.json(
            { error: 'آدرس رسانه باید از مسیر داخلی (/uploads/ یا /images/) باشد' },
            { status: 400 }
          );
        }
      }
    }

    await db.businessPortfolioItem.update({
      where: { id },
      data: {
        ...(body.title != null ? { title: String(body.title) } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.mediaUrl ? { mediaUrl: String(body.mediaUrl) } : {}),
        ...(body.metadata ? { metadata: toJson(body.metadata) } : {}),
        ...(body.isPublished !== undefined ? { isPublished: Boolean(body.isPublished) } : {}),
      },
    });

    return NextResponse.json({ message: 'به‌روزرسانی شد' });
  } catch (error) {
    console.error('Business portfolio PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
