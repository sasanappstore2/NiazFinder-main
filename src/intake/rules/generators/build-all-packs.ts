#!/usr/bin/env npx tsx
/**
 * Generate rule packs for all canonical categories (~10k rules each).
 * Run: npm run rules:generate
 *      npm run rules:generate -- --slug musical-instruments --target 1000
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CATEGORIES } from '@/config/categories';
import { RULES_PACKS_DIR, RULES_PACK_TARGET_SIZE } from '@/intake/rules/config';
import { buildGenericPack, buildRulePackFromSeed } from '@/intake/rules/generators/build-pack';
import {
  CURATED_CATEGORY_SEEDS,
  genericSeedForSlug,
} from '@/intake/rules/seeds/category-seeds';

function parseArgs(): { slug: string | null; target: number } {
  const args = process.argv.slice(2);
  let slug: string | null = null;
  let target = RULES_PACK_TARGET_SIZE;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slug' && args[i + 1]) slug = args[i + 1]!;
    if (args[i] === '--target' && args[i + 1]) target = Number(args[i + 1]) || target;
  }
  return { slug, target };
}

function main(): void {
  const { slug, target } = parseArgs();
  const outDir = join(process.cwd(), RULES_PACKS_DIR);
  mkdirSync(outDir, { recursive: true });

  const curated = new Map(CURATED_CATEGORY_SEEDS.map((s) => [s.slug, s]));
  const slugs = slug
    ? [slug]
    : CANONICAL_CATEGORIES.filter((c) => c.depth >= 1).map((c) => c.slug);

  let totalRules = 0;
  for (const s of slugs) {
    const cat = CANONICAL_CATEGORIES.find((c) => c.slug === s);
    const seed = curated.get(s) ?? genericSeedForSlug(s, cat?.title ?? s);
    const pack = buildRulePackFromSeed(seed, target);
    const path = join(outDir, `${s}.pack.json`);
    writeFileSync(path, JSON.stringify(pack));
    totalRules += pack.rules.length;
    console.log(`${s}: ${pack.rules.length} rules -> ${path}`);
  }

  console.log(`\nGenerated ${slugs.length} packs, ${totalRules} total rules`);
}

main();
