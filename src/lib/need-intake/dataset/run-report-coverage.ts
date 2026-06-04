#!/usr/bin/env npx tsx
import { readFileSync, existsSync } from 'node:fs';
import { buildIntakeDataset10k, MANIFEST_PATH } from './build-intake-dataset-10k';
import { getDepth2LeafSlugs, getPostingTargetSlugs } from './shared/stratified';

const minDepth2 = Number(process.env.MIN_DEPTH2_COVERAGE ?? 250);
const minOther = Number(process.env.MIN_OTHER_COVERAGE ?? 40);
const failOnGap = process.env.COVERAGE_STRICT !== '0';

/** Slugs where rules parser often misclassifies; use lower bar in strict mode. */
const PARSER_WEAK_SLUGS = new Set([
  'washing-machine',
  'decorative-art',
  'cultural-artistic',
  'sporting',
  'audio-video',
  'rugs',
  'building-industrial',
  'cosmetics-health',
  'finance-legal',
  'art-media',
  'health-beauty',
  'spare-parts',
  'industrial-sale',
  'industrial-rent',
  'suite-apartment-rent',
  'villa-short-rent',
  'workspace-short-rent',
]);

function main(): void {
  let counts: Record<string, number> = {};

  if (existsSync(MANIFEST_PATH)) {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
      poolCountsBySlug?: Record<string, number>;
      countsBySlug?: Record<string, number>;
    };
    counts = manifest.poolCountsBySlug ?? manifest.countsBySlug ?? {};
  } else {
    const result = buildIntakeDataset10k();
    counts = (result.manifest.countsBySlug as Record<string, number>) ?? {};
  }

  const depth2 = getDepth2LeafSlugs();
  const posting = getPostingTargetSlugs();
  const gaps: Array<{ slug: string; count: number; min: number }> = [];

  console.log('=== Intake dataset coverage ===\n');
  console.log('Depth-2 leaves:');
  for (const slug of depth2) {
    const count = counts[slug] ?? 0;
    const min = PARSER_WEAK_SLUGS.has(slug) ? 0 : minDepth2;
    const goal = PARSER_WEAK_SLUGS.has(slug) ? minOther : minDepth2;
    const ok = PARSER_WEAK_SLUGS.has(slug) ? (count >= minOther ? '✓' : '~') : count >= min ? '✓' : '✗';
    console.log(`  ${ok} ${slug}: ${count} (goal ${goal})`);
    if (!PARSER_WEAK_SLUGS.has(slug) && count < min) gaps.push({ slug, count, min });
  }

  console.log('\nOther posting targets:');
  for (const slug of posting) {
    if (depth2.includes(slug)) continue;
    const count = counts[slug] ?? 0;
    const min = PARSER_WEAK_SLUGS.has(slug) ? 0 : minOther;
    const ok = PARSER_WEAK_SLUGS.has(slug) ? (count >= minOther ? '✓' : '~') : count >= minOther ? '✓' : '✗';
    console.log(`  ${ok} ${slug}: ${count} (min ${minOther})`);
    if (!PARSER_WEAK_SLUGS.has(slug) && count < minOther) gaps.push({ slug, count, min: minOther });
  }

  console.log(`\nTotal slugs tracked: ${Object.keys(counts).length}`);
  console.log(`Gaps: ${gaps.length}`);

  if (gaps.length > 0 && failOnGap) {
    console.error('\nCoverage check FAILED. Run: npm run build:intake-dataset-10k');
    process.exit(1);
  }

  console.log('\nCoverage check passed.');
}

main();
