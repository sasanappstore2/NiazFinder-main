/**
 * Live MaskanYaban crawl: upsert scraper → fetch N listings → import → field coverage report.
 *
 * Usage:
 *   npm run test:filing-maskanyaban-live
 *   npx tsx src/lib/filing-scrapers/fixtures/run-maskanyaban-live-crawl.ts --max-items=50 --verify-sample=50
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import {
  fetchFilingFeedScrape,
  type ScrapedFilingRow,
} from '@/lib/filing/ingest/estate-scrape-filing-client';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';
import { scraperSiteConfigForEstateScrape } from '@/lib/filing/ingest/scheduler';

const SITE_KEY = 'maskanyaban';
const LOGIN_URL = 'https://maskanyaban.ir/Account/Login';
const LISTINGS_URL = 'https://maskanyaban.ir/estate/all/all/';
const DEFAULT_CITY = 'مشهد';
const REPORT_PATH = join(process.cwd(), 'tmp', 'maskanyaban-50-report.json');

const COVERAGE_FIELDS: Array<keyof ScrapedFilingRow | 'neighborhood' | 'description'> = [
  'fileCode',
  'dealType',
  'propertyKind',
  'area',
  'location',
  'neighborhood',
  'price',
  'deposit',
  'monthlyRent',
  'pricePerMeter',
  'rooms',
  'floor',
  'buildingAge',
  'documentType',
  'description',
  'cabinet',
  'orientation',
  'hasParking',
  'hasElevator',
  'hasStorage',
  'sourceMeta',
];

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function fieldPresent(row: ScrapedFilingRow, field: (typeof COVERAGE_FIELDS)[number]): boolean {
  if (field === 'sourceMeta') {
    const meta = row.sourceMeta;
    return Boolean(meta && Object.keys(meta).length > 0);
  }
  const val = row[field as keyof ScrapedFilingRow];
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return Number.isFinite(val);
  return Boolean(val);
}

function computeCoverage(rows: ScrapedFilingRow[]): Record<string, { count: number; pct: number }> {
  const out: Record<string, { count: number; pct: number }> = {};
  const total = rows.length || 1;
  for (const field of COVERAGE_FIELDS) {
    const count = rows.filter((row) => fieldPresent(row, field)).length;
    out[field] = { count, pct: Math.round((count / total) * 1000) / 10 };
  }
  return out;
}

function dealKindMatrix(rows: ScrapedFilingRow[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = `${row.dealType ?? 'unknown'}:${row.propertyKind ?? 'unknown'}`;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

type SourceCard = {
  fileCode: string;
  dealType?: string | null;
  area?: string | null;
  price?: string | null;
  deposit?: string | null;
  monthlyRent?: string | null;
  location?: string | null;
};

async function fetchSourceCards(limit: number): Promise<Map<string, SourceCard>> {
  const map = new Map<string, SourceCard>();
  const warmup = await fetch(LISTINGS_URL);
  void warmup;
  const pages = Math.ceil(limit / 20) + 1;
  for (let page = 1; page <= pages && map.size < limit; page++) {
    const res = await fetch(`https://maskanyaban.ir/Melk/_SelectAll?page=${page}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': '0',
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'text/html',
        Referer: LISTINGS_URL,
      },
    });
    if (!res.ok) break;
    const html = await res.text();
    const cardRe =
      /<a id="(\d+)"[^>]*href="([^"]*)"[^>]*>[\s\S]*?کد فایل:<span>(\d+)<\/span>[\s\S]*?(?=<a id="\d+"|$)/g;
    let m: RegExpExecArray | null;
    while ((m = cardRe.exec(html)) && map.size < limit) {
      const block = m[0];
      const fileCode = m[3] ?? m[1]!;
      map.set(fileCode, {
        fileCode,
        dealType: block.match(/class="small">([^<]*(?:فروش|رهن)[^<]*)</)?.[1]?.trim() ?? null,
        area: block.match(/class="large">(\d+)</)?.[1] ?? null,
        price: block.match(/مبلغ کل:[\s\S]*?PriceKama">(\d+)/)?.[1] ?? null,
        deposit: block.match(/مبلغ رهن:[\s\S]*?PriceKama">(\d+)/)?.[1] ?? null,
        monthlyRent: block.match(/مبلغ اجاره:[\s\S]*?PriceKama">(\d+)/)?.[1] ?? null,
        location: block.match(/<h2[^>]*>\s*([^<]+)\s*<\/h2>/)?.[1]?.trim() ?? null,
      });
    }
  }
  return map;
}

function normMoney(v: string | null | undefined): string | null {
  if (!v) return null;
  return v.replace(/[^\d]/g, '') || null;
}

async function verifyAgainstSource(
  rows: ScrapedFilingRow[],
  sampleSize: number
): Promise<{ ok: number; fail: number; issues: string[] }> {
  const source = await fetchSourceCards(Math.max(sampleSize * 2, 60));
  const sample = rows.slice(0, sampleSize);
  let ok = 0;
  let fail = 0;
  const issues: string[] = [];

  for (const row of sample) {
    const code = String(row.fileCode ?? row.externalId ?? '').trim();
    const src = source.get(code);
    if (!src) {
      fail++;
      issues.push(`${code}: not found in source API`);
      continue;
    }

    const mismatches: string[] = [];
    if (normMoney(row.area) !== normMoney(src.area)) mismatches.push(`area`);
    if (src.price && normMoney(row.price) !== normMoney(src.price)) mismatches.push(`price`);
    if (src.deposit && normMoney(row.deposit) !== normMoney(src.deposit)) mismatches.push(`deposit`);
    if (src.monthlyRent && normMoney(row.monthlyRent) !== normMoney(src.monthlyRent)) {
      mismatches.push(`monthlyRent`);
    }

    if (mismatches.length) {
      fail++;
      issues.push(`${code}: ${mismatches.join(', ')}`);
    } else {
      ok++;
    }
  }

  return { ok, fail, issues };
}

async function main() {
  const maxItems = parseArg('max-items', 50);
  const verifySample = parseArg('verify-sample', 50);
  const db = new PrismaClient();

  try {
    const blueprintJson = JSON.stringify(MASKANYABAN_BLUEPRINT);
    const scraper = await db.regionalFilingScraper.upsert({
      where: { siteKey: SITE_KEY },
      create: {
        name: 'مسکن‌یابان مشهد',
        siteKey: SITE_KEY,
        enabled: true,
        loginUrl: LOGIN_URL,
        listingsUrl: LISTINGS_URL,
        username: '',
        passwordEnc: null,
        siteConfigJson: blueprintJson,
        defaultCity: DEFAULT_CITY,
        intervalMinutes: 15,
        jitterMinutes: 5,
        status: 'idle',
      },
      update: {
        loginUrl: LOGIN_URL,
        listingsUrl: LISTINGS_URL,
        siteConfigJson: blueprintJson,
        defaultCity: DEFAULT_CITY,
        enabled: true,
      },
    });

    const siteConfig = scraperSiteConfigForEstateScrape(blueprintJson);
    const direct = await fetchFilingFeedScrape({
      siteKey: SITE_KEY,
      loginUrl: LOGIN_URL,
      listingsUrl: LISTINGS_URL,
      username: scraper.username ?? '',
      password: '',
      siteConfig,
      maxItems,
    });

    if (!direct.ok || !direct.listings.length) {
      throw new Error(direct.error ?? 'estate-scrape returned no listings');
    }

    console.log(`[scrape] ${direct.listings.length} rows via ${direct.extractMethod ?? 'unknown'}`);

    const imported = await importScrapedFilings(scraper, direct.listings);
    console.log(`[import] upserted ${imported} filings`);

    const coverage = computeCoverage(direct.listings);
    const ownerCount = direct.listings.filter((r) => r.sourceMeta?.ownerAddress).length;
    const verify = await verifyAgainstSource(direct.listings, verifySample);

    const report = {
      generatedAt: new Date().toISOString(),
      maxItems,
      imported,
      extractMethod: direct.extractMethod,
      coverage,
      dealKindMatrix: dealKindMatrix(direct.listings),
      verification: { sample: verifySample, ok: verify.ok, fail: verify.fail, issues: verify.issues.slice(0, 20) },
      ownerAddressRate: direct.listings.length
        ? Math.round((ownerCount / direct.listings.length) * 1000) / 10
        : 0,
    };

    mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`[report] ${REPORT_PATH}`);

    for (const [field, stat] of Object.entries(coverage)) {
      console.log(`  ${field}: ${stat.pct}% (${stat.count}/${direct.listings.length})`);
    }
    console.log(`[verify] ${verify.ok}/${verifySample} matched list cards`);

    const critical = ['fileCode', 'dealType', 'propertyKind', 'area', 'location'];
    const criticalFail = critical.some((f) => (coverage[f]?.pct ?? 0) < 95);
    if (criticalFail || verify.fail > Math.floor(verifySample * 0.1)) {
      process.exitCode = 1;
    }
  } finally {
    await db.$disconnect();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
