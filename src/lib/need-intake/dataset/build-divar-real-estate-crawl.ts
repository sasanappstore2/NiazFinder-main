import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CITIES } from '@/config/locations';
import { DIVAR_REAL_ESTATE_CATEGORIES } from '../../../../scripts/divar/categories';
import { fetchDivarCategoryHtml, sleep } from '../../../../scripts/divar/lib/crawl-client';
import { extractPostsFromDivarHtml } from '../../../../scripts/divar/lib/extract-posts';
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

export const REAL_ESTATE_100K_DIR = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'real-estate-100k'
);
export const REAL_ESTATE_CHUNKS_DIR = join(REAL_ESTATE_100K_DIR, 'chunks');
export const REAL_ESTATE_RAW_DIR = join(REAL_ESTATE_100K_DIR, 'raw');
export const REAL_ESTATE_CRAWL_MANIFEST = join(REAL_ESTATE_100K_DIR, 'crawl-manifest.json');

const NEED_OPENER_VARIANTS = 5;

export interface CrawlRealEstateOptions {
  cities?: string[];
  delayMs?: number;
  perCategoryLimit?: number;
  htmlPages?: number;
  openerVariants?: number;
  resume?: boolean;
  onBatchComplete?: (info: CrawlBatchInfo) => void;
}

export interface CrawlBatchInfo {
  citySlug: string;
  nfSlug: string;
  divarSlug: string;
  rawCount: number;
  healthyCount: number;
  rejectedCount: number;
  chunkPath: string;
}

function chunkPath(citySlug: string, nfSlug: string): string {
  return join(REAL_ESTATE_CHUNKS_DIR, `${citySlug}__${nfSlug}.json`);
}

