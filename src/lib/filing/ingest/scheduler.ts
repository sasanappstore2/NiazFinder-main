import type { RegionalFilingScraper } from '@prisma/client';
import {
  blueprintToSiteConfig,
  parseCrawlBlueprint,
  type CrawlBlueprint,
} from '@/lib/filing/ingest/crawl-blueprint';

export type FilingScraperSiteConfig = CrawlBlueprint & Record<string, unknown>;

export function parseScraperSiteConfig(json: string): FilingScraperSiteConfig {
  return parseCrawlBlueprint(json) as FilingScraperSiteConfig;
}

export function scraperSiteConfigForEstateScrape(json: string): Record<string, unknown> {
  return blueprintToSiteConfig(parseCrawlBlueprint(json));
}

/** Due when interval elapsed since lastRunAt (jitter applied at run time in scheduler). */
export function scraperIsDue(scraper: Pick<
  RegionalFilingScraper,
  'enabled' | 'status' | 'lastRunAt' | 'intervalMinutes'
>): boolean {
  if (!scraper.enabled) return false;
  if (scraper.status === 'running') return false;
  if (!scraper.lastRunAt) return true;

  const elapsed = Date.now() - scraper.lastRunAt.getTime();
  return elapsed >= scraper.intervalMinutes * 60_000;
}

export function formatScraperStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'در حال اجرا';
    case 'ok':
      return 'موفق';
    case 'error':
      return 'خطا';
    default:
      return 'آماده';
  }
}
