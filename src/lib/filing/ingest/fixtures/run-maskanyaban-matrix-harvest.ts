/**
 * Matrix harvest: all MaskanYaban deal × property-kind cells within N days.
 *
 * Usage:
 *   npm run harvest:filing-maskanyaban-matrix
 *   npx tsx src/lib/filing/ingest/fixtures/run-maskanyaban-matrix-harvest.ts --within-days=100 --import
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
  'fixtures/filing-portals/maskanyaban/100d-harvest/manifest.json'
);

type ManifestListing = {
  cellKey: string;
  fileCode: string;
  dealType?: string | null;
  propertyKind?: string | null;
  listingFile: string;
};

type Manifest = {
  generatedAt: string;
  withinDays: number;
  listingCount: number;
  filledCells: number;
  matrixSize: number;
  globalFieldRates: Record<string, number>;
  cells: Array<{
    cellKey: string;
    harvested: number;
    fieldRates: Record<string, number>;
    fileCodes: string[];
  }>;
  listings: ManifestListing[];
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

function runPythonHarvest(withinDays: number, maxPerCell: number, maxPages: number): void {
  const estateDir = join(process.cwd(), 'mini-services/estate-scrape');
  const py = join(estateDir, '.venv/bin/python');
  const args = [
    '-m',
    'app.filing_feed.run_maskanyaban_matrix_harvest',
    `--within-days=${withinDays}`,
    `--max-per-cell=${maxPerCell}`,
    `--max-pages=${maxPages}`,
  ];
  if (hasFlag('no-details')) args.push('--no-details');

  const result = spawnSync(py, args, {
    cwd: estateDir,
    env: { ...process.env, PYTHONPATH: '.' },
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(result.stderr || 'matrix harvest failed');
  }
}

function loadManifest(path = MANIFEST_PATH): Manifest {
  if (!existsSync(path)) {
    throw new Error(`manifest not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8')) as Manifest;
}

function loadListingFromManifest(entry: ManifestListing, root: string): ScrapedFilingRow {
  const listingPath = join(root, entry.listingFile);
  return JSON.parse(readFileSync(listingPath, 'utf8')) as ScrapedFilingRow;
}

async function importManifest(manifest: Manifest): Promise<number> {
  const db = new PrismaClient();
  const fixtureRoot = join(process.cwd(), 'fixtures/filing-portals/maskanyaban/100d-harvest');
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
        siteConfigJson: blueprintJson,
        enabled: true,
      },
    });

    const rows = manifest.listings.map((entry) => loadListingFromManifest(entry, fixtureRoot));
    if (!rows.length) return 0;
    return importScrapedFilings(scraper, rows);
  } finally {
    await db.$disconnect();
  }
}

async function main(): Promise<void> {
  const withinDays = parseArg('within-days', 100);
  const maxPerCell = parseArg('max-per-cell', 40);
  const maxPages = parseArg('max-pages', 50);
  const skipHarvest = hasFlag('skip-harvest');

  if (!skipHarvest) {
    console.log(`[matrix-harvest] within=${withinDays}d perCell=${maxPerCell} pages=${maxPages}`);
    runPythonHarvest(withinDays, maxPerCell, maxPages);
  }

  const manifest = loadManifest();
  console.log(
    `[matrix-harvest] manifest: ${manifest.listingCount} listings, ${manifest.filledCells}/${manifest.matrixSize} cells`
  );

  for (const cell of manifest.cells ?? []) {
    const topFields = Object.entries(cell.fieldRates ?? {})
      .filter(([, rate]) => rate >= 0.5)
      .slice(0, 6)
      .map(([k, v]) => `${k}:${Math.round(v * 100)}%`)
      .join(', ');
    console.log(`  ${cell.cellKey}: ${cell.harvested} (${topFields || '—'})`);
  }

  if (hasFlag('import')) {
    const imported = await importManifest(manifest);
    console.log(`[matrix-harvest] imported ${imported} filings`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
