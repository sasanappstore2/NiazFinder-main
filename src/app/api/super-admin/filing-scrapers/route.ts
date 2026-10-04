import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requirePermission } from '@/lib/rbac/authz';
import { logAdminAction } from '@/lib/audit/admin-audit';
import { encryptScraperPassword } from '@/lib/filing-scrapers/credentials';
import {
  filingScraperWriteSchema,
  serializeFilingScraper,
} from '@/lib/filing-scrapers/admin-schema';
import {
  deriveDisplayNameFromLoginUrl,
  resolveFilingSiteKey,
  sanitizeSiteKey,
} from '@/lib/filing-scrapers/derive-site-key';

export const runtime = 'nodejs';

async function allocateUniqueSiteKey(base: string): Promise<string> {
  let key = sanitizeSiteKey(base);
  let suffix = 2;
  while (await db.regionalFilingScraper.findUnique({ where: { siteKey: key }, select: { id: true } })) {
    key = sanitizeSiteKey(`${base}-${suffix}`);
    suffix += 1;
  }
  return key;
}

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:filings:read');
    if (!authz.ok) return authz.response;

    const rows = await db.regionalFilingScraper.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { filings: true } } },
    });

    return NextResponse.json({
      scrapers: rows.map(serializeFilingScraper),
      stats: {
        total: rows.length,
        enabled: rows.filter((r) => r.enabled).length,
      },
    });
  } catch (error) {
    console.error('filing-scrapers GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const raw = await request.json().catch(() => null);
    const parsed = filingScraperWriteSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'اطلاعات نامعتبر', issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const body = parsed.data;

    const loginUrl = body.loginUrl.trim();
    const listingsUrl = (body.listingsUrl?.trim() || loginUrl).trim();
    const siteKey = await allocateUniqueSiteKey(
      resolveFilingSiteKey({ loginUrl, explicitSiteKey: body.siteKey })
    );
    const name =
      body.name?.trim() || deriveDisplayNameFromLoginUrl(loginUrl) || siteKey;
    if (name.length < 2) {
      return NextResponse.json({ error: 'نام ربات یا آدرس ورود معتبر وارد کنید' }, { status: 400 });
    }

    const row = await db.regionalFilingScraper.create({
      data: {
        name,
        siteKey,
        enabled: body.enabled ?? true,
        loginUrl,
        listingsUrl,
        username: body.username ?? '',
        passwordEnc: body.password ? encryptScraperPassword(body.password) : null,
        siteConfigJson: JSON.stringify(body.siteConfig ?? {}),
        defaultCity: body.defaultCity,
        defaultCityId: body.defaultCityId ?? null,
        defaultNeighborhood: body.defaultNeighborhood ?? null,
        defaultNeighborhoodId: body.defaultNeighborhoodId ?? null,
        intervalMinutes: body.intervalMinutes ?? 10,
        jitterMinutes: body.jitterMinutes ?? 4,
      },
    });

    await logAdminAction(
      request,
      authz.user.id,
      'filing_scraper.create',
      'RegionalFilingScraper',
      row.id,
      { siteKey: row.siteKey }
    );

    return NextResponse.json({ scraper: serializeFilingScraper(row) }, { status: 201 });
  } catch (error) {
    console.error('filing-scrapers POST error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
