import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CITIES } from '@/config/locations';
import {
  crawlDivarRealEstateNeedDataset,
  loadDivarRealEstateChunks,
  REAL_ESTATE_100K_DIR,
} from './build-divar-real-estate-crawl';
import {
  crawlDivarApiRealEstateNeedDataset,
  loadDivarApiRealEstateChunks,
} from './build-divar-api-real-estate-crawl';
import { exportFixturesToFile, fixturesToJsonl } from './export-jsonl';
import { generateRealEstateDataset } from './generate-real-estate-dataset';
import { REAL_ESTATE_LEAF_SLUGS } from './real-estate-leaf-slugs';
import { REAL_ESTATE_PROPERTY_SYNTH_CONFIGS } from './real-estate-property-synth-configs';
import type { DatasetFixture } from './schema';
import {
  gateOptionsForConfig,
  SLUG_SYNTH_CONFIGS,
  type SlugSynthConfig,
} from './shared/category-synth-config';
import { normalizeInput } from './shared/normalize-input';
import { buildMlxSplits, countByTargetSlug } from './shared/stratified';
import { cityToSlug } from './shared/normalize-city';
import { teacherMatchesCategory } from './shared/teacher-gate';
import {
  dedupeRealEstateFixtures,
  validateRealEstateBatch,
  validateRealEstateFixture,
} from './validate-real-estate-fixture';

export const REAL_ESTATE_100K_JSONL = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-real-estate-100k.jsonl'
);
export const REAL_ESTATE_100K_HOLDOUT = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-real-estate-holdout.jsonl'
);
export const REAL_ESTATE_100K_MANIFEST = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'real-estate-100k-manifest.json'
);
export const REAL_ESTATE_100K_MLX_DIR = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'real-estate-100k-mlx-splits'
);

const ALL_REAL_ESTATE_SYNTH_CONFIGS: SlugSynthConfig[] = [
  ...REAL_ESTATE_PROPERTY_SYNTH_CONFIGS,
  ...SLUG_SYNTH_CONFIGS.filter((c) => c.vertical === 'real-estate'),
];

export interface BuildRealEstate100kOptions {
  targetCount?: number;
  holdoutCount?: number;
  minPerSlug?: number;
  /** Skip all crawlers (load existing chunks only). */
  skipCrawl?: boolean;
  skipHtmlCrawl?: boolean;
  skipApiCrawl?: boolean;
  crawlOnly?: boolean;
  resume?: boolean;
  delayMs?: number;
  apiDelayMs?: number;
  perCategoryLimit?: number;
  htmlPages?: number;
  maxApiPages?: number;
  cities?: string[];
  onBatchComplete?: (info: {
    citySlug: string;
    nfSlug: string;
    healthyCount: number;
    source: 'divar-html' | 'divar-api';
  }) => void;
}

function synthConfigForSlug(slug: string): SlugSynthConfig | undefined {
  return ALL_REAL_ESTATE_SYNTH_CONFIGS.find((c) => c.slug === slug);
}

function generateForSlug(
  config: SlugSynthConfig,
  target: number,
  seen: Set<string>,
  citySlug?: string
): DatasetFixture[] {
  const gate = gateOptionsForConfig(config);
  const cityMeta = citySlug
    ? CANONICAL_CITIES.find((c) => c.slug === citySlug)
    : undefined;
  const fixtures: DatasetFixture[] = [];
  let variant = citySlug ? citySlug.charCodeAt(0) * 17 : 0;
  let attempts = 0;
  const maxAttempts = Math.max(target * 96, target * 80);

  while (fixtures.length < target && attempts < maxAttempts) {
    const base = config.templates[variant % config.templates.length]!(variant);
    variant += 1;
    attempts += 1;

    let input = base;
    if (cityMeta) {
      input = `${base} — ${cityMeta.title}`;
    }
    if (variant % 4 === 0) input = `${input} #${variant}`;
    if (variant % 7 === 0) input = `${input} (${variant})`;

    const key = normalizeInput(input);
    if (seen.has(key)) continue;

    const row = teacherMatchesCategory(input, gate);
    if (!row) continue;

    row.meta = {
      ...row.meta,
      vertical: 'real-estate',
      source: 'fixture',
      tags: [
        'generated',
        'real-estate-100k',
        config.slug,
        ...(citySlug ? [citySlug] : []),
      ],
    };

    const errors = validateRealEstateFixture(row);
    if (errors.length > 0) continue;

    seen.add(key);
    fixtures.push(row);
  }

  return fixtures;
}

function fillSlugGapsRealEstate(
  pool: DatasetFixture[],
  slugTargets: Map<string, number>,
  seen: Set<string>
): DatasetFixture[] {
  const counts = countByTargetSlug(pool);
  const added: DatasetFixture[] = [];

  for (const [slug, minCount] of slugTargets) {
    const have = counts.get(slug) ?? 0;
    if (have >= minCount) continue;

    const config = synthConfigForSlug(slug);
    if (!config) continue;

    const need = minCount - have;
    const rows = generateForSlug(config, need, seen);
    added.push(...rows);
    counts.set(slug, (counts.get(slug) ?? 0) + rows.length);
  }

  return added;
}

