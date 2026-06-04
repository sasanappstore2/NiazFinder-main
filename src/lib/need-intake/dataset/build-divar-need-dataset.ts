import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIVAR_ALL_VERTICALS } from '../../../../scripts/divar/categories';
import { fetchDivarCategoryHtml, sleep } from '../../../../scripts/divar/lib/crawl-client';
import { extractPostsFromDivarHtml } from '../../../../scripts/divar/lib/extract-posts';
import {
  buildDivarNeedFixture,
  verticalForDivarSlug,
  type DivarNeedSourcePost,
} from './divar-need-transform';
import { exportFixturesToFile } from './export-jsonl';
import type { DatasetFixture } from './schema';
import { dedupeFixtures } from './shared/teacher-gate';
import { normalizeInput } from './shared/normalize-input';

export const DIVAR_1K_RAW_PATH = join(
  process.cwd(),
  'data',
  'divar',
  'crawl',
  'raw-posts.json'
);
export const DIVAR_1K_FIXTURES_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-divar-1k.fixtures.json'
);
export const DIVAR_1K_TRAIN_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-divar-1k.jsonl'
);
export const DIVAR_1K_MANIFEST_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'divar-1k-manifest.json'
);

export const DEFAULT_CRAWL_CITIES = [
  'tehran',
  'mashhad',
  'isfahan',
  'shiraz',
  'tabriz',
  'karaj',
  'ahvaz',
  'qom',
] as const;

const NEED_OPENERS_COUNT = 5;

export interface CrawlDivarNeedOptions {
  targetCount?: number;
  cities?: string[];
  delayMs?: number;
  perCategoryLimit?: number;
  saveRaw?: boolean;
}

export interface CrawlDivarNeedResult {
  fixtures: DatasetFixture[];
  rawPosts: DivarNeedSourcePost[];
  manifest: Record<string, unknown>;
}

function countBySlug(fixtures: DatasetFixture[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of fixtures) {
    const slug = f.labels.categorySlug;
    counts[slug] = (counts[slug] ?? 0) + 1;
  }
  return counts;
}

export async function crawlDivarNeedDataset(
  options: CrawlDivarNeedOptions = {}
): Promise<CrawlDivarNeedResult> {
  const targetCount = options.targetCount ?? 1000;
  const cities = options.cities ?? [...DEFAULT_CRAWL_CITIES];
  const delayMs = options.delayMs ?? 2_200;
  const perCategoryLimit = options.perCategoryLimit ?? 40;
  const saveRaw = options.saveRaw ?? true;

  const rawPosts: DivarNeedSourcePost[] = [];
  const seenTitleCity = new Set<string>();
  const crawlLog: Array<Record<string, unknown>> = [];

  outer: for (const citySlug of cities) {
    for (const cat of DIVAR_ALL_VERTICALS) {
      if (rawPosts.length >= targetCount * 1.2) break outer;

      const started = Date.now();
      try {
        const html = await fetchDivarCategoryHtml(citySlug, cat.divarSlug, {
          retries: 4,
          retryDelayMs: 2_000,
        });
        const posts = extractPostsFromDivarHtml(html).slice(0, perCategoryLimit);
        let added = 0;

        for (const post of posts) {
          const key = `${citySlug}::${normalizeInput(post.title)}`;
          if (seenTitleCity.has(key)) continue;
          seenTitleCity.add(key);
          rawPosts.push({
            ...post,
            nfSlug: cat.nfSlug,
            citySlug,
            vertical: verticalForDivarSlug(cat.nfSlug),
          });
          added += 1;
          if (rawPosts.length >= targetCount * 1.2) break;
        }

        crawlLog.push({
          citySlug,
          nfSlug: cat.nfSlug,
          divarSlug: cat.divarSlug,
          extracted: posts.length,
          added,
          htmlBytes: html.length,
          ms: Date.now() - started,
          ok: true,
        });
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

  const fixtures: DatasetFixture[] = [];
  const seenInput = new Set<string>();

  for (let i = 0; i < rawPosts.length && fixtures.length < targetCount; i++) {
    const post = rawPosts[i]!;
    const fixture = buildDivarNeedFixture(post, i % NEED_OPENERS_COUNT);
    const inputKey = normalizeInput(fixture.input);
    if (seenInput.has(inputKey)) continue;
    seenInput.add(inputKey);
    fixtures.push(fixture);
  }

  const deduped = dedupeFixtures(fixtures).slice(0, targetCount);
  const manifest = {
    generatedAt: new Date().toISOString(),
    targetCount,
    rawCount: rawPosts.length,
    fixtureCount: deduped.length,
    cities,
    categories: DIVAR_ALL_VERTICALS.length,
    byCategory: countBySlug(deduped),
    crawlLog,
  };

  if (saveRaw) {
    mkdirSync(join(process.cwd(), 'data', 'divar', 'crawl'), { recursive: true });
    writeFileSync(DIVAR_1K_RAW_PATH, JSON.stringify(rawPosts, null, 2), 'utf8');
    writeFileSync(DIVAR_1K_FIXTURES_PATH, JSON.stringify(deduped, null, 2), 'utf8');
    writeFileSync(DIVAR_1K_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  }

  return { fixtures: deduped, rawPosts, manifest };
}

export function exportDivarNeedTrainingJsonl(
  fixtures: DatasetFixture[],
  outPath = DIVAR_1K_TRAIN_PATH
): string {
  return exportFixturesToFile(fixtures, outPath);
}

export async function buildAndExportDivarNeed1k(
  options: CrawlDivarNeedOptions = {}
): Promise<CrawlDivarNeedResult & { trainPath: string }> {
  const result = await crawlDivarNeedDataset(options);
  const trainPath = exportDivarNeedTrainingJsonl(result.fixtures);
  return { ...result, trainPath };
}
