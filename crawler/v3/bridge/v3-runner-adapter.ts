import type { RegionalFilingScraper } from '@prisma/client';
import type { ScrapedFilingRow } from '@/lib/filing-scrapers/estate-scrape-filing-client';
import { decryptScraperPassword } from '@/lib/filing-scrapers/credentials';
import { getPlatformConfigV3, isCrawlerV3Enabled } from '../config/loader';
import { CrawlerPlatformService } from '../api/platform-service';
import { crawlSourceSchema } from '../domain/crawl-source';

export type V3ScrapeResult = {
  ok: boolean;
  listings: ScrapedFilingRow[];
  pageUrl?: string;
  extractMethod: string;
  error?: string;
};

export function isCrawlerPlatformV3Enabled(): boolean {
  return isCrawlerV3Enabled();
}

/**
 * Drop-in adapter for filing-scrapers/runner.ts — preserves ScrapedFilingRow contract.
 * Uses estate-scrape-legacy provider when source metadata includes siteConfig.
 */
export async function scrapeFilingFeedV3(
  scraper: RegionalFilingScraper,
  opts?: { maxItems?: number; seedUrl?: string }
): Promise<V3ScrapeResult> {
  const config = getPlatformConfigV3();
  const service = CrawlerPlatformService.create();

  let siteConfig: Record<string, unknown> = {};
  try {
    siteConfig = JSON.parse(scraper.siteConfigJson || '{}') as Record<string, unknown>;
  } catch {
    siteConfig = {};
  }

  const sourceId = `scraper-${scraper.siteKey}`;
  const password = scraper.passwordEnc ? decryptScraperPassword(scraper.passwordEnc) : '';
  service.registerSource(
    crawlSourceSchema.parse({
      id: sourceId,
      name: scraper.name,
      enabled: true,
      provider: 'estate-scrape-legacy',
      seedUrls: [opts?.seedUrl ?? scraper.listingsUrl],
      authenticationRequired: Boolean(scraper.username),
      crawlFrequencyMinutes: scraper.intervalMinutes,
      maxPages: opts?.maxItems ?? 100,
      metadata: {
        siteKey: scraper.siteKey,
        scraperId: scraper.id,
        loginUrl: scraper.loginUrl,
        username: scraper.username,
        password,
        siteConfig,
        knownExternalIds: [],
      },
    })
  );

  try {
    const job = await service.startCrawl({
      sourceId,
      config: {
        sourceId,
        seedUrls: [opts?.seedUrl ?? scraper.listingsUrl],
        provider: 'estate-scrape-legacy',
        maxPages: opts?.maxItems ?? 100,
        metadata: {
          siteKey: scraper.siteKey,
          scraperId: scraper.id,
          loginUrl: scraper.loginUrl,
          username: scraper.username,
          password,
          siteConfig,
        },
      },
      priority: 'high',
    });

    await service.waitFor(job.id);
    const rows = await service.exportScrapedRows(job.id);

    return {
      ok: rows.length > 0,
      listings: rows.slice(0, opts?.maxItems ?? 100),
      pageUrl: scraper.listingsUrl,
      extractMethod: `crawler-v3+estate-scrape-legacy`,
      error: rows.length ? undefined : 'no listings parsed',
    };
  } catch (cause) {
    return {
      ok: false,
      listings: [],
      extractMethod: 'crawler-v3',
      error: String(cause),
    };
  }
}
