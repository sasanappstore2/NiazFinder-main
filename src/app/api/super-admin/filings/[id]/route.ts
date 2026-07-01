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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.regionalFiling.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = regionalFilingWriteSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'اطلاعات نامعتبر است', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const row = await db.regionalFiling.update({
      where: { id },
      data: {
        ...(body.fileCode !== undefined ? { fileCode: body.fileCode } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.dealType !== undefined ? { dealType: body.dealType } : {}),
        ...(body.categorySlug !== undefined ? { categorySlug: body.categorySlug } : {}),
        ...(body.propertyKind !== undefined ? { propertyKind: body.propertyKind } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.cityId !== undefined ? { cityId: body.cityId } : {}),
        ...(body.district !== undefined ? { district: body.district } : {}),
        ...(body.neighborhood !== undefined ? { neighborhood: body.neighborhood } : {}),
        ...(body.neighborhoodId !== undefined ? { neighborhoodId: body.neighborhoodId } : {}),
        ...(body.location !== undefined ? { location: body.location } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.deposit !== undefined ? { deposit: body.deposit } : {}),
        ...(body.monthlyRent !== undefined ? { monthlyRent: body.monthlyRent } : {}),
        ...(body.area !== undefined ? { area: body.area } : {}),
        ...(body.rooms !== undefined ? { rooms: body.rooms } : {}),
        ...(body.floor !== undefined ? { floor: body.floor } : {}),
        ...(body.pricePerMeter !== undefined ? { pricePerMeter: body.pricePerMeter } : {}),
        ...(body.postedAt !== undefined ? { postedAt: body.postedAt } : {}),
        ...(body.totalFloors !== undefined ? { totalFloors: body.totalFloors } : {}),
        ...(body.unitsCount !== undefined ? { unitsCount: body.unitsCount } : {}),
        ...(body.buildingAge !== undefined ? { buildingAge: body.buildingAge } : {}),
        ...(body.documentType !== undefined ? { documentType: body.documentType } : {}),
        ...(body.cabinet !== undefined ? { cabinet: body.cabinet } : {}),
        ...(body.flooring !== undefined ? { flooring: body.flooring } : {}),
        ...(body.wallCover !== undefined ? { wallCover: body.wallCover } : {}),
        ...(body.facade !== undefined ? { facade: body.facade } : {}),
        ...(body.orientation !== undefined ? { orientation: body.orientation } : {}),
        ...(body.heating !== undefined ? { heating: body.heating } : {}),
        ...(body.cooling !== undefined ? { cooling: body.cooling } : {}),
        ...(body.exchangeable !== undefined ? { exchangeable: body.exchangeable } : {}),
        ...(body.hasParking !== undefined ? { hasParking: body.hasParking } : {}),
        ...(body.hasStorage !== undefined ? { hasStorage: body.hasStorage } : {}),
        ...(body.hasElevator !== undefined ? { hasElevator: body.hasElevator } : {}),
        ...(body.hasSecurityDoor !== undefined ? { hasSecurityDoor: body.hasSecurityDoor } : {}),
        ...(body.hasTerrace !== undefined ? { hasTerrace: body.hasTerrace } : {}),
        ...(body.hasBuiltInWardrobe !== undefined
          ? { hasBuiltInWardrobe: body.hasBuiltInWardrobe }
          : {}),
        ...(body.detailUrl !== undefined ? { detailUrl: body.detailUrl } : {}),
        ...(body.sourceMetaJson !== undefined
          ? { sourceMetaJson: body.sourceMetaJson ?? '{}' }
          : {}),
        ...(body.imagesJson !== undefined ? { imagesJson: body.imagesJson ?? '[]' } : {}),
        ...(body.image !== undefined ? { image: body.image } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.status === 'active' ? { reviewIssuesJson: null as string | null } : {}),
      },
    });

    await logAdminAction(request, authz.user.id, 'regional_filing.update', 'RegionalFiling', row.id, {
      title: row.title,
      status: row.status,
    });

    await invalidateFilingCaches({ cityId: row.cityId, cityName: row.city, filingId: row.id });

    return NextResponse.json({ filing: serializeRegionalFilingRow(row) });
  } catch (error) {
    console.error('Super admin filings PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.regionalFiling.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'فایل یافت نشد' }, { status: 404 });
    }

    const row = await db.regionalFiling.update({
      where: { id },
      data: { status: 'archived' },
    });

    await logAdminAction(request, authz.user.id, 'regional_filing.archive', 'RegionalFiling', row.id, {
      title: row.title,
    });

    await invalidateFilingCaches({ cityId: row.cityId, cityName: row.city, filingId: row.id });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Super admin filings DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
