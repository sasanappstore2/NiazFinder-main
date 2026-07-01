import { db } from '@/lib/db';
import {
  fetchFilingDetailEnrich,
  type ScrapedFilingRow,
} from '@/lib/filing/ingest/estate-scrape-filing-client';
import { decryptScraperPassword } from '@/lib/filing/ingest/credentials';
import { importScrapedFilings } from '@/lib/filing/ingest/runner';
import { scraperSiteConfigForEstateScrape } from '@/lib/filing/ingest/scheduler';
import {
  countFilingsNeedingEnrich,
  filingWithinDaysWhere,
  reconcileFilingMetadataForScraper,
} from '@/lib/filing/ingest/post-import-sync';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';
import type { RegionalFiling, RegionalFilingScraper } from '@prisma/client';

const DEFAULT_MIN_COMPLETENESS = 75;
const DEFAULT_ENRICH_DELAY_MS = 800;

function scraperCanFetchDetail(scraper: RegionalFilingScraper): boolean {
  return Boolean(scraper.username?.trim() && scraper.passwordEnc);
}

export { scraperCanFetchDetail };

function parseSourceMetaJson(json: string | null | undefined): Record<string, unknown> {
  if (!json?.trim()) return {};
  try {
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function hasPhoneMeta(meta: Record<string, unknown> | null | undefined): boolean {
  return Boolean(
    String(meta?.brokerPhone ?? '').trim() || String(meta?.ownerPhone ?? '').trim()
  );
}

function maskanyabanDetailUrl(row: RegionalFiling): string {
  const ext = row.externalId?.trim() || row.fileCode?.trim();
  if (ext) return `https://maskanyaban.ir/home/${ext}/`;
  const raw = row.detailUrl?.trim();
  if (!raw) return '';
  const m = raw.match(/\/home\/(\d+)/i);
  if (m?.[1]) return `https://maskanyaban.ir/home/${m[1]}/`;
  return raw;
}

export function regionalFilingToScrapedRow(row: RegionalFiling): ScrapedFilingRow {
  return {
    externalId: row.externalId ?? row.fileCode ?? row.id,
    fileCode: row.fileCode,
    title: row.title,
    description: row.description,
    dealType: row.dealType,
    propertyKind: row.propertyKind,
    city: row.city,
    neighborhood: row.neighborhood,
    location: row.location,
    price: row.price,
    deposit: row.deposit,
    monthlyRent: row.monthlyRent,
    area: row.area,
    rooms: row.rooms,
    floor: row.floor,
    pricePerMeter: row.pricePerMeter,
    totalFloors: row.totalFloors,
    unitsCount: row.unitsCount,
    buildingAge: row.buildingAge,
    documentType: row.documentType,
    cabinet: row.cabinet,
    flooring: row.flooring,
    wallCover: row.wallCover,
    facade: row.facade,
    orientation: row.orientation,
    heating: row.heating,
    cooling: row.cooling,
    exchangeable: row.exchangeable,
    hasParking: row.hasParking,
    hasStorage: row.hasStorage,
    hasElevator: row.hasElevator,
    hasSecurityDoor: row.hasSecurityDoor,
    hasTerrace: row.hasTerrace,
    hasBuiltInWardrobe: row.hasBuiltInWardrobe,
    detailUrl: maskanyabanDetailUrl(row),
    image: row.image,
    images: (() => {
      try {
        return row.imagesJson ? (JSON.parse(row.imagesJson) as string[]) : [];
      } catch {
        return [];
      }
    })(),
    sourceMeta: parseSourceMetaJson(row.sourceMetaJson),
  };
}

function isEnrichedRow(row: ScrapedFilingRow): boolean {
  return Boolean(
    hasPhoneMeta(row.sourceMeta) ||
      row.description?.trim() ||
      row.totalFloors != null ||
      row.cabinet?.trim() ||
      row.heating?.trim() ||
      row.cooling?.trim() ||
      row.flooring?.trim() ||
      row.documentType?.trim() ||
      row.buildingAge != null ||
      (row.images?.length ?? 0) > 0
  );
}

function gainedPhoneFields(base: ScrapedFilingRow, merged: ScrapedFilingRow): boolean {
  const prev = base.sourceMeta ?? {};
  const next = merged.sourceMeta ?? {};
  const broker = String(next.brokerPhone ?? '').trim();
  const owner = String(next.ownerPhone ?? '').trim();
  if (broker && broker !== String(prev.brokerPhone ?? '').trim()) return true;
  if (owner && owner !== String(prev.ownerPhone ?? '').trim()) return true;
  return false;
}

function gainedDetailFields(base: ScrapedFilingRow, merged: ScrapedFilingRow): boolean {
  if (isEnrichedRow(merged) && !isEnrichedRow(base)) return true;
  const detailKeys = [
    'description',
    'totalFloors',
    'cabinet',
    'heating',
    'cooling',
    'flooring',
    'documentType',
    'buildingAge',
    'wallCover',
    'facade',
    'orientation',
  ] as const;
  for (const key of detailKeys) {
    const next = merged[key];
    const prev = base[key];
    if (next != null && String(next).trim() !== String(prev ?? '').trim()) return true;
  }
  if (gainedPhoneFields(base, merged)) return true;
  return (merged.images?.length ?? 0) > (base.images?.length ?? 0);
}

export async function enrichFilingRowFromDetail(
  scraper: RegionalFilingScraper,
  listing: ScrapedFilingRow
): Promise<ScrapedFilingRow | null> {
  const detailUrl = listing.detailUrl?.trim();
  if (!detailUrl) return null;
  if (!scraperCanFetchDetail(scraper)) return null;

  const result = await fetchFilingDetailEnrich({
    siteKey: scraper.siteKey,
    listing,
    siteConfig: scraperSiteConfigForEstateScrape(scraper.siteConfigJson) as Record<string, unknown>,
    loginUrl: scraper.loginUrl,
    username: scraper.username,
    password: scraper.passwordEnc ? decryptScraperPassword(scraper.passwordEnc) : '',
  });

  if (!result.ok || !result.listing) return null;
  return { ...listing, ...result.listing, detailUrl };
}

export async function enrichRegionalFilingsBatch(
  scraper: RegionalFilingScraper,
  opts?: {
    limit?: number;
    minCompleteness?: number;
    fileCode?: string;
    delayMs?: number;
    withinDays?: number;
    concurrency?: number;
    reenrichOnly?: boolean;
  }
): Promise<{ enriched: number; skipped: number; errors: string[] }> {
  const limit = opts?.limit ?? 20;
  const minCompleteness = opts?.minCompleteness ?? DEFAULT_MIN_COMPLETENESS;
  const canFetchDetail = scraperCanFetchDetail(scraper);
  const delayMs = canFetchDetail ? (opts?.delayMs ?? DEFAULT_ENRICH_DELAY_MS) : 0;
  const concurrency = canFetchDetail
    ? Math.max(1, Math.min(8, opts?.concurrency ?? 1))
    : Math.max(1, Math.min(32, opts?.concurrency ?? 16));

  if (!canFetchDetail && !opts?.fileCode) {
    console.warn(
      '[enrich] no portal credentials — marking list rows as attempted without detail fetch'
    );
  }

  const incompleteOr: Array<Record<string, unknown>> = opts?.fileCode
    ? []
    : opts?.reenrichOnly
      ? [
          { enrichedAt: { not: null } },
          {
            OR: [
              { dataCompleteness: { lt: minCompleteness } },
              { description: null },
            ],
          },
        ]
      : [{ enrichedAt: null }];

  const where = {
    scraperId: scraper.id,
    status: { in: ['active', 'pending_review'] },
    ...(opts?.fileCode
      ? { fileCode: opts.fileCode }
      : {
          AND: [
            ...(opts?.withinDays ? [filingWithinDaysWhere(opts.withinDays)] : []),
            { OR: incompleteOr },
          ],
        }),
  };

  const candidates = await db.regionalFiling.findMany({
    where,
    orderBy: [{ enrichedAt: 'asc' }, { dataCompleteness: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });

  let enriched = 0;
  let skipped = 0;
  const errors: string[] = [];

  async function enrichOne(row: (typeof candidates)[number], index: number): Promise<void> {
    const base = regionalFilingToScrapedRow(row);
    const attemptedAt = new Date().toISOString();

    if (!base.detailUrl?.trim()) {
      await importScrapedFilings(scraper, [{ ...base, enrichedAt: attemptedAt }]);
      skipped += 1;
      return;
    }

    if (index > 0 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }

    try {
      const merged = await enrichFilingRowFromDetail(scraper, base);
      const payload = { ...(merged ?? base), enrichedAt: attemptedAt };
      await importScrapedFilings(scraper, [payload]);
      if (merged && gainedDetailFields(base, merged)) {
        enriched += 1;
      } else {
        skipped += 1;
      }
    } catch (err) {
      await importScrapedFilings(scraper, [{ ...base, enrichedAt: attemptedAt }]).catch(() => {});
      errors.push(
        `${row.fileCode ?? row.id}: ${err instanceof Error ? err.message : 'enrich failed'}`
      );
      skipped += 1;
    }
  }

  let cursor = 0;
  async function worker(): Promise<void> {
    while (cursor < candidates.length) {
      const index = cursor;
      cursor += 1;
      await enrichOne(candidates[index]!, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()));

  if (enriched > 0) {
    await invalidateFilingCaches({
      cityId: scraper.defaultCityId,
      cityName: scraper.defaultCity,
    });
  }

  return { enriched, skipped, errors };
}

export async function enrichFilingsUntilComplete(
  scraper: RegionalFilingScraper,
  opts?: {
    withinDays?: number;
    limit?: number;
    maxRounds?: number;
    minCompleteness?: number;
    delayMs?: number;
    concurrency?: number;
  }
): Promise<{ rounds: number; totalEnriched: number; totalSkipped: number; remaining: number }> {
  const limit = opts?.limit ?? 25;
  const maxRounds = opts?.maxRounds ?? 500;
  const minCompleteness = opts?.minCompleteness ?? DEFAULT_MIN_COMPLETENESS;
  const delayMs = opts?.delayMs ?? DEFAULT_ENRICH_DELAY_MS;
  const concurrency = opts?.concurrency ?? 5;
  const withinDays = opts?.withinDays;

  let rounds = 0;
  let totalEnriched = 0;
  let totalSkipped = 0;

  while (rounds < maxRounds) {
    const firstPassRemaining = await countFilingsNeedingEnrich(scraper.id, {
      withinDays,
      minCompleteness,
      phase: 'first',
    });
    if (firstPassRemaining === 0 && !scraperCanFetchDetail(scraper)) break;

    const reenrichOnly = firstPassRemaining === 0;

    rounds += 1;
    const result = await enrichRegionalFilingsBatch(scraper, {
      limit,
      minCompleteness,
      delayMs,
      withinDays,
      concurrency,
      reenrichOnly,
    });
    totalEnriched += result.enriched;
    totalSkipped += result.skipped;

    console.log(
      `[enrich-until-complete] round ${rounds}: enriched=${result.enriched} skipped=${result.skipped} errors=${result.errors.length}`
    );

    if (result.enriched === 0 && result.skipped === 0 && result.errors.length === 0) break;
  }

  await reconcileFilingMetadataForScraper(scraper, { withinDays });

  const remainingFirst = await countFilingsNeedingEnrich(scraper.id, {
    withinDays,
    minCompleteness,
    phase: 'first',
  });
  const remainingReenrich = await countFilingsNeedingEnrich(scraper.id, {
    withinDays,
    minCompleteness,
    phase: 'reenrich',
  });

  return { rounds, totalEnriched, totalSkipped, remaining: remainingFirst + remainingReenrich };
}

export async function enrichAfterListImport(
  scraper: RegionalFilingScraper,
  importedExternalIds: string[],
  opts?: { limit?: number }
): Promise<number> {
  if (!importedExternalIds.length) return 0;

  const blueprint = scraperSiteConfigForEstateScrape(scraper.siteConfigJson) as {
    detailPage?: { enabled?: boolean; enrichAfterImport?: boolean };
  };
  const detailPage = blueprint.detailPage ?? {};
  if (!detailPage.enabled || detailPage.enrichAfterImport === false) return 0;

  const rows = await db.regionalFiling.findMany({
    where: {
      scraperId: scraper.id,
      externalId: { in: importedExternalIds },
      enrichedAt: null,
    },
    take: opts?.limit ?? (Number(process.env.FILING_ENRICH_BATCH_SIZE ?? 20) || 20),
  });

  let count = 0;
  for (const row of rows) {
    const merged = await enrichFilingRowFromDetail(scraper, regionalFilingToScrapedRow(row));
    if (!merged) continue;
    await importScrapedFilings(scraper, [{ ...merged, enrichedAt: new Date().toISOString() }]);
    count += 1;
    await new Promise((r) => setTimeout(r, DEFAULT_ENRICH_DELAY_MS));
  }
  return count;
}

async function loadFilingsMissingPhones(
  scraperId: string,
  withinDays: number,
  limit: number
): Promise<RegionalFiling[]> {
  const rows = await db.regionalFiling.findMany({
    where: {
      scraperId,
      status: { in: ['active', 'pending_review'] },
      AND: [filingWithinDaysWhere(withinDays)],
    },
    orderBy: [{ enrichedAt: 'asc' }, { updatedAt: 'asc' }],
    take: Math.max(limit * 4, limit),
  });

  return rows
    .filter((row) => !hasPhoneMeta(parseSourceMetaJson(row.sourceMetaJson)))
    .slice(0, limit);
}

export async function reenrichFilingPhonesForScraper(
  scraper: RegionalFilingScraper,
  opts?: { withinDays?: number; limit?: number; maxRounds?: number; delayMs?: number }
): Promise<{ processed: number; rounds: number }> {
  if (!scraperCanFetchDetail(scraper)) {
    return { processed: 0, rounds: 0 };
  }

  const withinDays = opts?.withinDays ?? 7;
  const limit = opts?.limit ?? 40;
  const maxRounds = opts?.maxRounds ?? 200;
  const delayMs = opts?.delayMs ?? DEFAULT_ENRICH_DELAY_MS;
  let processed = 0;
  let rounds = 0;

  while (rounds < maxRounds) {
    const batch = await loadFilingsMissingPhones(scraper.id, withinDays, limit);
    if (!batch.length) break;

    rounds += 1;
    let roundProcessed = 0;

    for (const row of batch) {
      const base = regionalFilingToScrapedRow(row);
      if (!base.detailUrl?.trim()) continue;

      const merged = await enrichFilingRowFromDetail(scraper, base);
      if (!merged) continue;

      await importScrapedFilings(scraper, [
        { ...merged, enrichedAt: new Date().toISOString() },
      ]);

      if (gainedPhoneFields(base, merged) || hasPhoneMeta(merged.sourceMeta)) {
        processed += 1;
        roundProcessed += 1;
      }

      if (delayMs > 0) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    console.log(
      `[phone-reenrich] round ${rounds}: processed=${roundProcessed} remaining-check=${batch.length}`
    );

    if (roundProcessed === 0) break;
  }

  if (processed > 0) {
    await invalidateFilingCaches({
      cityId: scraper.defaultCityId,
      cityName: scraper.defaultCity,
    });
  }

  return { processed, rounds };
}
