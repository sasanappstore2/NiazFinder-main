import { createRequire } from 'node:module';

async function stubServerOnly(): Promise<void> {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main() {
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'false';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'true';
  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  await stubServerOnly();

  const text =
    'ویلای 104 متری برای اجاره در جلفا اصفهان می‌خوام. رهن 76 میلیون اجاره 19 میلیون. انباری لازم است.';

  const { runCategoryIntentEngine } = await import(
    '../../src/intake/intelligence-engine/category/category-intent-engine'
  );
  const { runHybridIntakePipeline } = await import(
    '../../src/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  const eng = await runCategoryIntentEngine({ text, forceAi: true });
  console.log('engine', {
    method: eng.method,
    amb: eng.ambiguous,
    match: eng.match?.subcategorySlug ?? eng.match?.categorySlug ?? null,
    cands: eng.candidates.length,
  });

  const hybrid = await runHybridIntakePipeline({ text, forceAi: true });
  console.log('hybrid fields', {
    vertical: hybrid.fields.vertical?.value,
    cat: hybrid.fields.categorySlug?.value,
    sub: hybrid.fields.subcategorySlug?.value,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
