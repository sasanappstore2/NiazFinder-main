import type { RegionalFilingScraper } from '@prisma/client';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';

export function schedulePhoneReenrichForScraper(scraper: RegionalFilingScraper): void {
  void (async () => {
    const { reenrichFilingPhonesForScraper, scraperCanFetchDetail } = await import(
      '@/lib/filing/ingest/enrich-pipeline'
    );
    if (!scraperCanFetchDetail(scraper)) return;

    console.log(`[phone-reenrich] starting · scraper=${scraper.siteKey}`);
    const result = await reenrichFilingPhonesForScraper(scraper, { withinDays: 7 });
    await invalidateFilingCaches({
      cityId: scraper.defaultCityId,
      cityName: scraper.defaultCity,
    });
    console.log(
      `[phone-reenrich] complete · scraper=${scraper.siteKey} processed=${result.processed}`
    );
  })().catch((err) => {
    console.error(`[phone-reenrich] failed · scraper=${scraper.siteKey}:`, err);
  });
}
