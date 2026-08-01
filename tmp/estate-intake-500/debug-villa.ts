import { createRequire } from 'node:module';

async function stubServerOnly(): Promise<void> {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main() {
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
  await stubServerOnly();

  const text =
    'ویلای 104 متری برای اجاره در جلفا اصفهان می‌خوام. رهن 76 میلیون اجاره 19 میلیون. انباری لازم است.';

  const {
    matchCategoryCandidatesFromRules,
    pickClearCategoryFromRules,
    matchCategoryFromRules,
  } = await import('../../src/intake/rules/registry.server');
  const { runCategoryIntentEngine } = await import(
    '../../src/intake/intelligence-engine/category/category-intent-engine'
  );
  const { runHybridIntakePipeline } = await import(
    '../../src/intake/intelligence-engine/hybrid/hybrid-pipeline'
  );

  const c = matchCategoryCandidatesFromRules(text);
  console.log(
    'candidates',
    c.slice(0, 8).map((x) => ({ slug: x.slug, conf: x.confidence, score: x.score }))
  );
  console.log('clear', pickClearCategoryFromRules(text));
  console.log('fallback', matchCategoryFromRules(text));

  const eng = await runCategoryIntentEngine({ text });
  console.log('engine', {
    method: eng.method,
    match: eng.match,
    amb: eng.ambiguous,
    cands: eng.candidates.slice(0, 5).map((x) => x.slug),
    intent: eng.intent,
  });

  const hybrid = await runHybridIntakePipeline({ text });
  console.log('hybrid', {
    vertical: hybrid.fields.vertical?.value,
    cat: hybrid.fields.categorySlug?.value,
    sub: hybrid.fields.subcategorySlug?.value,
    cands: hybrid.categoryCandidates?.length,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
