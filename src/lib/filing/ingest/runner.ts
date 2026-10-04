import { db } from '@/lib/db';
import { decryptScraperPassword } from '@/lib/filing/ingest/credentials';
import {
  fetchFilingFeedPreview,
  fetchFilingFeedScrape,
  type ScrapedFilingRow,
} from '@/lib/filing/ingest/estate-scrape-filing-client';
import { normalizeScrapedListing, filingAttributeDbFields } from '@/lib/filing/ingest/normalize-listing';
import { archiveStaleFilingsForScraper } from '@/lib/filing/ingest/stale-listings';
import { reconcileFilingMetadataForScraper } from '@/lib/filing/ingest/post-import-sync';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';
import {
  runPortalWeekSync,
  schedulePostImportEnrich,
} from '@/lib/filing/ingest/week-sync';
import {
  parseScraperSiteConfig,
  scraperSiteConfigForEstateScrape,
  scraperIsDue,
} from '@/lib/filing/ingest/scheduler';
import type { CrawlBlueprint } from '@/lib/filing/ingest/crawl-blueprint';
import type { RegionalFilingScraper } from '@prisma/client';
import { isCrawlerV2Enabled, scrapeFilingFeedV2 } from '@crawler/bridge/v2-runner-adapter';
import { isCrawlerPlatformV3Enabled, scrapeFilingFeedV3 } from '@crawler/v3/bridge/v3-runner-adapter';

const STUCK_RUNNING_MS = 15 * 60_000;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const TICK_MAX_ITEMS = 20;

function listingExternalId(row: ScrapedFilingRow, index: number): string {
  const id = row.externalId?.trim() || row.fileCode?.trim();
  if (id) return id;
  return `row-${index}-${row.title.slice(0, 40)}`;
}

export { listingExternalId };

function hasPhoneMeta(meta: Record<string, unknown> | null | undefined): boolean {
  return Boolean(
    String(meta?.brokerPhone ?? '').trim() || String(meta?.ownerPhone ?? '').trim()
  );
}

type PortalListEntry = NonNullable<CrawlBlueprint['portalMap']>['listPages'] extends (infer T)[] | undefined
  ? T
  : never;

function portalListEntries(blueprint: CrawlBlueprint): PortalListEntry[] {
  const pages = blueprint.portalMap?.listPages?.filter((p) => p.url?.trim()) ?? [];
  return pages as PortalListEntry[];
}

function mergePortalRowHints(
  row: ScrapedFilingRow,
  entry: PortalListEntry
): ScrapedFilingRow {
  return {
    ...row,
    dealType: row.dealType ?? entry.dealType ?? null,
    propertyKind: row.propertyKind ?? entry.propertyKind ?? null,
  };
}

async function scrapePortalMapPages(
  scraper: RegionalFilingScraper,
  blueprint: CrawlBlueprint,
  options?: { maxItems?: number; knownExternalIds?: string[] }
): Promise<{
  ok: boolean;
  listings: ScrapedFilingRow[];
  pageUrl?: string;
  extractMethod?: string;
  error?: string;
}> {
  const password = scraper.passwordEnc ? decryptScraperPassword(scraper.passwordEnc) : '';
  const baseConfig = scraperSiteConfigForEstateScrape(scraper.siteConfigJson);
  const entries = portalListEntries(blueprint);
  const maxItems = options?.maxItems ?? TICK_MAX_ITEMS;
  const seen = new Set<string>();
  const merged: ScrapedFilingRow[] = [];

  for (const entry of entries) {
    if (merged.length >= maxItems) break;
    const baseListPage =
      (baseConfig.listPage as Record<string, unknown> | undefined) ?? {};
    const siteConfig = {
      ...baseConfig,
      listPage: {
        ...baseListPage,
        containerSelector:
          entry.containerSelector ??
          (baseListPage.containerSelector as string | undefined),
      },
      fieldMap: {
        ...((baseConfig.fieldMap as Record<string, unknown> | undefined) ?? {}),
        ...(entry.fieldMapOverrides ?? {}),
      },
    };
    const remaining = maxItems - merged.length;
    const result = options?.maxItems
      ? await fetchFilingFeedPreview({
          siteKey: scraper.siteKey,
          loginUrl: scraper.loginUrl,
          listingsUrl: entry.url,
          username: scraper.username,
          password,
          siteConfig,
          maxItems: remaining,
          knownExternalIds: options?.knownExternalIds,
        })
      : await fetchFilingFeedScrape({
          siteKey: scraper.siteKey,
          loginUrl: scraper.loginUrl,
          listingsUrl: entry.url,
          username: scraper.username,
          password,
          siteConfig,
          maxItems: remaining,
          knownExternalIds: options?.knownExternalIds,
        });

    for (const row of result.listings ?? []) {
      const hinted = mergePortalRowHints(row, entry);
      const ext = listingExternalId(hinted, merged.length);
      if (seen.has(ext)) continue;
      seen.add(ext);
      merged.push({ ...hinted, externalId: ext });
      if (merged.length >= maxItems) break;
    }
  }

  return {
    ok: merged.length > 0,
    listings: merged,
    extractMethod: 'dom+portal-map',
    pageUrl: entries[0]?.url,
    error: merged.length ? undefined : 'no listings from portal map',
  };
}

