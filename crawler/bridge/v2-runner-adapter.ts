import type { RegionalFilingScraper } from '@prisma/client';
import type { ScrapedFilingRow } from '@/lib/filing-scrapers/estate-scrape-filing-client';
import { getCrawlerConfig } from '../config/loader';
import { CrawlService } from '../api/crawl-service';
import { storedPropertiesToScrapedRows } from '../bridge/legacy-filing';

export type V2ScrapeResult = {
  ok: boolean;
  listings: ScrapedFilingRow[];
  pageUrl?: string;
  extractMethod: string;
  error?: string;
};

export function isCrawlerV2Enabled(): boolean {
  return getCrawlerConfig().featureFlags.crawlerV2;
}

/**
 * Drop-in alternative to estate-scrape for filing runners.
 * Returns the same ScrapedFilingRow[] contract.
 */
export async function scrapeFilingFeedV2(
  scraper: RegionalFilingScraper,
  opts?: { maxItems?: number; seedUrl?: string }
): Promise<V2ScrapeResult> {
  const service = CrawlService.create();
  const seedUrl = opts?.seedUrl ?? scraper.listingsUrl;
  const maxPages = opts?.maxItems ?? 20;

  try {
    const job = await service.startCrawl({
      siteKey: scraper.siteKey,
      config: {
        seedUrls: [seedUrl],
        maxPages,
        maxDepth: 2,
        allowedDomains: [new URL(seedUrl).hostname.replace(/^www\./, '')],
        includePatterns: [],
        excludePatterns: ['/login', '/admin'],
        metadata: { scraperId: scraper.id },
      },
    });

    const completed = await service.waitFor(job.id);
    const rows = storedPropertiesToScrapedRows(
      service.getStorage().propertyRows.filter((p) => p.jobId === job.id)
    );

    return {
      ok: rows.length > 0,
      listings: rows.slice(0, maxPages),
      pageUrl: seedUrl,
      extractMethod: `crawler-v2+${getCrawlerConfig().defaultProvider}`,
      error: rows.length ? undefined : completed.errors.at(-1)?.message ?? 'no listings parsed',
    };
  } catch (cause) {
    return {
      ok: false,
      listings: [],
      extractMethod: 'crawler-v2',
      error: String(cause),
    };
  }
}
