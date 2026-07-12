import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { filingWithinDaysWhere } from '@/lib/filing/ingest/post-import-sync';

export function filingDelistEnabled(): boolean {
  return process.env.FILING_DELIST_ENABLED === 'true';
}

/**
 * Archives active filings for a scraper whose externalIds were absent from the latest crawl batch.
 * Only runs when FILING_DELIST_ENABLED=true and the batch is non-empty.
 */
export async function archiveStaleFilingsForScraper(
  scraperId: string,
  seenExternalIds: string[],
  opts?: { withinDays?: number }
): Promise<number> {
  if (!filingDelistEnabled()) return 0;

  const seen = new Set(seenExternalIds.map((id) => id.trim()).filter(Boolean));
  if (seen.size === 0) return 0;

  const windowFilter: Prisma.RegionalFilingWhereInput[] = opts?.withinDays
    ? [filingWithinDaysWhere(opts.withinDays)]
    : [];

  const active = await db.regionalFiling.findMany({
    where: {
      scraperId,
      status: 'active',
      ...(windowFilter.length ? { AND: windowFilter } : {}),
    },
    select: { id: true, externalId: true, fileCode: true },
  });

  const staleIds = active
    .filter((row) => {
      const ext = row.externalId?.trim() || row.fileCode?.trim();
      return ext ? !seen.has(ext) : false;
    })
    .map((row) => row.id);

  if (!staleIds.length) return 0;

  const result = await db.regionalFiling.updateMany({
    where: { id: { in: staleIds } },
    data: { status: 'archived' },
  });

  return result.count;
}