/** Reset scrapers stuck in `running` longer than 15 minutes. */
export async function recoverStuckFilingScrapers(): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_RUNNING_MS);
  const stuck = await db.regionalFilingScraper.findMany({
    where: { status: 'running', lastRunAt: { lt: cutoff } },
    select: { id: true },
  });
  if (!stuck.length) return 0;

  await db.regionalFilingScraper.updateMany({
    where: { id: { in: stuck.map((s) => s.id) } },
    data: {
      status: 'error',
      lastError: 'بازیابی: اجرای قبلی بیش از ۱۵ دقیقه طول کشید',
    },
  });
  return stuck.length;
}

export async function scrapeFilingFeedForScraper(
  scraper: RegionalFilingScraper,
  options?: { maxItems?: number; knownExternalIds?: string[] }
): Promise<{
  ok: boolean;
  listings: ScrapedFilingRow[];
  pageUrl?: string;
  extractMethod?: string;
  error?: string;
}> {
  if (isCrawlerPlatformV3Enabled()) {
    return scrapeFilingFeedV3(scraper, { maxItems: options?.maxItems });
  }
  if (isCrawlerV2Enabled()) {
    return scrapeFilingFeedV2(scraper, { maxItems: options?.maxItems });
  }

  const password = scraper.passwordEnc ? decryptScraperPassword(scraper.passwordEnc) : '';
  const blueprint = parseScraperSiteConfig(scraper.siteConfigJson);
  const siteConfig = scraperSiteConfigForEstateScrape(scraper.siteConfigJson);
  const maxItems = options?.maxItems ?? TICK_MAX_ITEMS;

  const portalPages = portalListEntries(blueprint);
  if (portalPages.length > 1) {
    return scrapePortalMapPages(scraper, blueprint, options);
  }

  if (options?.maxItems) {
    return fetchFilingFeedPreview({
      siteKey: scraper.siteKey,
      loginUrl: scraper.loginUrl,
      listingsUrl: scraper.listingsUrl,
      username: scraper.username,
      password,
      siteConfig,
      maxItems,
      knownExternalIds: options.knownExternalIds,
    });
  }

  return fetchFilingFeedScrape({
    siteKey: scraper.siteKey,
    loginUrl: scraper.loginUrl,
    listingsUrl: scraper.listingsUrl,
    username: scraper.username,
    password,
    siteConfig,
    maxItems,
    knownExternalIds: options?.knownExternalIds,
  });
}

export async function importScrapedFilings(
  scraper: RegionalFilingScraper,
  rows: ScrapedFilingRow[]
): Promise<number> {
  const blueprint = parseScraperSiteConfig(scraper.siteConfigJson);
  const titleTemplate = blueprint.titleTemplate ?? null;
  let count = 0;
  const now = new Date();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const normalized = normalizeScrapedListing(row, scraper, { titleTemplate });
    const externalId = listingExternalId(row, i);
    const withMedia = {
      ...normalized,
      image: row.image ?? null,
      images: row.images ?? null,
      detailUrl: row.detailUrl ?? normalized.detailUrl ?? null,
    };
    const isEnriched = Boolean(
      row.enrichedAt ||
        hasPhoneMeta(row.sourceMeta) ||
        withMedia.description?.trim() ||
        withMedia.totalFloors != null ||
        withMedia.cabinet?.trim() ||
        (withMedia.images?.length ?? 0) > 0
    );
    const attrs = filingAttributeDbFields(withMedia, { enriched: isEnriched });
    const reviewIssuesJson =
      normalized.reviewIssues.length > 0 ? JSON.stringify(normalized.reviewIssues) : null;

    const listUpdate = {
      sourceSite: scraper.siteKey,
      fileCode: normalized.fileCode ?? null,
      title: normalized.title,
      dealType: normalized.dealType ?? null,
      propertyKind: normalized.propertyKind ?? null,
      categorySlug: normalized.categorySlug,
      city: normalized.city || scraper.defaultCity,
      cityId: normalized.cityId,
      neighborhood: normalized.neighborhood,
      neighborhoodId: normalized.neighborhoodId,
      location: normalized.location ?? null,
      price: normalized.price ?? null,
      deposit: normalized.deposit ?? null,
      monthlyRent: normalized.monthlyRent ?? null,
      area: normalized.area ?? null,
      rooms: normalized.rooms ?? null,
      floor: normalized.floor ?? null,
      pricePerMeter: normalized.pricePerMeter ?? null,
      status: normalized.status,
      reviewIssuesJson,
      scrapedAt: now,
      ...(normalized.postedAt ? { postedAt: normalized.postedAt } : {}),
    };

    const listMediaUpdate =
      !isEnriched && (row.image || row.images?.length || row.detailUrl)
        ? {
            image: attrs.image as string | null,
            imagesJson: attrs.imagesJson as string,
            detailUrl: attrs.detailUrl as string | null,
          }
        : {};

    await db.regionalFiling.upsert({
      where: {
        scraperId_externalId: {
          scraperId: scraper.id,
          externalId,
        },
      },
      create: {
        scraperId: scraper.id,
        externalId,
        description: normalized.description ?? null,
        ...listUpdate,
        ...attrs,
      },
      update: isEnriched
        ? {
            ...listUpdate,
            description: normalized.description ?? null,
            ...attrs,
          }
        : {
            ...listUpdate,
            ...listMediaUpdate,
          },
    });
    count += 1;
  }

  return count;
}

