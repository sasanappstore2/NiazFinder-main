import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import {
  regionalFilingWriteSchema,
  serializeRegionalFilingRow,
} from '@/lib/filing/adapters/prisma-to-listing';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:filings:read');
    if (!authz.ok) return authz.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? 20)));
    const q = (searchParams.get('q') ?? '').trim();
    const status = (searchParams.get('status') ?? 'active').trim();
    const city = (searchParams.get('city') ?? '').trim();

    const where = {
      ...(status && status !== 'all' ? { status } : {}),
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' as const } },
              { fileCode: { contains: q, mode: 'insensitive' as const } },
              { neighborhood: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, rows, activeCount, pendingReviewCount] = await Promise.all([
      db.regionalFiling.count({ where }),
      db.regionalFiling.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.regionalFiling.count({ where: { status: 'active' } }),
      db.regionalFiling.count({ where: { status: 'pending_review' } }),
    ]);

    return NextResponse.json({
      filings: rows.map(serializeRegionalFilingRow),
      stats: { total, active: activeCount, pendingReview: pendingReviewCount },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    console.error('Super admin filings GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const raw = await request.json().catch(() => null);
    const parsed = regionalFilingWriteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'اطلاعات نامعتبر است', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const row = await db.regionalFiling.create({
      data: {
        fileCode: body.fileCode ?? null,
        title: body.title,
        description: body.description ?? null,
        dealType: body.dealType ?? null,
        categorySlug: body.categorySlug ?? null,
        propertyKind: body.propertyKind ?? null,
        city: body.city,
        cityId: body.cityId ?? null,
        district: body.district ?? null,
        neighborhood: body.neighborhood ?? null,
        neighborhoodId: body.neighborhoodId ?? null,
        location: body.location ?? null,
        price: body.price ?? null,
        deposit: body.deposit ?? null,
        monthlyRent: body.monthlyRent ?? null,
        area: body.area ?? null,
        rooms: body.rooms ?? null,
        floor: body.floor ?? null,
        pricePerMeter: body.pricePerMeter ?? null,
        postedAt: body.postedAt ?? null,
        totalFloors: body.totalFloors ?? null,
        unitsCount: body.unitsCount ?? null,
        buildingAge: body.buildingAge ?? null,
        documentType: body.documentType ?? null,
        cabinet: body.cabinet ?? null,
        flooring: body.flooring ?? null,
        wallCover: body.wallCover ?? null,
        facade: body.facade ?? null,
        orientation: body.orientation ?? null,
        heating: body.heating ?? null,
        cooling: body.cooling ?? null,
        exchangeable: body.exchangeable ?? null,
        hasParking: body.hasParking ?? null,
        hasStorage: body.hasStorage ?? null,
        hasElevator: body.hasElevator ?? null,
        hasSecurityDoor: body.hasSecurityDoor ?? null,
        hasTerrace: body.hasTerrace ?? null,
        hasBuiltInWardrobe: body.hasBuiltInWardrobe ?? null,
        detailUrl: body.detailUrl ?? null,
        sourceMetaJson: body.sourceMetaJson ?? undefined,
        imagesJson: body.imagesJson ?? undefined,
        image: body.image ?? null,
        status: body.status ?? 'active',
        createdById: authz.user.id,
      },
    });

    await logAdminAction(request, authz.user.id, 'regional_filing.create', 'RegionalFiling', row.id, {
      title: row.title,
      city: row.city,
    });

    await invalidateFilingCaches({ cityId: row.cityId, cityName: row.city, filingId: row.id });

    return NextResponse.json({ filing: serializeRegionalFilingRow(row) }, { status: 201 });
  } catch (error) {
    console.error('Super admin filings POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
