import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBusinessManager } from '@/lib/business/require-business-manager';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { parseJsonObject, toJson } from '@/lib/business/json-fields';

export const runtime = 'nodejs';

const MEDIA_MAP: Record<string, 'IMAGE' | 'VIDEO' | 'BEFORE_AFTER'> = {
  image: 'IMAGE',
  video: 'VIDEO',
  before_after: 'BEFORE_AFTER',
};

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await ensureBusinessProfile(user);
    const items = await db.businessPortfolioItem.findMany({
      where: { profileId: profile.id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      items: items.map((p) => ({
        id: p.id,
        type: p.type.toLowerCase(),
        title: p.title,
        description: p.description,
        mediaUrl: p.mediaUrl,
        metadata: parseJsonObject(p.metadata, {}),
        order: p.order,
        isPublished: p.isPublished,
      })),
    });
  } catch (error) {
    console.error('Business portfolio GET error:', error);
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
    const mediaUrl = String(body.mediaUrl ?? '').trim();
    if (!title || !mediaUrl) {
      return NextResponse.json({ error: 'عنوان و آدرس رسانه الزامی است' }, { status: 400 });
    }

    const profile = await ensureBusinessProfile(user);
    const count = await db.businessPortfolioItem.count({ where: { profileId: profile.id } });

    const item = await db.businessPortfolioItem.create({
      data: {
        profileId: profile.id,
        type: MEDIA_MAP[body.type as string] ?? 'IMAGE',
        title,
        description: body.description ?? null,
        mediaUrl,
        metadata: toJson(body.metadata ?? {}),
        order: count,
      },
    });

    return NextResponse.json({ id: item.id, message: 'ذخیره شد' }, { status: 201 });
  } catch (error) {
    console.error('Business portfolio POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
