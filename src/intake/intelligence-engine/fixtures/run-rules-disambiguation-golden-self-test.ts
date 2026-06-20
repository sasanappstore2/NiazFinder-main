/**
 * Golden eval for rules-first category disambiguation hypotheses.
 *
 * Run: npm run test:rules-disambiguation-golden
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface GoldenCase {
  id: string;
  text: string;
  expect: {
    ambiguous?: boolean;
    minCandidates?: number;
    clearWinner?: boolean;
    categorySlug?: string;
  };
}

interface GoldenFile {
  version: number;
  cases: GoldenCase[];
}

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

function loadGolden(): GoldenFile {
  const path = join(
    process.cwd(),
    'src/intake/intelligence-engine/fixtures/rules-disambiguation-golden.json'
  );
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenFile;
}

async function main(): Promise<void> {
  await stubServerOnly();
  const {
    matchCategoryCandidatesFromRules,
    pickClearCategoryFromRules,
  } = await import('@/intake/rules/registry.server');
  const { isCategoryAmbiguous } = await import('@/intake/rules/registry-match');

  const golden = loadGolden();
  let pass = 0;
  const failures: string[] = [];

  for (const c of golden.cases) {
    const candidates = matchCategoryCandidatesFromRules(c.text);
    const ambiguous = isCategoryAmbiguous(candidates);
    const clear = pickClearCategoryFromRules(c.text);
    let ok = true;
    const reasons: string[] = [];

    if (c.expect.minCandidates != null && candidates.length < c.expect.minCandidates) {
      ok = false;
      reasons.push(`candidates=${candidates.length} < ${c.expect.minCandidates}`);
    }
    if (c.expect.ambiguous != null && ambiguous !== c.expect.ambiguous) {
      ok = false;
      reasons.push(`ambiguous=${ambiguous} expected ${c.expect.ambiguous}`);
    }
    if (c.expect.clearWinner === true && !clear) {
      ok = false;
      reasons.push('expected clear winner');
    }
    if (c.expect.clearWinner === false && clear) {
      ok = false;
      reasons.push(`unexpected clear winner ${clear.categorySlug}`);
    }
    if (c.expect.categorySlug) {
      const slug = clear?.subcategorySlug ?? clear?.categorySlug ?? '';
      if (slug !== c.expect.categorySlug && !slug.includes(c.expect.categorySlug)) {
        ok = false;
        reasons.push(`slug=${slug} expected ${c.expect.categorySlug}`);
      }
    }

    if (ok) {
      pass += 1;
    } else {
      failures.push(`${c.id}: ${reasons.join('; ')}`);
    }
  }

  console.log(`rules-disambiguation golden: ${pass}/${golden.cases.length}`);

  if (failures.length) {
    console.log('failures:');
    failures.forEach((f) => console.log(' -', f));
    process.exit(1);
  }

  console.log('test:rules-disambiguation-golden OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