/** @deprecated use importScrapedFilings */
export const upsertScrapedFilings = importScrapedFilings;

async function markScraperFailure(scraperId: string, message: string) {
  const row = await db.regionalFilingScraper.findUnique({
    where: { id: scraperId },
    select: { failureCount: true },
  });
  const failureCount = (row?.failureCount ?? 0) + 1;
  await db.regionalFilingScraper.update({
    where: { id: scraperId },
    data: {
      status: 'error',
      lastError: message,
      lastImportedCount: 0,
      failureCount,
      enabled: failureCount < CIRCUIT_BREAKER_THRESHOLD,
    },
  });
  if (failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    console.warn(`[filing-scraper] circuit breaker: disabled scraper ${scraperId}`);
  }
}

export async function runFilingScraper(
  scraperId: string,
  opts?: { trigger?: 'manual' | 'scheduled' }
): Promise<{
  ok: boolean;
  imported: number;
  enrichStarted?: boolean;
  error?: string;
}> {
  const trigger = opts?.trigger ?? 'scheduled';
  const scraper = await db.regionalFilingScraper.findUnique({ where: { id: scraperId } });
  if (!scraper) {
    return { ok: false, imported: 0, error: 'ربات یافت نشد' };
  }

  if (!scraper.enabled) {
    return { ok: false, imported: 0, error: 'ربات غیرفعال است' };
  }

  await db.regionalFilingScraper.update({
    where: { id: scraperId },
    data: { status: 'running', lastRunAt: new Date(), lastError: null },
  });

  let finished = false;
  try {
    const weekSync = await runPortalWeekSync(scraper, {
      withinDays: 7,
      maxItems: 2500,
      refreshExisting: true,
    });

    if (weekSync.scraped === 0 && weekSync.imported === 0) {
      await db.regionalFilingScraper.update({
        where: { id: scraperId },
        data: {
          status: 'ok',
          lastSuccessAt: new Date(),
          lastImportedCount: 0,
          lastError: null,
          failureCount: 0,
        },
      });
      finished = true;
      schedulePostImportEnrich(scraper, { withinDays: 7 });
      return { ok: true, imported: 0, enrichStarted: true };
    }

    try {
      await invalidateFilingCaches({
        cityId: scraper.defaultCityId,
        cityName: scraper.defaultCity,
      });
    } catch (cacheErr) {
      console.warn('[filing-scraper] cache invalidation skipped:', cacheErr);
    }

    await db.regionalFilingScraper.update({
      where: { id: scraperId },
      data: {
        status: 'ok',
        lastSuccessAt: new Date(),
        lastImportedCount: weekSync.imported,
        lastError: null,
        failureCount: 0,
      },
    });

    schedulePostImportEnrich(scraper, { withinDays: 7 });

    finished = true;
    return { ok: true, imported: weekSync.imported, enrichStarted: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'خطای ناشناخته';
    await markScraperFailure(scraperId, message);
    finished = true;
    return { ok: false, imported: 0, error: message };
  } finally {
    if (!finished) {
      await db.regionalFilingScraper.update({
        where: { id: scraperId },
        data: {
          status: 'error',
          lastError: 'اجرای ناقص — وضعیت running بازیابی شد',
        },
      });
    }
  }
}

/** Process due scrapers sequentially (queue) — one at a time to limit server load. */
export async function runDueFilingScrapers(): Promise<{
  checked: number;
  ran: number;
  imported: number;
  recovered: number;
  errors: string[];
}> {
  const recovered = await recoverStuckFilingScrapers();

  const scrapers = await db.regionalFilingScraper.findMany({
    where: { enabled: true },
    orderBy: { lastRunAt: 'asc' },
  });

  const due = scrapers.filter((s) => scraperIsDue(s));

  let ran = 0;
  let imported = 0;
  const errors: string[] = [];

  for (const scraper of due) {
    const jitterMs = Math.floor(Math.random() * (scraper.jitterMinutes + 1) * 60_000);
    if (jitterMs > 0) {
      await new Promise((r) => setTimeout(r, jitterMs));
    }
    const result = await runFilingScraper(scraper.id, { trigger: 'scheduled' });
    ran += 1;
    if (result.ok) {
      imported += result.imported;
    } else if (result.error) {
      errors.push(`${scraper.name}: ${result.error}`);
    }
  }

  return { checked: scrapers.length, ran, imported, recovered, errors };
}
