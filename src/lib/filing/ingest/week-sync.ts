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

const SCRAPE_TIMEOUT_MS = 45 * 60_000;
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
  const siteConfig = scraperSiteConfigForEstateScrape(scraper.siteConfigJson);

  const scrape = await fetchFilingFeedScrape(
    {
      siteKey: scraper.siteKey,
      loginUrl: scraper.loginUrl,
      listingsUrl: scraper.listingsUrl,
      username: scraper.username,
      password,
      siteConfig,
      maxItems,
      withinDays,
      knownExternalIds: opts?.refreshExisting === false ? [] : undefined,
    },
    { timeoutMs: SCRAPE_TIMEOUT_MS }
  );

  if (!scrape.ok && !scrape.listings?.length) {
    throw new Error(scrape.error ?? 'استخراج لیست فایل‌ها ناموفق بود');
  }

  const rows = scrape.listings ?? [];
  const { importScrapedFilings } = await import('@/lib/filing/ingest/runner');
  const imported = rows.length ? await importScrapedFilings(scraper, rows) : 0;
  const seenExternalIds = rows.map((row, index) => listingExternalId(row, index));

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

  return { imported, scraped: rows.length, seenExternalIds, enrichStarted: false };
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
