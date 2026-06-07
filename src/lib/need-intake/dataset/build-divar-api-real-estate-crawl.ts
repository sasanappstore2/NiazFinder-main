import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CITIES } from '@/config/locations';
import { DIVAR_API_REAL_ESTATE_CATEGORIES } from '../../../../scripts/divar/divar-api-categories';
import {
  divarCityIdForSlug,
  fetchDivarPostlistAllPages,
  loadDivarCityIdMap,
} from '../../../../scripts/divar/lib/api-client';
import { extractPostsFromDivarApiResponses } from '../../../../scripts/divar/lib/extract-api-posts';
import { sleep } from '../../../../scripts/divar/lib/crawl-client';
import {
  buildDivarNeedFixture,
  type DivarNeedSourcePost,
} from './divar-need-transform';
import type { DatasetFixture } from './schema';
import { normalizeInput } from './shared/normalize-input';
import {
  dedupeRealEstateFixtures,
  validateRealEstateBatch,
} from './validate-real-estate-fixture';
import {
  REAL_ESTATE_100K_DIR,
  type CrawlBatchInfo,
} from './build-divar-real-estate-crawl';

export const REAL_ESTATE_API_CHUNKS_DIR = join(REAL_ESTATE_100K_DIR, 'api-chunks');
export const REAL_ESTATE_API_RAW_DIR = join(REAL_ESTATE_100K_DIR, 'api-raw');
export const REAL_ESTATE_API_CRAWL_MANIFEST = join(REAL_ESTATE_100K_DIR, 'api-crawl-manifest.json');

const NEED_OPENER_VARIANTS = 5;

export interface CrawlDivarApiRealEstateOptions {
  cities?: string[];
  delayMs?: number;
  maxPages?: number;
  perPageLimit?: number;
  openerVariants?: number;
  resume?: boolean;
  onBatchComplete?: (info: CrawlBatchInfo & { source: 'divar-api' }) => void;
}

function apiChunkPath(citySlug: string, nfSlug: string): string {
  return join(REAL_ESTATE_API_CHUNKS_DIR, `${citySlug}__${nfSlug}.json`);
}

