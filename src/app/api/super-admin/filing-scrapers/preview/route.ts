import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { formatApiError } from '@/lib/api/format-api-error';
import { requirePermission } from '@/lib/rbac/authz';
import { fetchFilingFeedPreview } from '@/lib/filing-scrapers/estate-scrape-filing-client';
import { normalizeScrapedListing } from '@/lib/filing-scrapers/normalize-listing';
import { scrapeFilingFeedForScraper } from '@/lib/filing-scrapers/runner';
import {
  parseScraperSiteConfig,
  scraperSiteConfigForEstateScrape,
} from '@/lib/filing-scrapers/scheduler';
import { db } from '@/lib/db';
import type { RegionalFilingScraper } from '@prisma/client';
import { resolveFilingSiteKey } from '@/lib/filing-scrapers/derive-site-key';

export const runtime = 'nodejs';

const previewBodySchema = z.object({
  scraperId: z.string().optional(),
  siteKey: z.string().min(2).optional(),
  loginUrl: z.string().url().optional(),
  listingsUrl: z.string().url().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  defaultCity: z.string().optional(),
  defaultNeighborhood: z.string().optional().nullable(),
  defaultCityId: z.string().optional().nullable(),
  defaultNeighborhoodId: z.string().optional().nullable(),
  siteConfig: z.record(z.string(), z.unknown()).optional(),
  maxItems: z.coerce.number().int().min(1).max(200).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(request, 'market:filings:write');
    if (!authz.ok) return authz.response;

    const raw = await request.json().catch(() => null);
    const parsed = previewBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: formatApiError({ issues: parsed.error.issues }, 'اطلاعات نامعتبر است') },
        { status: 400 }
      );
    }

    const body = parsed.data;
    const maxItems = body.maxItems ?? 5;

    if (body.scraperId) {
      const scraper = await db.regionalFilingScraper.findUnique({
        where: { id: body.scraperId },
      });
      if (!scraper) {
        return NextResponse.json({ error: 'ربات یافت نشد' }, { status: 404 });
      }

      const result = await scrapeFilingFeedForScraper(scraper, { maxItems });
      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: result.error ?? 'پیش‌نمایش ناموفق', listings: [] },
          { status: 422 }
        );
      }

      const blueprint = parseScraperSiteConfig(scraper.siteConfigJson);
      const listings = result.listings.map((row) =>
        normalizeScrapedListing(row, scraper, { titleTemplate: blueprint.titleTemplate })
      );

      return NextResponse.json({
        ok: true,
        listings,
        pageUrl: result.pageUrl,
        extractMethod: result.extractMethod,
      });
    }

    const {
      siteKey,
      loginUrl,
      listingsUrl,
      username,
      password,
      defaultCity,
      defaultNeighborhood,
      defaultCityId,
      defaultNeighborhoodId,
      siteConfig,
    } = body;

    const hasBlueprint = Boolean(
      (siteConfig as Record<string, unknown> | undefined)?.listPage &&
        (siteConfig as { listPage?: { containerSelector?: string } }).listPage?.containerSelector
    );
    const hasCreds = Boolean(username?.trim() && password?.trim());

    if (!loginUrl || !defaultCity) {
      return NextResponse.json(
        { error: 'برای پیش‌نمایش، آدرس ورود و شهر الزامی است' },
        { status: 400 }
      );
    }

    if (!hasCreds && !hasBlueprint) {
      return NextResponse.json(
        { error: 'برای پیش‌نمایش بدون ورود، ابتدا نقشه سایت (blueprint) بسازید' },
        { status: 400 }
      );
    }

    const resolvedSiteKey = resolveFilingSiteKey({
      loginUrl,
      explicitSiteKey: siteKey,
    });
    const resolvedListingsUrl = listingsUrl?.trim() || loginUrl;

    const estateSiteConfig = scraperSiteConfigForEstateScrape(JSON.stringify(siteConfig ?? {}));

    const result = await fetchFilingFeedPreview({
      siteKey: resolvedSiteKey,
      loginUrl,
      listingsUrl: resolvedListingsUrl,
      username: username ?? '',
      password: password ?? '',
      siteConfig: estateSiteConfig,
      maxItems,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error ?? 'پیش‌نمایش ناموفق', listings: [] },
        { status: 422 }
      );
    }

    const pseudoScraper = {
      id: 'preview',
      defaultCity,
      defaultNeighborhood: defaultNeighborhood ?? null,
      defaultCityId: defaultCityId ?? null,
      defaultNeighborhoodId: defaultNeighborhoodId ?? null,
    } as RegionalFilingScraper;

    const blueprint = parseScraperSiteConfig(JSON.stringify(siteConfig ?? {}));
    const listings = result.listings.map((row) =>
      normalizeScrapedListing(row, pseudoScraper, { titleTemplate: blueprint.titleTemplate })
    );

    return NextResponse.json({
      ok: true,
      listings,
      pageUrl: result.pageUrl,
      extractMethod: result.extractMethod,
    });
  } catch (error) {
    console.error('filing-scrapers preview error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
