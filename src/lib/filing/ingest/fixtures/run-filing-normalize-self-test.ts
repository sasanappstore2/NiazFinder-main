/**
 * Self-test: normalizeScrapedListing parity on fixture rows.
 */
import type { RegionalFilingScraper } from '@prisma/client';
import { normalizeScrapedListing } from '@/lib/filing/ingest/normalize-listing';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';

const scraper = {
  id: 'test',
  defaultCity: 'مشهد',
  defaultCityId: 'mashhad',
  defaultNeighborhood: 'احمدآباد',
  defaultNeighborhoodId: 'ahmadabad',
} as RegionalFilingScraper;

const rows: ScrapedFilingRow[] = [
  {
    externalId: '881201',
    fileCode: '881201',
    title: 'رهن و اجاره آپارتمان 85 متری',
    dealType: 'رهن و اجاره',
    propertyKind: 'آپارتمان',
    neighborhood: 'مشهد - احمدآباد',
    deposit: '500000000',
    monthlyRent: '15000000',
    area: '85',
  },
  {
    externalId: '881202',
    fileCode: '881202',
    title: 'فروش آپارتمان 110 متری',
    dealType: 'فروش',
    propertyKind: 'آپارتمان',
    price: '9800000000',
    area: '110',
  },
  {
    externalId: '881203',
    fileCode: '477601',
    title: 'رهن کامل آپارتمان 95 متری',
    dealType: 'رهن کامل',
    propertyKind: 'آپارتمان',
    deposit: '1200000000',
    area: '95',
  },
];

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

for (const row of rows) {
  const n = normalizeScrapedListing(row, scraper);
  assert(n.title.length >= 6, `title too short for ${row.fileCode}`);
  assert(Boolean(n.fileCode), `missing fileCode for ${row.externalId}`);
  assert(n.dealType === 'rent_rahn_ejare' || n.dealType === 'sell' || n.dealType === 'rent_rahn_full', `dealType parse failed: ${n.dealType}`);
  if (row.dealType?.includes('رهن کامل')) {
    assert(n.dealType === 'rent_rahn_full', 'rahn full misclassified');
    assert(!n.monthlyRent, 'rahn full must not have monthlyRent');
  }
  if (row.price) assert(Boolean(n.price), 'price preserved');
  if (row.deposit) assert(Boolean(n.deposit), 'deposit preserved');
}

console.log('[OK] filing-normalize self-test passed');
