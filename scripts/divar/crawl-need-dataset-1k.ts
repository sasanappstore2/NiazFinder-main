#!/usr/bin/env npx tsx
/**
 * Crawl Divar SSR listings and build 1000 need-intake training rows.
 *
 * Run:
 *   npm run dataset:divar-crawl-1k
 *   npm run dataset:divar-crawl-1k -- --target=1000 --delayMs=2200 --city=tehran --city=mashhad
 */
import {
  buildAndExportDivarNeed1k,
  DEFAULT_CRAWL_CITIES,
  DIVAR_1K_MANIFEST_PATH,
  DIVAR_1K_TRAIN_PATH,
} from '@/lib/need-intake/dataset/build-divar-need-dataset';

function parseArgs(): {
  target: number;
  delayMs: number;
  cities: string[];
} {
  let target = 1000;
  let delayMs = 2200;
  const cities: string[] = [];

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--target=')) target = Math.max(100, Number(arg.slice(9)) || 1000);
    if (arg.startsWith('--delayMs=')) delayMs = Math.max(800, Number(arg.slice(10)) || 2200);
    if (arg.startsWith('--city=')) cities.push(arg.slice(7).trim());
  }

  return {
    target,
    delayMs,
    cities: cities.length ? cities : [...DEFAULT_CRAWL_CITIES],
  };
}

async function main(): Promise<void> {
  const { target, delayMs, cities } = parseArgs();
  console.log(`Divar need crawl: target=${target} cities=${cities.join(',')} delay=${delayMs}ms`);

  const { fixtures, rawPosts, manifest, trainPath } = await buildAndExportDivarNeed1k({
    targetCount: target,
    cities,
    delayMs,
  });

  console.log(`Raw posts: ${rawPosts.length}`);
  console.log(`Fixtures: ${fixtures.length}`);
  console.log(`Train JSONL: ${trainPath}`);
  console.log(`Manifest: ${DIVAR_1K_MANIFEST_PATH}`);

  if (fixtures.length < target) {
    console.warn(
      `WARNING: only ${fixtures.length}/${target} rows — Divar may be rate-limiting. Retry later or add cities.`
    );
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