function loadChunk(path: string): DatasetFixture[] {
  if (!existsSync(path)) return [];
  try {
    const rows = JSON.parse(readFileSync(path, 'utf8')) as DatasetFixture[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

/** Crawl Divar postlist API with pagination → need-seeker fixtures. */
export async function crawlDivarApiRealEstateNeedDataset(
  options: CrawlDivarApiRealEstateOptions = {}
): Promise<{ fixtures: DatasetFixture[]; manifest: Record<string, unknown> }> {
  const cities = options.cities ?? CANONICAL_CITIES.map((c) => c.slug);
  const delayMs = options.delayMs ?? 1_200;
  const maxPages = options.maxPages ?? 20;
  const perPageLimit = options.perPageLimit ?? 250;
  const openerVariants = options.openerVariants ?? NEED_OPENER_VARIANTS;
  const resume = options.resume ?? true;

  mkdirSync(REAL_ESTATE_API_CHUNKS_DIR, { recursive: true });
  mkdirSync(REAL_ESTATE_API_RAW_DIR, { recursive: true });
  await loadDivarCityIdMap();

  const allFixtures: DatasetFixture[] = [];
  const crawlLog: Array<Record<string, unknown>> = [];
  const seenGlobal = new Set<string>();

  for (const citySlug of cities) {
    const cityId = await divarCityIdForSlug(citySlug);
    if (!cityId) {
      crawlLog.push({ citySlug, ok: false, error: 'missing divar city id' });
      continue;
    }

    for (const cat of DIVAR_API_REAL_ESTATE_CATEGORIES) {
      const outPath = apiChunkPath(citySlug, cat.nfSlug);
      const existing = loadChunk(outPath);

      if (resume && existing.length > 0) {
        for (const f of existing) {
          const key = normalizeInput(f.input);
          if (seenGlobal.has(key)) continue;
          seenGlobal.add(key);
          allFixtures.push(f);
        }
        crawlLog.push({ citySlug, nfSlug: cat.nfSlug, skipped: true, existing: existing.length });
        continue;
      }

      if (existsSync(outPath) && existing.length === 0) {
        unlinkSync(outPath);
      }

      const started = Date.now();

      try {
        const responses = await fetchDivarPostlistAllPages(
          {
            cityId,
            parentCategory: cat.parentCategory,
            subcategory: cat.subcategory,
          },
          maxPages,
          delayMs
        );

        const posts = extractPostsFromDivarApiResponses(responses).slice(0, perPageLimit);
        const rawPosts: DivarNeedSourcePost[] = posts.map((post) => ({
          ...post,
          nfSlug: cat.nfSlug,
          citySlug,
          vertical: 'real-estate',
        }));

        if (rawPosts.length === 0) {
          crawlLog.push({
            citySlug,
            nfSlug: cat.nfSlug,
            ok: false,
            error: 'zero API posts',
            pages: responses.length,
            ms: Date.now() - started,
          });
          await sleep(delayMs);
          continue;
        }

        const batchFixtures: DatasetFixture[] = [];
        for (const post of rawPosts) {
          for (let v = 0; v < openerVariants; v++) {
            const fixture = buildDivarNeedFixture(post, v);
            fixture.meta = {
              ...fixture.meta,
              source: 'captured',
              vertical: 'real-estate',
              tags: [
                'divar-api',
                'real-estate-100k',
                'need-from-listing',
                cat.nfSlug,
                citySlug,
              ],
            };
            batchFixtures.push(fixture);
          }
        }

        const { healthy, report } = validateRealEstateBatch(batchFixtures);
        const deduped = dedupeRealEstateFixtures(healthy);
        const finalRows: DatasetFixture[] = [];

        for (const f of deduped) {
          const key = normalizeInput(f.input);
          if (seenGlobal.has(key)) continue;
          seenGlobal.add(key);
          finalRows.push(f);
        }

        if (finalRows.length === 0) {
          crawlLog.push({
            citySlug,
            nfSlug: cat.nfSlug,
            ok: false,
            error: 'all API fixtures rejected',
            rawCount: rawPosts.length,
            rejectedCount: report.rejected,
            ms: Date.now() - started,
          });
          await sleep(delayMs);
          continue;
        }

        writeFileSync(outPath, JSON.stringify(finalRows, null, 0), 'utf8');
        writeFileSync(
          join(REAL_ESTATE_API_RAW_DIR, `${citySlug}__${cat.nfSlug}.json`),
          JSON.stringify(rawPosts, null, 0),
          'utf8'
        );

        allFixtures.push(...finalRows);

        const batchInfo: CrawlBatchInfo & { source: 'divar-api' } = {
          citySlug,
          nfSlug: cat.nfSlug,
          divarSlug: `${cat.parentCategory}/${cat.subcategory}`,
          rawCount: rawPosts.length,
          healthyCount: finalRows.length,
          rejectedCount: report.rejected,
          chunkPath: outPath,
          source: 'divar-api',
        };

        crawlLog.push({
          ...batchInfo,
          pages: responses.length,
          ms: Date.now() - started,
          ok: true,
        });

        options.onBatchComplete?.(batchInfo);
      } catch (error) {
        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          ms: Date.now() - started,
        });
      }

      await sleep(delayMs);
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'divar-api-real-estate-crawl',
    cities,
    categories: DIVAR_API_REAL_ESTATE_CATEGORIES.length,
    maxPages,
    totalFixtures: allFixtures.length,
    openerVariants,
    crawlLog,
  };

  writeFileSync(REAL_ESTATE_API_CRAWL_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

  return { fixtures: allFixtures, manifest };
}

export function loadDivarApiRealEstateChunks(): DatasetFixture[] {
  if (!existsSync(REAL_ESTATE_API_CHUNKS_DIR)) return [];

  const files = readdirSync(REAL_ESTATE_API_CHUNKS_DIR).filter((f) => f.endsWith('.json'));
  const seen = new Set<string>();
  const out: DatasetFixture[] = [];

  for (const file of files) {
    for (const f of loadChunk(join(REAL_ESTATE_API_CHUNKS_DIR, file))) {
      const key = normalizeInput(f.input);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }

  return out;
}
