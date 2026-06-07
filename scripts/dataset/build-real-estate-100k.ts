#!/usr/bin/env npx tsx
/**
 * Build 100k validated real-estate need-intake training dataset.
 *
 * Sources:
 *   - divar-html  SSR crawl (multi-page per category)
 *   - divar-api   postlist API with pagination (more listings, all cities)
 *
 * Run:
 *   npm run dataset:real-estate-100k
 *   npm run dataset:real-estate-100k -- --skip-crawl
 *   npm run dataset:real-estate-100k -- --crawl-only --city=tehran
 *   npm run dataset:real-estate-100k -- --skip-html --maxApiPages=30
 */
import { CANONICAL_CITIES } from '@/config/locations';
import {
  buildRealEstate100kDataset,
  REAL_ESTATE_100K_JSONL,
  REAL_ESTATE_100K_MANIFEST,
} from '@/lib/need-intake/dataset/build-real-estate-100k-dataset';

function parseArgs() {
  let target = 100_000;
  let holdout = 2_000;
  let delayMs = 3_500;
  let apiDelayMs = 1_200;
  let skipCrawl = false;
  let skipHtml = false;
  let skipApi = false;
  let crawlOnly = false;
  let resume = true;
  let perCategoryLimit = 250;
  let htmlPages = 4;
  let maxApiPages = 20;
  const cities: string[] = [];

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--target=')) target = Math.max(100, Number(arg.slice(9)) || 100_000);
    if (arg.startsWith('--holdout=')) holdout = Math.max(100, Number(arg.slice(10)) || 2_000);
    if (arg.startsWith('--delayMs=')) delayMs = Math.max(800, Number(arg.slice(10)) || 3_500);
    if (arg.startsWith('--apiDelayMs=')) apiDelayMs = Math.max(400, Number(arg.slice(13)) || 1_200);
    if (arg === '--skip-crawl') skipCrawl = true;
    if (arg === '--skip-html') skipHtml = true;
    if (arg === '--skip-api') skipApi = true;
    if (arg === '--crawl-only') crawlOnly = true;
    if (arg === '--no-resume') resume = false;
    if (arg.startsWith('--perCategoryLimit=')) {
      perCategoryLimit = Math.max(20, Number(arg.slice(19)) || 250);
    }
    if (arg.startsWith('--htmlPages=')) htmlPages = Math.max(1, Number(arg.slice(12)) || 4);
    if (arg.startsWith('--maxApiPages=')) maxApiPages = Math.max(1, Number(arg.slice(14)) || 20);
    if (arg.startsWith('--city=')) cities.push(arg.slice(7).trim());
  }

  return {
    target,
    holdout,
    delayMs,
    apiDelayMs,
    skipCrawl,
    skipHtml,
    skipApi,
    crawlOnly,
    resume,
    perCategoryLimit,
    htmlPages,
    maxApiPages,
    cities,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const cityFilter = args.cities.length ? args.cities : undefined;

  console.log('Real-estate 100k dataset build');
  console.log(`  target=${args.target} holdout=${args.holdout}`);
  console.log(`  sources: html=${!args.skipHtml && !args.skipCrawl} api=${!args.skipApi && !args.skipCrawl}`);
  console.log(`  skipCrawl=${args.skipCrawl} crawlOnly=${args.crawlOnly} resume=${args.resume}`);
  console.log(`  delayMs=${args.delayMs} apiDelayMs=${args.apiDelayMs}`);
  console.log(`  htmlPages=${args.htmlPages} maxApiPages=${args.maxApiPages} perCategoryLimit=${args.perCategoryLimit}`);
  if (cityFilter) console.log(`  cities=${cityFilter.join(',')}`);
  else console.log(`  cities=all (${CANONICAL_CITIES.length})`);

  let batchNum = 0;
  const { train, holdout, manifest, pool } = await buildRealEstate100kDataset({
    targetCount: args.target,
    holdoutCount: args.holdout,
    skipCrawl: args.skipCrawl,
    skipHtmlCrawl: args.skipHtml,
    skipApiCrawl: args.skipApi,
    crawlOnly: args.crawlOnly,
    resume: args.resume,
    delayMs: args.delayMs,
    apiDelayMs: args.apiDelayMs,
    perCategoryLimit: args.perCategoryLimit,
    htmlPages: args.htmlPages,
    maxApiPages: args.maxApiPages,
    cities: cityFilter,
    onBatchComplete: (info) => {
      batchNum += 1;
      console.log(
        `[${info.source} batch ${batchNum}] ${info.citySlug}/${info.nfSlug} → ${info.healthyCount} healthy rows`
      );
    },
  });

  console.log('');
  console.log(`Pool: ${pool.length}`);
  console.log(`Train: ${train.length}`);
  console.log(`Holdout: ${holdout.length}`);
  console.log(`JSONL: ${REAL_ESTATE_100K_JSONL}`);
  console.log(`Manifest: ${REAL_ESTATE_100K_MANIFEST}`);
  console.log(`Source mix: ${JSON.stringify(manifest.sourceMix)}`);
  if (manifest.crawlSourceMix) {
    console.log(`Crawl sources: ${JSON.stringify(manifest.crawlSourceMix)}`);
  }

  if (!args.crawlOnly && train.length < args.target) {
    console.warn(
      `WARNING: train=${train.length} < target=${args.target}. Re-run with --skip-crawl after crawl completes.`
    );
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
