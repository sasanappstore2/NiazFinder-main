/**
 * Bootstrap hybrid-intake-golden.json expected values from rules-only hybrid pipeline.
 * Run once after changing cases: npx tsx src/intake/intelligence-engine/fixtures/bootstrap-hybrid-golden.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

async function main(): Promise<void> {
  await stubServerOnly();
  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';

  const path = join(
    process.cwd(),
    'src/intake/intelligence-engine/fixtures/hybrid-intake-golden.json'
  );
  const golden = JSON.parse(readFileSync(path, 'utf8')) as {
    version: number;
    description: string;
    cases: Array<{ id: string; text: string; expect: { vertical: string; categorySlug: string } }>;
  };

  for (const c of golden.cases) {
    const r = await runHybridIntakePipeline({ text: c.text });
    c.expect.vertical = String(r.fields.vertical?.value ?? c.expect.vertical);
    c.expect.categorySlug = String(
      r.fields.subcategorySlug?.value ?? r.fields.categorySlug?.value ?? c.expect.categorySlug
    );
    console.log(c.id, '->', c.expect.vertical, c.expect.categorySlug);
  }

  writeFileSync(path, `${JSON.stringify(golden, null, 2)}\n`, 'utf8');
  console.log('bootstrapped', golden.cases.length, 'cases');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
