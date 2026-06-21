/**
 * Profiles where category-pipeline latency goes (per-step), rules-only.
 * Usage: npx --yes tsx scripts/intake/profile-pipeline-steps.ts [--cases N]
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ci = process.argv.indexOf('--cases');
const CASES = ci >= 0 && process.argv[ci + 1] ? Number(process.argv[ci + 1]) : 6;

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
  if (process.argv.includes('--semantic')) {
    process.env.NEED_INTAKE_SEMANTIC_RETRIEVAL_ENABLED = 'true';
    process.env.LOCAL_EMBED_URL = 'http://127.0.0.1:11434';
    process.env.LOCAL_EMBED_MODEL = 'bge-m3';
    process.env.LOCAL_EMBED_PREFIX_STYLE = 'none';
    process.env.NEED_INTAKE_RULES_ONLY = 'false';
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
    process.env.NEED_INTAKE_LLM_ENABLED = 'false';
  } else {
    process.env.NEED_INTAKE_RULES_ONLY = 'true';
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
  }

  await stubServerOnly();
  const { runHybridIntakePipeline } = await import(
    '@/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );
  const { clearIntelligenceCache } = await import('@/lib/need-intake/intake-parse-cache-store');
  await clearIntelligenceCache();

  const golden = JSON.parse(
    readFileSync(
      join(process.cwd(), 'src/intake/intelligence-engine/fixtures/hybrid-intake-golden.json'),
      'utf8'
    )
  ) as { cases: Array<{ text: string }> };

  const stepTotals = new Map<string, number[]>();
  let warm = false;
  for (const c of golden.cases.slice(0, CASES)) {
    const r = await runHybridIntakePipeline({ text: c.text, skipCache: true } as never);
    const total = r.meta.latencyMs;
    const steps = (r.trace?.steps ?? []) as Array<{ name: string; latencyMs: number }>;
    if (!warm) {
      console.log(`\n(first call — includes registry/model cold load)\n`);
      warm = true;
    }
    console.log(`total=${total}ms  ::  ${steps.map((s) => `${s.name}=${s.latencyMs}`).join('  ')}`);
    for (const s of steps) {
      const arr = stepTotals.get(s.name) ?? [];
      arr.push(s.latencyMs);
      stepTotals.set(s.name, arr);
    }
  }

  console.log(`\n=== avg per step (across ${CASES} cases, incl. cold first) ===`);
  for (const [name, arr] of stepTotals) {
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    console.log(`  ${name.padEnd(22)} avg=${avg}ms  (max=${Math.max(...arr)}ms)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
