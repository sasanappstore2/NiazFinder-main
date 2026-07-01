/**
 * Self-test: parseListingAttributes on detail fixtures + normalize deal/kind.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseListingAttributes } from '@/lib/filing/ingest/parse-listing-attributes';
import { normalizeScrapedListing } from '@/lib/filing/ingest/normalize-listing';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import type { RegionalFilingScraper } from '@prisma/client';

const root = process.cwd();
const fixtureDir = resolve(
  root,
  'fixtures/filing-portals/detail-samples'
);

type ExpectedSpec = {
  fileCode: string;
  dealType: string;
  propertyKind: string;
  minFieldCount: number;
  required: string[];
  forbidden?: string[];
  requiredSourceMeta?: string[];
};

const expected = JSON.parse(
  readFileSync(resolve(fixtureDir, 'expected.json'), 'utf8')
) as Record<string, ExpectedSpec>;

const scraper = {
  id: 'test',
  defaultCity: 'مشهد',
  defaultCityId: 'mashhad',
  defaultNeighborhood: 'احمدآباد',
  defaultNeighborhoodId: 'ahmadabad',
} as RegionalFilingScraper;

function fieldCount(row: Record<string, unknown>): number {
  const skip = new Set(['dealType', 'propertyKind', 'city', 'neighborhood', 'location']);
  return Object.entries(row).filter(
    ([k, v]) => !skip.has(k) && v != null && v !== ''
  ).length;
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

for (const [name, spec] of Object.entries(expected)) {
  const html = readFileSync(resolve(fixtureDir, `${name}.html`), 'utf8');
  const parsed = parseListingAttributes(html);
  assert(String(parsed.fileCode) === spec.fileCode, `${name}: fileCode`);
  assert(parsed.dealType === spec.dealType, `${name}: dealType=${parsed.dealType}`);
  assert(parsed.propertyKind === spec.propertyKind, `${name}: kind=${parsed.propertyKind}`);
  for (const key of spec.required) {
    assert(Boolean((parsed as Record<string, unknown>)[key]), `${name}: missing ${key}`);
  }
  for (const key of spec.forbidden ?? []) {
    assert(!(parsed as Record<string, unknown>)[key], `${name}: forbidden ${key}`);
  }
  const meta = (parsed.sourceMeta ?? {}) as Record<string, unknown>;
  for (const key of spec.requiredSourceMeta ?? []) {
    assert(Boolean(meta[key]), `${name}: missing sourceMeta.${key}`);
  }
  assert(fieldCount(parsed) >= spec.minFieldCount, `${name}: field count ${fieldCount(parsed)}`);

  const row: ScrapedFilingRow = {
    externalId: spec.fileCode,
    fileCode: spec.fileCode,
    title: html.match(/<h1>([^<]+)/)?.[1] ?? name,
    ...parsed,
  };
  const normalized = normalizeScrapedListing(row, scraper);
  assert(normalized.dealType === spec.dealType, `${name}: normalize dealType`);
  console.log(`[OK] ${name}: deal=${normalized.dealType} fields=${fieldCount(parsed)}`);
}

// رهن کامل must win when both رهن کامل label and اجاره text appear
const rahnFullMixed = parseListingAttributes(
  'رهن کامل: 500000000 مبلغ اجاره: 12000000 آپارتمان 90 متری'
);
assert(rahnFullMixed.dealType === 'rent_rahn_full', 'rahn full before rent combo');

console.log('[OK] filing-attributes self-test passed');
