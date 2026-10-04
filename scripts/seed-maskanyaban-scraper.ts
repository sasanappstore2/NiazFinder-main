/**
 * Seed (idempotent) the MaskanYaban filing scraper row so the super-admin
 * "run" button works out of the box.
 *
 * Usage: npx tsx scripts/seed-maskanyaban-scraper.ts
 */
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';

const db = new PrismaClient();

async function main() {
  const siteKey = 'maskanyaban';
  const data = {
    name: 'مسکن یابان (مشهد)',
    siteKey,
    enabled: true,
    loginUrl: 'https://maskanyaban.ir/Account/Login',
    listingsUrl: 'https://maskanyaban.ir/estate/all/all/',
    username: '',
    passwordEnc: null,
    siteConfigJson: JSON.stringify(MASKANYABAN_BLUEPRINT),
    defaultCity: 'مشهد',
    intervalMinutes: 60,
    jitterMinutes: 5,
  };

  const row = await db.regionalFilingScraper.upsert({
    where: { siteKey },
    create: data,
    update: {
      siteConfigJson: data.siteConfigJson,
      listingsUrl: data.listingsUrl,
      loginUrl: data.loginUrl,
      enabled: true,
    },
  });

  console.log(`scraper ready: id=${row.id} siteKey=${row.siteKey} enabled=${row.enabled}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
