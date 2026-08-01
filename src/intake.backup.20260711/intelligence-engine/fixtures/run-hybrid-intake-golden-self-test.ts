/**
 * Golden eval for hybrid intake — vertical + categorySlug via scoped rules pipeline.
 *
 * Run: npm run test:hybrid-intake-golden
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';

interface GoldenCase {
  id: string;
  text: string;
  expect: { vertical: string; categorySlug: string };
}

interface GoldenFile {
  version: number;
  cases: GoldenCase[];
}

const MIN_PASS_RATE = 0.85;

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
    'src/intake/intelligence-engine/fixtures/hybrid-intake-golden.json'
  );
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenFile;
}

async function main(): Promise<void> {
  await stubServerOnly();
  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  await clearIntelligenceCache();

  const golden = loadGolden();
  let pass = 0;
  const failures: string[] = [];

  for (const c of golden.cases) {
    const result = await runHybridIntakePipeline({ text: c.text });
    const vertical = String(result.fields.vertical?.value ?? '');
    const slug = String(
      result.fields.subcategorySlug?.value ?? result.fields.categorySlug?.value ?? ''
    );

    const verticalOk = vertical === c.expect.vertical;
    const slugOk =
      slug === c.expect.categorySlug ||
      slug.includes(c.expect.categorySlug) ||
      c.expect.categorySlug.includes(slug);

    if (verticalOk && slugOk) {
      pass += 1;
    } else {
      failures.push(
        `${c.id}: got vertical=${vertical} slug=${slug} expected ${c.expect.vertical}/${c.expect.categorySlug}`
      );
    }
  }

  const rate = pass / golden.cases.length;
  console.log(`hybrid golden: ${pass}/${golden.cases.length} (${(rate * 100).toFixed(1)}%)`);

  if (failures.length) {
    console.log('failures (first 15):');
    failures.slice(0, 15).forEach((f) => console.log(' -', f));
  }

  if (rate < MIN_PASS_RATE) {
    console.error(`FAIL: pass rate ${(rate * 100).toFixed(1)}% < ${MIN_PASS_RATE * 100}%`);
    process.exit(1);
  }

  console.log('test:hybrid-intake-golden OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