function fillCitySlugGaps(
  pool: DatasetFixture[],
  minPerCitySlug: number,
  seen: Set<string>
): DatasetFixture[] {
  const counts = new Map<string, number>();

  for (const f of pool) {
    const slug = f.labels.categorySlug;
    const cityTag = f.meta?.tags?.find((t) => CANONICAL_CITIES.some((c) => c.slug === t));
    if (!cityTag) continue;
    const key = `${cityTag}::${slug}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const added: DatasetFixture[] = [];

  for (const city of CANONICAL_CITIES) {
    for (const slug of REAL_ESTATE_LEAF_SLUGS) {
      const key = `${city.slug}::${slug}`;
      const have = counts.get(key) ?? 0;
      if (have >= minPerCitySlug) continue;

      const config = synthConfigForSlug(slug);
      if (!config) continue;

      const need = minPerCitySlug - have;
      const rows = generateForSlug(config, need, seen, city.slug);
      added.push(...rows);
    }
  }

  return added;
}

function countByCity(pool: DatasetFixture[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const f of pool) {
    const cityTag = f.meta?.tags?.find((t) => CANONICAL_CITIES.some((c) => c.slug === t));
    const city = cityTag ?? cityToSlug(f.labels.city) ?? 'unknown';
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return counts;
}

function countByCrawlSource(fixtures: DatasetFixture[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const f of fixtures) {
    const tags = f.meta?.tags ?? [];
    const source =
      tags.includes('divar-api') ? 'divar-api' : tags.includes('divar') ? 'divar-html' : 'other';
    counts[source] = (counts[source] ?? 0) + 1;
  }
  return counts;
}

function mergeCrawlFixtures(...groups: DatasetFixture[][]): DatasetFixture[] {
  const seen = new Set<string>();
  const out: DatasetFixture[] = [];
  for (const group of groups) {
    for (const f of group) {
      const key = normalizeInput(f.input);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(f);
    }
  }
  return out;
}

function sourceMix(fixtures: DatasetFixture[]): Record<string, number> {
  const mix: Record<string, number> = {};
  for (const f of fixtures) {
    const src = f.meta?.source ?? 'unknown';
    mix[src] = (mix[src] ?? 0) + 1;
  }
  return mix;
}

function writeMlxSplits(trainPool: DatasetFixture[]): void {
  const splits = buildMlxSplits(trainPool);
  mkdirSync(REAL_ESTATE_100K_MLX_DIR, { recursive: true });
  for (const [name, rows] of Object.entries(splits)) {
    writeFileSync(
      join(REAL_ESTATE_100K_MLX_DIR, `${name}.jsonl`),
      fixturesToJsonl(rows),
      'utf8'
    );
  }
}

function finalHealthyPool(pool: DatasetFixture[]): {
  healthy: DatasetFixture[];
  report: ReturnType<typeof validateRealEstateBatch>['report'];
} {
  const { healthy, report } = validateRealEstateBatch(pool);
  return { healthy: dedupeRealEstateFixtures(healthy), report };
}

export async function buildRealEstate100kDataset(
  options: BuildRealEstate100kOptions = {}
): Promise<{
  pool: DatasetFixture[];
  train: DatasetFixture[];
  holdout: DatasetFixture[];
  manifest: Record<string, unknown>;
}> {
  const targetCount = options.targetCount ?? 100_000;
  const holdoutCount = Math.min(
    options.holdoutCount ?? 2_000,
    Math.max(50, Math.floor(targetCount * 0.02))
  );
  const minPerSlug =
    options.minPerSlug ?? Math.ceil(targetCount / REAL_ESTATE_LEAF_SLUGS.length);
  const minPerCitySlug = Math.ceil(targetCount / (CANONICAL_CITIES.length * REAL_ESTATE_LEAF_SLUGS.length));

  mkdirSync(REAL_ESTATE_100K_DIR, { recursive: true });
  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });

  let htmlFixtures: DatasetFixture[] = [];
  let apiFixtures: DatasetFixture[] = [];

  if (!options.skipCrawl) {
    const crawlOpts = {
      cities: options.cities,
      resume: options.resume ?? true,
      perCategoryLimit: options.perCategoryLimit ?? 250,
      onBatchComplete: options.onBatchComplete
        ? (info: { citySlug: string; nfSlug: string; healthyCount: number; source?: string }) =>
            options.onBatchComplete!({
              citySlug: info.citySlug,
              nfSlug: info.nfSlug,
              healthyCount: info.healthyCount,
              source: info.source === 'divar-api' ? 'divar-api' : 'divar-html',
            })
        : undefined,
    };

    if (!options.skipHtmlCrawl) {
      const htmlResult = await crawlDivarRealEstateNeedDataset({
        ...crawlOpts,
        delayMs: options.delayMs ?? 3_500,
        htmlPages: options.htmlPages ?? 4,
        onBatchComplete: crawlOpts.onBatchComplete
          ? (info) =>
              crawlOpts.onBatchComplete!({
                ...info,
                source: 'divar-html',
              })
          : undefined,
      });
      htmlFixtures = htmlResult.fixtures;
    } else {
      htmlFixtures = loadDivarRealEstateChunks();
    }

    if (!options.skipApiCrawl) {
      const apiResult = await crawlDivarApiRealEstateNeedDataset({
        cities: options.cities,
        resume: options.resume ?? true,
        delayMs: options.apiDelayMs ?? 1_200,
        maxPages: options.maxApiPages ?? 20,
        perPageLimit: options.perCategoryLimit ?? 250,
        onBatchComplete: options.onBatchComplete
          ? (info) =>
              options.onBatchComplete!({
                citySlug: info.citySlug,
                nfSlug: info.nfSlug,
                healthyCount: info.healthyCount,
                source: 'divar-api',
              })
          : undefined,
      });
      apiFixtures = apiResult.fixtures;
    } else {
      apiFixtures = loadDivarApiRealEstateChunks();
    }
  } else {
    htmlFixtures = loadDivarRealEstateChunks();
    apiFixtures = loadDivarApiRealEstateChunks();
  }

  const crawlFixtures = mergeCrawlFixtures(htmlFixtures, apiFixtures);

  if (options.crawlOnly) {
    const manifest = {
      generatedAt: new Date().toISOString(),
      mode: 'crawl-only',
      crawlCount: crawlFixtures.length,
      htmlCrawlCount: htmlFixtures.length,
      apiCrawlCount: apiFixtures.length,
      crawlSourceMix: countByCrawlSource(crawlFixtures),
      sourceMix: sourceMix(crawlFixtures),
      bySlug: Object.fromEntries(countByTargetSlug(crawlFixtures)),
      byCity: Object.fromEntries(countByCity(crawlFixtures)),
    };
    writeFileSync(REAL_ESTATE_100K_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
    return { pool: crawlFixtures, train: crawlFixtures, holdout: [], manifest };
  }

  const seen = new Set<string>();
  let pool: DatasetFixture[] = [];

  for (const f of crawlFixtures) {
    const key = normalizeInput(f.input);
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push(f);
  }

  const slugTargets = new Map<string, number>();
  for (const slug of REAL_ESTATE_LEAF_SLUGS) {
    slugTargets.set(slug, minPerSlug);
  }

  let rounds = 0;
  while (pool.length < targetCount + holdoutCount && rounds < 12) {
    rounds += 1;
    const before = pool.length;

    const gapFill = fillSlugGapsRealEstate(pool, slugTargets, seen);
    pool = dedupeRealEstateFixtures([...pool, ...gapFill]);

    const cityFill = fillCitySlugGaps(pool, minPerCitySlug, seen);
    pool = dedupeRealEstateFixtures([...pool, ...cityFill]);

    const synthBoost = generateRealEstateDataset({
      targetCount: Math.min(8_000, targetCount - pool.length + 2_000),
    });
    for (const f of synthBoost) {
      const key = normalizeInput(f.input);
      if (seen.has(key)) continue;
      seen.add(key);
      f.meta = {
        ...f.meta,
        tags: [...(f.meta?.tags ?? []), 'real-estate-100k'],
      };
      pool.push(f);
    }
    pool = dedupeRealEstateFixtures(pool);

    if (pool.length === before) break;
  }

  const { healthy, report } = finalHealthyPool(pool);
  pool = healthy.slice(0, targetCount + holdoutCount);

  const holdout = pool.slice(0, holdoutCount);
  const train = pool.slice(holdoutCount, holdoutCount + targetCount);

  exportFixturesToFile(train, REAL_ESTATE_100K_JSONL);
  exportFixturesToFile(holdout, REAL_ESTATE_100K_HOLDOUT);
  writeMlxSplits(train);

  const manifest = {
    generatedAt: new Date().toISOString(),
    targetCount,
    holdoutCount,
    poolSize: pool.length,
    trainSize: train.length,
    holdoutSize: holdout.length,
    crawlCount: crawlFixtures.length,
    htmlCrawlCount: htmlFixtures.length,
    apiCrawlCount: apiFixtures.length,
    crawlSourceMix: countByCrawlSource(crawlFixtures),
    validationReport: report,
    sourceMix: sourceMix(pool),
    trainSourceMix: sourceMix(train),
    bySlug: Object.fromEntries(countByTargetSlug(train)),
    byCity: Object.fromEntries(countByCity(train)),
    leafSlugs: REAL_ESTATE_LEAF_SLUGS.length,
    cities: CANONICAL_CITIES.length,
    trainPath: REAL_ESTATE_100K_JSONL,
    holdoutPath: REAL_ESTATE_100K_HOLDOUT,
    mlxSplitsDir: REAL_ESTATE_100K_MLX_DIR,
    minPerSlug,
    minPerCitySlug,
  };

  writeFileSync(REAL_ESTATE_100K_MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');

  return { pool, train, holdout, manifest };
}
