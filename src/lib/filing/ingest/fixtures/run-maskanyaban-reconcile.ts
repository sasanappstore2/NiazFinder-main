/**
 * Reconcile categorySlug + neighborhoodId for filings in the last N days.
 */
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import {
  countFilingsNeedingEnrich,
  countFilingsWithMissingRequiredFields,
  reconcileFilingMetadataForScraper,
} from '@/lib/filing/ingest/post-import-sync';

const SITE_KEY = 'maskanyaban';

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function ensureScraper(db: PrismaClient) {
  const blueprintJson = JSON.stringify(MASKANYABAN_BLUEPRINT);
  return db.regionalFilingScraper.upsert({
    where: { siteKey: SITE_KEY },
    create: {
      name: 'مسکن‌یابان مشهد',
      siteKey: SITE_KEY,
      enabled: true,
      loginUrl: 'https://maskanyaban.ir/Account/Login',
      listingsUrl: 'https://maskanyaban.ir/estate/all/all/',
      username: '',
      passwordEnc: null,
      siteConfigJson: blueprintJson,
      defaultCity: 'مشهد',
      defaultCityId: 'mashhad',
      intervalMinutes: 15,
      jitterMinutes: 5,
      status: 'idle',
    },
    update: { siteConfigJson: blueprintJson, defaultCityId: 'mashhad' },
  });
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const db = new PrismaClient();
  try {
    const scraper = await ensureScraper(db);
    const beforeEnrich = await countFilingsNeedingEnrich(scraper.id, { withinDays: days });
    const beforeMissing = await countFilingsWithMissingRequiredFields(scraper.id, days);

    const { updated } = await reconcileFilingMetadataForScraper(scraper, {
      withinDays: days,
      limit: 2000,
    });

    const afterEnrich = await countFilingsNeedingEnrich(scraper.id, { withinDays: days });
    const afterMissing = await countFilingsWithMissingRequiredFields(scraper.id, days);

    console.log(`[reconcile] updated=${updated} metadata rows`);
    console.log(
      `[reconcile] needing-enrich: ${beforeEnrich} → ${afterEnrich} · missing-required(sample): ${beforeMissing} → ${afterMissing}`
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
