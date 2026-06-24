import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { parseJsonArray, toJson } from '@/lib/business/json-fields';
import {
  parseOfferStorefrontFromFeatures,
  serializeOfferStorefrontFeatures,
} from '@/lib/business/offer-storefront-meta';
import { buildOfferFeaturesFromBody } from '@/lib/business/serialize-offer-payload';

export const runtime = 'nodejs';

const CTA_REVERSE: Record<string, 'BOOK' | 'QUOTE' | 'CALL' | 'CHAT'> = {
  book: 'BOOK',
  quote: 'QUOTE',
  call: 'CALL',
  chat: 'CHAT',
};

function serializeOffer(o: {
  id: string;
  title: string;
  description: string;
  priceRange: string | null;
  duration: string | null;
  images: string;
  features: string;
  ctaType: string;
  order: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const rawFeatures = parseJsonArray<string>(o.features);
  const { meta, displayFeatures } = parseOfferStorefrontFromFeatures(rawFeatures);
  return {
    id: o.id,
    title: o.title,
    description: o.description,
    priceRange: o.priceRange,
    duration: o.duration,
    images: parseJsonArray<string>(o.images),
    features: displayFeatures,
    ctaType: o.ctaType.toLowerCase(),
    order: o.order,
    isPublished: o.isPublished,
    vitrineCategoryId: meta.primaryCategoryId ?? meta.categoryIds[0] ?? null,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
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

    const offers = await db.businessOffer.findMany({
      where: { profileId: id },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ offers: offers.map(serializeOffer) });
  } catch (error) {
    console.error('Super admin business offers GET error:', error);
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
    const description = String(body.description ?? '').trim();
    if (!title || !description) {
      return NextResponse.json({ error: 'عنوان و توضیحات الزامی است' }, { status: 400 });
    }

    const count = await db.businessOffer.count({ where: { profileId: id } });
    const features =
      buildOfferFeaturesFromBody('[]', body) ??
      serializeOfferStorefrontFeatures([], {
        categoryIds: Array.isArray(body.categoryIds) ? body.categoryIds : [],
        primaryCategoryId:
          typeof body.primaryCategoryId === 'string' ? body.primaryCategoryId : null,
        variants: Array.isArray(body.variants) ? body.variants : [],
        brandId: typeof body.brandId === 'string' ? body.brandId : null,
      });

    const offer = await db.businessOffer.create({
      data: {
        profileId: id,
        title,
        description,
        priceRange: body.priceRange ?? null,
        duration: body.duration ?? null,
        images: toJson(Array.isArray(body.images) ? body.images : []),
        features: toJson(features),
        faq: toJson([]),
        ctaType: CTA_REVERSE[body.ctaType as string] ?? 'CHAT',
        order: count,
        isPublished: body.isPublished !== false,
      },
    });

    await logAdminAction(request, authz.user.id, 'market.business.offer.create', 'BusinessOffer', offer.id, {
      profileId: id,
    });

    return NextResponse.json({ offer: serializeOffer(offer) }, { status: 201 });
  } catch (error) {
    console.error('Super admin business offers POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
