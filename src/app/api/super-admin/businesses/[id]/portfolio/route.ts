import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';
import { isAllowedMediaUrl } from '@/lib/media/is-allowed-media-url';

export const runtime = 'nodejs';

const MEDIA_MAP: Record<string, 'IMAGE' | 'VIDEO' | 'BEFORE_AFTER'> = {
  image: 'IMAGE',
  video: 'VIDEO',
  before_after: 'BEFORE_AFTER',
};

function serializeItem(p: {
  id: string;
  type: string;
  title: string;
  description: string | null;
  mediaUrl: string;
  metadata: string;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    type: p.type.toLowerCase(),
    title: p.title,
    description: p.description,
    mediaUrl: p.mediaUrl,
    metadata: parseJsonObject(p.metadata, {}),
    order: p.order,
    isPublished: p.isPublished,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function assertProfile(id: string) {
  return db.businessProfile.findUnique({ where: { id }, select: { id: true } });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:read');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    if (!(await assertProfile(id))) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const items = await db.businessPortfolioItem.findMany({
      where: { profileId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ items: items.map(serializeItem) });
  } catch (error) {
    console.error('Super admin business portfolio GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:businesses:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    if (!(await assertProfile(id))) {
      return NextResponse.json({ error: 'کسب‌وکار یافت نشد' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title ?? '').trim();
    const mediaUrl = String(body.mediaUrl ?? '').trim();
    if (!title || !mediaUrl) {
      return NextResponse.json({ error: 'عنوان و آدرس رسانه الزامی است' }, { status: 400 });
    }
    if (!isAllowedMediaUrl(mediaUrl)) {
      return NextResponse.json(
        { error: 'آدرس رسانه باید از مسیر داخلی (/uploads/ یا /images/) باشد' },
        { status: 400 }
      );
    }

    const count = await db.businessPortfolioItem.count({ where: { profileId: id } });
    const item = await db.businessPortfolioItem.create({
      data: {
        profileId: id,
        type: MEDIA_MAP[body.type as string] ?? 'IMAGE',
        title,
        description: body.description ?? null,
        mediaUrl,
        metadata: toJson(body.metadata ?? {}),
        order: count,
        isPublished: body.isPublished !== false,
      },
    });

    await logAdminAction(
      request,
      authz.user.id,
      'market.business.portfolio.create',
      'BusinessPortfolioItem',
      item.id,
      { profileId: id }
    );

    return NextResponse.json({ item: serializeItem(item) }, { status: 201 });
  } catch (error) {
    console.error('Super admin business portfolio POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
