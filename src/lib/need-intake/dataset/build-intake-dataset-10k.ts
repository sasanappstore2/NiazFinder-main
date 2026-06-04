import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DATASET_FIXTURES } from '@/lib/need-intake/fixtures/dataset-cases';
import { generateRealEstateDataset } from './generate-real-estate-dataset';
import { generateVehiclesDataset } from './generate-vehicles-dataset';
import { generateElectronicsDataset } from './generate-electronics-dataset';
import { generateServicesDataset } from './generate-services-dataset';
import { generateJobsDataset } from './generate-jobs-dataset';
import { generateSocialDataset } from './generate-social-dataset';
import { ingestWebTitlesFromResearch, generateWebLikeFallback } from './ingest-web-titles';
import { exportFixturesToFile, fixturesToJsonl } from './export-jsonl';
import type { DatasetFixture } from './schema';
import {
  buildMlxSplits,
  countByPrimarySlug,
  countByTargetSlug,
  dedupeFixtures,
  fillSlugGaps,
  getDepth2LeafSlugs,
  getPostingTargetSlugs,
  normalizeInput,
  stratifiedSample,
} from './shared';

export const TRAIN_10K_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-train-10k.jsonl'
);
export const HOLDOUT_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-holdout-500.jsonl'
);
export const MANIFEST_PATH = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'dataset-manifest.json'
);
export const MLX_SPLITS_DIR = join(
  process.cwd(),
  'data',
  'need-intake-training',
  'need-intake-mlx-splits'
);

export interface Build10kOptions {
  targetTotal?: number;
  holdoutCount?: number;
  minPerDepth2Leaf?: number;
  estateCount?: number;
  vehiclesCount?: number;
  electronicsCount?: number;
  servicesCount?: number;
  jobsCount?: number;
  socialCount?: number;
  webTarget?: number;
  skipWeb?: boolean;
}

export interface Build10kResult {
  pool: DatasetFixture[];
  train: DatasetFixture[];
  holdout: DatasetFixture[];
  manifest: Record<string, unknown>;
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
  mkdirSync(MLX_SPLITS_DIR, { recursive: true });
  for (const [name, rows] of Object.entries(splits)) {
    writeFileSync(
      join(MLX_SPLITS_DIR, `${name}.jsonl`),
      fixturesToJsonl(rows),
      'utf8'
    );
  }
}

export function buildIntakeDataset10k(options: Build10kOptions = {}): Build10kResult {
  const targetTotal = options.targetTotal ?? 10_000;
  const holdoutCount = options.holdoutCount ?? 500;
  const minPerDepth2Leaf = options.minPerDepth2Leaf ?? 250;

  const estate = generateRealEstateDataset({ targetCount: options.estateCount ?? 4500 });
  const vehicles = generateVehiclesDataset(options.vehiclesCount ?? 1500);
  const electronics = generateElectronicsDataset(options.electronicsCount ?? 1200);
  const services = generateServicesDataset(options.servicesCount ?? 1200);
  const jobs = generateJobsDataset(options.jobsCount ?? 800);
  const social = generateSocialDataset(options.socialCount ?? 500);

  let web: DatasetFixture[] = [];
  if (!options.skipWeb) {
    web = ingestWebTitlesFromResearch({ targetCount: options.webTarget ?? 3000 });
    const webTarget = options.webTarget ?? 3000;
    if (web.length < webTarget * 0.3) {
      const need = webTarget - web.length;
      web = dedupeFixtures([...web, ...generateWebLikeFallback(need)]);
    }
  }

  let pool = dedupeFixtures([
    ...DATASET_FIXTURES,
    ...estate,
    ...vehicles,
    ...electronics,
    ...services,
    ...jobs,
    ...social,
  ]);

  // Web ingest after core synthetic to reduce template overlap in dedup
  pool = dedupeFixtures([...pool, ...web]);

  const slugTargets = new Map<string, number>();
  for (const slug of getDepth2LeafSlugs()) {
    slugTargets.set(slug, minPerDepth2Leaf);
  }
  for (const slug of getPostingTargetSlugs()) {
    if (!slugTargets.has(slug)) slugTargets.set(slug, 40);
  }

  const seen = new Set(pool.map((f) => normalizeInput(f.input)));
  const gapFill = fillSlugGaps(pool, slugTargets, seen);
  pool = dedupeFixtures([...pool, ...gapFill]);

  // Boost real-estate depth-2 slugs via estate generator
  const estateBoost = generateRealEstateDataset({ targetCount: 2000 });
  pool = dedupeFixtures([...pool, ...estateBoost]);

  while (pool.length < targetTotal + holdoutCount + 500) {
    const extraEstate = generateRealEstateDataset({ targetCount: 400 });
    const extraSynth = [
      ...generateVehiclesDataset(200),
      ...generateElectronicsDataset(200),
      ...generateServicesDataset(200),
      ...generateJobsDataset(150),
      ...generateSocialDataset(100),
    ];
    const before = pool.length;
    pool = dedupeFixtures([...pool, ...extraEstate, ...extraSynth]);
    if (pool.length === before) {
      pool = dedupeFixtures([...pool, ...generateWebLikeFallback(300)]);
      if (pool.length === before) break;
    }
  }

  const { train, holdout } = stratifiedSample(pool, {
    targetTotal,
    holdoutCount,
    minPerDepth2Leaf,
    minPerOther: 40,
  });

  exportFixturesToFile(train, TRAIN_10K_PATH);
  exportFixturesToFile(holdout, HOLDOUT_PATH);
  writeMlxSplits(train);

  const manifest = {
    generatedAt: new Date().toISOString(),
    poolSize: pool.length,
    trainSize: train.length,
    holdoutSize: holdout.length,
    trainPath: TRAIN_10K_PATH,
    holdoutPath: HOLDOUT_PATH,
    mlxSplitsDir: MLX_SPLITS_DIR,
    sourceMix: sourceMix(pool),
    trainSourceMix: sourceMix(train),
    poolCountsBySlug: Object.fromEntries(countByTargetSlug(pool)),
    countsBySlug: Object.fromEntries(countByTargetSlug(train)),
    holdoutCountsBySlug: Object.fromEntries(countByTargetSlug(holdout)),
    depth2LeafCount: getDepth2LeafSlugs().length,
    postingTargetCount: getPostingTargetSlugs().length,
  };

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  return { pool, train, holdout, manifest };
}