function loadExistingChunk(path: string): DatasetFixture[] {
  if (!existsSync(path)) return [];
  try {
    const rows = JSON.parse(readFileSync(path, 'utf8')) as DatasetFixture[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function isRetryableChunk(path: string): boolean {
  return loadExistingChunk(path).length > 0;
}

/** Crawl Divar real-estate SSR pages → need-seeker fixtures; validate each batch before saving. */
export async function crawlDivarRealEstateNeedDataset(
  options: CrawlRealEstateOptions = {}
): Promise<{ fixtures: DatasetFixture[]; manifest: Record<string, unknown> }> {
  const cities = options.cities ?? CANONICAL_CITIES.map((c) => c.slug);
  const delayMs = options.delayMs ?? 3_500;
  const perCategoryLimit = options.perCategoryLimit ?? 250;
  const htmlPages = options.htmlPages ?? 4;
  const openerVariants = options.openerVariants ?? NEED_OPENER_VARIANTS;
  const resume = options.resume ?? true;

  mkdirSync(REAL_ESTATE_CHUNKS_DIR, { recursive: true });
  mkdirSync(REAL_ESTATE_RAW_DIR, { recursive: true });

  const allFixtures: DatasetFixture[] = [];
  const crawlLog: Array<Record<string, unknown>> = [];
  const seenGlobal = new Set<string>();
  let consecutiveZeroPosts = 0;

  for (const citySlug of cities) {
    for (const cat of DIVAR_REAL_ESTATE_CATEGORIES) {
      const outPath = chunkPath(citySlug, cat.nfSlug);
      if (resume && existsSync(outPath) && isRetryableChunk(outPath)) {
        const existing = loadExistingChunk(outPath);
        for (const f of existing) {
          const key = normalizeInput(f.input);
          if (seenGlobal.has(key)) continue;
          seenGlobal.add(key);
          allFixtures.push(f);
        }
        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          skipped: true,
          existing: existing.length,
        });
        continue;
      }
      if (existsSync(outPath) && !isRetryableChunk(outPath)) {
        unlinkSync(outPath);
        const rawPath = join(REAL_ESTATE_RAW_DIR, `${citySlug}__${cat.nfSlug}.json`);
        if (existsSync(rawPath)) unlinkSync(rawPath);
      }

      const started = Date.now();
      const rawPosts: DivarNeedSourcePost[] = [];

      try {
        const seenTitles = new Set<string>();
        let lastHtmlBytes = 0;
        for (let page = 1; page <= htmlPages; page++) {
          const html = await fetchDivarCategoryHtml(citySlug, cat.divarSlug, {
            retries: 4,
            retryDelayMs: 2_500,
            page,
          });
          lastHtmlBytes = html.length;
          const posts = extractPostsFromDivarHtml(html);

          for (const post of posts) {
            const titleKey = normalizeInput(post.title);
            if (seenTitles.has(titleKey)) continue;
            seenTitles.add(titleKey);
            rawPosts.push({
              ...post,
              nfSlug: cat.nfSlug,
              citySlug,
              vertical: 'real-estate',
            });
            if (rawPosts.length >= perCategoryLimit) break;
          }

          if (rawPosts.length >= perCategoryLimit || posts.length === 0) break;
          if (page < htmlPages) await sleep(Math.max(1_500, delayMs / 2));
        }

        if (rawPosts.length === 0) {
          consecutiveZeroPosts += 1;
          crawlLog.push({
            citySlug,
            nfSlug: cat.nfSlug,
            divarSlug: cat.divarSlug,
            ok: false,
            error: 'zero posts extracted (rate limit or HTML format)',
            htmlBytes: lastHtmlBytes,
            ms: Date.now() - started,
          });
          if (consecutiveZeroPosts >= 2) {
            await sleep(Math.min(180_000, delayMs * consecutiveZeroPosts * 8));
          }
          await sleep(delayMs * 2);
          continue;
        }

        consecutiveZeroPosts = 0;

        const batchFixtures: DatasetFixture[] = [];
        for (const post of rawPosts) {
          for (let v = 0; v < openerVariants; v++) {
            const fixture = buildDivarNeedFixture(post, v);
            fixture.meta = {
              ...fixture.meta,
              source: 'captured',
              vertical: 'real-estate',
              tags: [
                'divar',
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
            divarSlug: cat.divarSlug,
            ok: false,
            error: 'all fixtures rejected by validation',
            rawCount: rawPosts.length,
            rejectedCount: report.rejected,
            ms: Date.now() - started,
            rejectionReasons: report.rejectionReasons,
          });
          await sleep(delayMs);
          continue;
        }

        writeFileSync(outPath, JSON.stringify(finalRows, null, 0), 'utf8');
        writeFileSync(
          join(REAL_ESTATE_RAW_DIR, `${citySlug}__${cat.nfSlug}.json`),
          JSON.stringify(rawPosts, null, 0),
          'utf8'
        );

        allFixtures.push(...finalRows);

        const batchInfo: CrawlBatchInfo = {
          citySlug,
          nfSlug: cat.nfSlug,
          divarSlug: cat.divarSlug,
          rawCount: rawPosts.length,
          healthyCount: finalRows.length,
          rejectedCount: report.rejected,
          chunkPath: outPath,
        };

        crawlLog.push({
          ...batchInfo,
          ms: Date.now() - started,
          ok: true,
          rejectionReasons: report.rejectionReasons,
        });

        options.onBatchComplete?.(batchInfo);
      } catch (error) {
        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          divarSlug: cat.divarSlug,
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
    source: 'divar-real-estate-crawl',
    cities,
    categories: DIVAR_REAL_ESTATE_CATEGORIES.length,
    totalFixtures: allFixtures.length,
    openerVariants,
    crawlLog,
  };

  writeFileSync(REAL_ESTATE_CRAWL_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

  // Retry failed city×category pairs once after a cooldown (rate-limit recovery).
  const failedPairs = crawlLog.filter((e) => e.ok === false && e.citySlug && e.nfSlug);
  if (failedPairs.length > 0) {
    await sleep(30_000);
    for (const entry of failedPairs) {
      const citySlug = entry.citySlug as string;
      const cat = DIVAR_REAL_ESTATE_CATEGORIES.find((c) => c.nfSlug === entry.nfSlug);
      if (!cat) continue;
      const outPath = chunkPath(citySlug, cat.nfSlug);
      if (existsSync(outPath)) continue;

      try {
        await sleep(delayMs * 2);
        const html = await fetchDivarCategoryHtml(citySlug, cat.divarSlug, {
          retries: 6,
          retryDelayMs: 5_000,
        });
        const posts = extractPostsFromDivarHtml(html).slice(0, perCategoryLimit);
        const rawPosts: DivarNeedSourcePost[] = posts.map((post) => ({
          ...post,
          nfSlug: cat.nfSlug,
          citySlug,
          vertical: 'real-estate' as const,
        }));

        const batchFixtures: DatasetFixture[] = [];
        for (const post of rawPosts) {
          for (let v = 0; v < openerVariants; v++) {
            const fixture = buildDivarNeedFixture(post, v);
            fixture.meta = {
              ...fixture.meta,
              source: 'captured',
              vertical: 'real-estate',
              tags: ['divar', 'real-estate-100k', 'need-from-listing', cat.nfSlug, citySlug],
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

        if (finalRows.length > 0) {
          writeFileSync(outPath, JSON.stringify(finalRows, null, 0), 'utf8');
          allFixtures.push(...finalRows);
        }

        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          retry: true,
          ok: true,
          healthyCount: finalRows.length,
          rejectedCount: report.rejected,
        });
      } catch (error) {
        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          retry: true,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    manifest.totalFixtures = allFixtures.length;
    manifest.crawlLog = crawlLog;
    writeFileSync(REAL_ESTATE_CRAWL_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  }

  return { fixtures: allFixtures, manifest };
}

/** Load all validated crawl chunks from disk (no network). */
export function loadDivarRealEstateChunks(): DatasetFixture[] {
  if (!existsSync(REAL_ESTATE_CHUNKS_DIR)) return [];

  const files = readdirSync(REAL_ESTATE_CHUNKS_DIR).filter((f) => f.endsWith('.json'));
  const seen = new Set<string>();
  const out: DatasetFixture[] = [];

  for (const file of files) {
    const rows = loadExistingChunk(join(REAL_ESTATE_CHUNKS_DIR, file));
    for (const f of rows) {
      const key = normalizeInput(f.input);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }

  return out;
}
