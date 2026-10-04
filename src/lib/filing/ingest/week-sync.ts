import type { RegionalFilingScraper } from '@prisma/client';
import { decryptScraperPassword } from '@/lib/filing/ingest/credentials';
import { fetchFilingFeedScrape } from '@/lib/filing/ingest/estate-scrape-filing-client';
import {
  enrichFilingsUntilComplete,
  reenrichFilingPhonesForScraper,
  scraperCanFetchDetail,
} from '@/lib/filing/ingest/enrich-pipeline';
import { reconcileFilingMetadataForScraper } from '@/lib/filing/ingest/post-import-sync';
import { scraperSiteConfigForEstateScrape } from '@/lib/filing/ingest/scheduler';
import { archiveStaleFilingsForScraper } from '@/lib/filing/ingest/stale-listings';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';

/**
 * Node's fetch (undici) enforces a hard 300s headers timeout regardless of any
 * AbortController budget, so a single long-running scrape request dies with a
 * bare "fetch failed" after 5 minutes. We therefore scrape in bounded batches
 * (mirroring the proven run-maskanyaban-week-import fixture): each HTTP call
 * asks for at most BATCH_SIZE new items and must finish inside BATCH_TIMEOUT_MS.
 */
const BATCH_TIMEOUT_MS = 240_000;
const BATCH_SIZE = 200;
const DEFAULT_WITHIN_DAYS = 7;
const DEFAULT_MAX_ITEMS = 2500;

function listingExternalId(row: ScrapedFilingRow, index: number): string {
  const id = row.externalId?.trim() || row.fileCode?.trim();
  if (id) return id;
  return `row-${index}-${row.title.slice(0, 40)}`;
}

export type WeekSyncResult = {
  imported: number;
  scraped: number;
  seenExternalIds: string[];
  enrichStarted: boolean;
};

export async function runPortalWeekSync(
  scraper: RegionalFilingScraper,
  opts?: {
    withinDays?: number;
    maxItems?: number;
    refreshExisting?: boolean;
  }
): Promise<WeekSyncResult> {
  const withinDays = opts?.withinDays ?? DEFAULT_WITHIN_DAYS;
  const maxItems = opts?.maxItems ?? DEFAULT_MAX_ITEMS;
  const password = scraper.passwordEnc ? decryptScraperPassword(scraper.passwordEnc) : '';
  // Inline detail-enrich during the list scrape costs seconds per row and blows
  // the per-batch latency budget; the post-import enrich pipeline fetches detail
  // pages separately, so disable it here (same as the week-import fixture).
  const baseSiteConfig = scraperSiteConfigForEstateScrape(scraper.siteConfigJson);
  const detailPage = (baseSiteConfig.detailPage as Record<string, unknown> | undefined) ?? {};
  const siteConfig = { ...baseSiteConfig, detailPage: { ...detailPage, enabled: false } };
  const { importScrapedFilings } = await import('@/lib/filing/ingest/runner');

  const seenExternalIds: string[] = [];
  const knownIds = new Set<string>(opts?.refreshExisting === false ? [] : undefined);
  let imported = 0;
  let scrapedTotal = 0;
  let lastError: string | undefined;
  const maxBatches = Math.max(1, Math.ceil(maxItems / BATCH_SIZE));

  for (let batch = 0; batch < maxBatches; batch++) {
    const remaining = maxItems - scrapedTotal;
    if (remaining <= 0) break;

    const scrape = await fetchFilingFeedScrape(
      {
        siteKey: scraper.siteKey,
        loginUrl: scraper.loginUrl,
        listingsUrl: scraper.listingsUrl,
        username: scraper.username,
        password,
        siteConfig,
        maxItems: Math.min(BATCH_SIZE, remaining),
        withinDays,
        knownExternalIds: [...knownIds],
      },
      { timeoutMs: BATCH_TIMEOUT_MS }
    );

    const rows = scrape.listings ?? [];
    if (!scrape.ok && rows.length === 0) {
      lastError = scrape.error ?? 'استخراج لیست فایل‌ها ناموفق بود';
      break;
    }
    if (rows.length === 0) break;

    imported += await importScrapedFilings(scraper, rows);
    scrapedTotal += rows.length;
    for (const [index, row] of rows.entries()) {
      const id = listingExternalId(row, index);
      seenExternalIds.push(id);
      knownIds.add(id);
    }

    // A short batch means the portal has no more new rows in the window.
    if (rows.length < Math.min(BATCH_SIZE, remaining)) break;
  }

  if (scrapedTotal === 0 && lastError) {
    throw new Error(lastError);
  }

  try {
    await reconcileFilingMetadataForScraper(scraper, { withinDays, limit: Math.max(imported, 200) });
  } catch (err) {
    console.warn('[week-sync] metadata reconcile skipped:', err);
  }

  try {
    await archiveStaleFilingsForScraper(scraper.id, seenExternalIds, { withinDays });
  } catch (err) {
    console.warn('[week-sync] stale archive skipped:', err);
  }

  return { imported, scraped: scrapedTotal, seenExternalIds, enrichStarted: false };
}

export async function runPostImportEnrich(
  scraper: RegionalFilingScraper,
  opts?: { withinDays?: number }
): Promise<void> {
  const withinDays = opts?.withinDays ?? DEFAULT_WITHIN_DAYS;

  if (!scraperCanFetchDetail(scraper)) {
    await enrichFilingsUntilComplete(scraper, {
      withinDays,
      limit: 200,
      maxRounds: 30,
      concurrency: 16,
      delayMs: 0,
    });
    return;
  }

  await enrichFilingsUntilComplete(scraper, {
    withinDays,
    limit: 40,
    maxRounds: 200,
    concurrency: 6,
    delayMs: 400,
  });
  await reenrichFilingPhonesForScraper(scraper, { withinDays });
}

export function schedulePostImportEnrich(
  scraper: RegionalFilingScraper,
  opts?: { withinDays?: number }
): void {
  void runPostImportEnrich(scraper, opts)
    .then(async () => {
      await invalidateFilingCaches({
        cityId: scraper.defaultCityId,
        cityName: scraper.defaultCity,
      });
      console.log(`[week-sync] post-import enrich complete · scraper=${scraper.siteKey}`);
    })
    .catch((err) => {
      console.error(`[week-sync] post-import enrich failed · scraper=${scraper.siteKey}:`, err);
    });
}
