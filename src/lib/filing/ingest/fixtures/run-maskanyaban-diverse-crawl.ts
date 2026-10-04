/**
 * Diverse MaskanYaban crawl: all deal types × property kinds, random pages, import to DB.
 *
 * Usage:
 *   npm run crawl:filing-maskanyaban-diverse
 *   npx tsx src/lib/filing-scrapers/fixtures/run-maskanyaban-diverse-crawl.ts --per-cell=2 --import
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { MASKANYABAN_BLUEPRINT } from '@/lib/filing/ingest/blueprints/maskanyaban';
import type { ScrapedFilingRow } from '@/lib/filing/ingest/estate-scrape-filing-client';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';

const SITE_KEY = 'maskanyaban';
const LOGIN_URL = 'https://maskanyaban.ir/Account/Login';
const LISTINGS_URL = 'https://maskanyaban.ir/estate/all/all/';
const DEFAULT_CITY = 'مشهد';
const MANIFEST_PATH = join(
  process.cwd(),
  'fixtures/filing-portals/maskanyaban/diverse-samples/manifest.json'
);

type ManifestSample = {
  cellKey: string;
  fileCode: string;
  dealType?: string | null;
  propertyKind?: string | null;
  listing: ScrapedFilingRow;
};

type Manifest = {
  generatedAt: string;
  sampleCount: number;
  filledCells: number;
  matrixSize: number;
  cellStats: Record<string, { picked: number; fileCodes: string[] }>;
  samples: ManifestSample[];
};

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function runPythonCrawl(perCell: number, maxPage: number, seed?: number): void {
  const estateDir = join(process.cwd(), 'mini-services/estate-scrape');
  const py = join(estateDir, '.venv/bin/python');
  const args = [
    '-m',
    'app.filing_feed.run_maskanyaban_diverse_crawl',
    `--per-cell=${perCell}`,
    `--max-page=${maxPage}`,
  ];
  if (seed != null) args.push(`--seed=${seed}`);

  const result = spawnSync(py, args, {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(result.stderr || 'maskanyaban diverse crawl failed');
  }
}

function loadManifest(path = MANIFEST_PATH): Manifest {
  if (!existsSync(path)) {
    throw new Error(`manifest not found: ${path} — run crawl first`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

function matrixSummary(manifest: Manifest): void {
  console.log('\n[matrix] cell coverage:');
  for (const [key, stat] of Object.entries(manifest.cellStats)) {
    const codes = stat.fileCodes?.join(', ') || '—';
    console.log(`  ${key}: ${stat.picked} (${codes})`);
  }
}

async function importManifest(manifest: Manifest): Promise<number> {
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

    const rows: ScrapedFilingRow[] = manifest.samples.map((s) => ({
      externalId: String(s.listing.fileCode ?? s.listing.externalId ?? s.fileCode),
      ...s.listing,
      dealType: s.listing.dealType ?? s.dealType ?? null,
      propertyKind: s.listing.propertyKind ?? s.propertyKind ?? null,
    }));

    const imported = await importScrapedFilings(scraper, rows);
    return imported;
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const perCell = parseArg('per-cell', 2);
  const maxPage = parseArg('max-page', 20);
  const seedArg = process.argv.find((a) => a.startsWith('--seed='));
  const seed = seedArg ? Number(seedArg.split('=')[1]) : undefined;
  const skipCrawl = hasFlag('import-only');

  if (!skipCrawl) {
    console.log(`[crawl] per-cell=${perCell} max-page=${maxPage}`);
    runPythonCrawl(perCell, maxPage, Number.isFinite(seed) ? seed : undefined);
  }

  const manifest = loadManifest();
  console.log(
    `[manifest] ${manifest.sampleCount} samples, ${manifest.filledCells}/${manifest.matrixSize} cells @ ${manifest.generatedAt}`
  );
  matrixSummary(manifest);

  if (hasFlag('import') || hasFlag('import-only')) {
    const imported = await importManifest(manifest);
    console.log(`[import] upserted ${imported} regional filings`);
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
