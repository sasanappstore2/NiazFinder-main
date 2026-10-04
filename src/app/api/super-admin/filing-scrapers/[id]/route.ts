import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { encryptScraperPassword } from '@/lib/filing-scrapers/credentials';
import { schedulePhoneReenrichForScraper } from '@/lib/filing/ingest/phone-reenrich';
import {
  filingScraperWriteSchema,
  serializeFilingScraper,
} from '@/lib/filing-scrapers/admin-schema';

export const runtime = 'nodejs';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const { id } = await params;
    const existing = await db.regionalFilingScraper.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'ربات یافت نشد' }, { status: 404 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = filingScraperWriteSchema.partial().safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'اطلاعات نامعتبر', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const row = await db.regionalFilingScraper.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.siteKey !== undefined ? { siteKey: body.siteKey } : {}),
        ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
        ...(body.loginUrl !== undefined ? { loginUrl: body.loginUrl } : {}),
        ...(body.listingsUrl !== undefined ? { listingsUrl: body.listingsUrl } : {}),
        ...(body.username !== undefined ? { username: body.username } : {}),
        ...(body.password ? { passwordEnc: encryptScraperPassword(body.password) } : {}),
        ...(body.siteConfig !== undefined
          ? { siteConfigJson: JSON.stringify(body.siteConfig) }
          : {}),
        ...(body.defaultCity !== undefined ? { defaultCity: body.defaultCity } : {}),
        ...(body.defaultCityId !== undefined ? { defaultCityId: body.defaultCityId } : {}),
        ...(body.defaultNeighborhood !== undefined
          ? { defaultNeighborhood: body.defaultNeighborhood }
          : {}),
        ...(body.defaultNeighborhoodId !== undefined
          ? { defaultNeighborhoodId: body.defaultNeighborhoodId }
          : {}),
        ...(body.intervalMinutes !== undefined ? { intervalMinutes: body.intervalMinutes } : {}),
        ...(body.jitterMinutes !== undefined ? { jitterMinutes: body.jitterMinutes } : {}),
      },
    });

    await logAdminAction(request, authz.user.id, 'filing_scraper.update', 'RegionalFilingScraper', row.id, {});

    if (body.password) {
      schedulePhoneReenrichForScraper(row);
    }

    return NextResponse.json({ scraper: serializeFilingScraper(row) });
  } catch (error) {
    console.error('filing-scrapers PATCH error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
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
    await db.regionalFilingScraper.delete({ where: { id } });

    await logAdminAction(request, authz.user.id, 'filing_scraper.delete', 'RegionalFilingScraper', id, {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('filing-scrapers DELETE error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
