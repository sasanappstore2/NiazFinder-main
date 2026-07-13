/**
 * Audit regional filing field coverage by deal × property kind.
 *
 * Usage:
 *   npm run audit:filing-coverage
 *   npx tsx src/lib/filing/ingest/fixtures/run-filing-coverage-audit.ts --days=100 --site=maskanyaban
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import {
  buildCellCoverageStats,
  missingFieldsOnFiling,
  type FilingCoverageRow,
} from '@/lib/filing/ingest/category-coverage';

const REPORT_PATH = join(process.cwd(), 'tmp', 'filing-coverage-report.json');

function parseArg(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split('=')[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseStringArg(name: string, fallback: string): string {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=').trim() || fallback : fallback;
}

function cellKey(row: FilingCoverageRow): string {
  return `${row.dealType ?? 'unknown'}:${row.propertyKind ?? 'unknown'}`;
}

async function main(): Promise<void> {
  const days = parseArg('days', 100);
  const siteKey = parseStringArg('site', 'maskanyaban');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const db = new PrismaClient();
  try {
    const scraper = await db.regionalFilingScraper.findUnique({ where: { siteKey } });
    if (!scraper) {
      throw new Error(`scraper not found: ${siteKey}`);
    }

    const rows = await db.regionalFiling.findMany({
      where: {
        scraperId: scraper.id,
        OR: [{ postedAt: { gte: since } }, { scrapedAt: { gte: since } }, { createdAt: { gte: since } }],
      },
      select: {
        id: true,
        dealType: true,
        propertyKind: true,
        fileCode: true,
        postedAt: true,
        dataCompleteness: true,
        enrichedAt: true,
        sourceMetaJson: true,
        title: true,
        description: true,
        price: true,
        deposit: true,
        monthlyRent: true,
        pricePerMeter: true,
        area: true,
        rooms: true,
        floor: true,
        totalFloors: true,
        unitsCount: true,
        buildingAge: true,
        documentType: true,
        cabinet: true,
        flooring: true,
        wallCover: true,
        facade: true,
        orientation: true,
        heating: true,
        cooling: true,
        exchangeable: true,
        hasParking: true,
        hasStorage: true,
        hasElevator: true,
        hasSecurityDoor: true,
        hasTerrace: true,
        hasBuiltInWardrobe: true,
        detailUrl: true,
        image: true,
        imagesJson: true,
        city: true,
        neighborhood: true,
        location: true,
      },
      orderBy: { postedAt: 'desc' },
    });

    const cellStats = buildCellCoverageStats(rows, cellKey);
    const thinRows = rows
      .map((row) => ({
        id: row.id,
        fileCode: row.fileCode,
        cellKey: cellKey(row),
        completeness: row.dataCompleteness ?? 0,
        missingRequired: missingFieldsOnFiling(row, { includeOptional: false }),
      }))
      .filter((r) => r.missingRequired.length > 0)
      .slice(0, 50);

    const report = {
      generatedAt: new Date().toISOString(),
      siteKey,
      windowDays: days,
      since: since.toISOString(),
      totalListings: rows.length,
      cellStats,
      sampleThinListings: thinRows,
    };

    mkdirSync(join(process.cwd(), 'tmp'), { recursive: true });
    writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');

    console.log(`[coverage] ${rows.length} listings in last ${days}d → ${REPORT_PATH}`);
    for (const cell of cellStats) {
      const missing = cell.topMissing
        .slice(0, 4)
        .map((m) => `${m.field}(${m.missingCount})`)
        .join(', ');
      console.log(
        `  ${cell.cellKey}: n=${cell.count} avg=${cell.avgCompleteness}% enriched=${cell.enrichedCount} missing→ ${missing || '—'}`
      );
    }

    if (!existsSync(REPORT_PATH)) {
      throw new Error('report write failed');
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
