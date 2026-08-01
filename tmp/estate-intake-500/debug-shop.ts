import { createRequire } from 'node:module';
async function stub() {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}
async function main() {
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'false';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'true';
  await stub();
  const text = 'مغازه 274 متری اجاره‌ای در ملک‌شهر اصفهان می‌خوام. رهن 206 میلیون اجاره 9 میلیون. ویترین خوب و استخر.';
  const { runCategoryIntentEngine } = await import('../../src/intake/intelligence-engine/category/category-intent-engine');
  const { runHybridIntakePipeline } = await import('../../src/intake/intelligence-engine/hybrid/hybrid-pipeline');
  const { matchCategoryCandidatesFromRules } = await import('../../src/intake/rules/registry.server');
  console.log('with hints', matchCategoryCandidatesFromRules(text, { slugHints: ['shop-rent'] }).slice(0,5).map(c=>({s:c.slug,c:c.confidence})));
  console.log('no hints', matchCategoryCandidatesFromRules(text).slice(0,5).map(c=>({s:c.slug,c:c.confidence})));
  const eng = await runCategoryIntentEngine({ text, forceAi: true });
  console.log('engine', eng.method, eng.match?.subcategorySlug ?? eng.match?.categorySlug, eng.candidates.slice(0,5).map(c=>c.slug));
  const h = await runHybridIntakePipeline({ text, forceAi: true });
  console.log('hybrid', h.fields.categorySlug?.value, h.fields.subcategorySlug?.value);
}
main().catch(e=>{console.error(e); process.exit(1);});
