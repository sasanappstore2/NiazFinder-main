/** Micro-benchmark the fusion sub-steps to find the latency culprit. */
async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  process.env.LOCAL_EMBED_URL = 'http://127.0.0.1:11434';
  process.env.LOCAL_EMBED_MODEL = 'bge-m3';
  process.env.LOCAL_EMBED_PREFIX_STYLE = 'none';
  await stub();

  const { semanticCategoryCandidates, warmCategoryEmbeddingIndex } = await import(
    '@/intake/intelligence-engine/semantic/category-embedding-index'
  );
  const { matchCandidatesWithinSlugs, buildMatchResultForSlug, countLoadedRules } = await import(
    '@/intake/rules/registry.server'
  );

  const texts = [
    'آپارتمان دو خوابه در تهران برای اجاره ماهانه',
    'یخچال ساید بای ساید سامسونگ می‌خوام بخرم',
    'تعمیر کولر گازی اسپلیت در مشهد',
    'پژو ۲۰۶ کارکرده می‌فروشم',
  ];

  const t0 = performance.now();
  await warmCategoryEmbeddingIndex();
  console.log(`index warm (embed exemplars): ${Math.round(performance.now() - t0)}ms`);

  const t1 = performance.now();
  console.log(`registry loaded rules: ${countLoadedRules()} in ${Math.round(performance.now() - t1)}ms`);

  // warm the rules-by-slug map
  matchCandidatesWithinSlugs(texts[0]!, ['apartment-rent']);

  for (const text of texts) {
    const a = performance.now();
    const sem = await semanticCategoryCandidates(text, 12);
    const aMs = Math.round(performance.now() - a);

    const slugs = sem.map((s) => s.slug);
    const b = performance.now();
    const rc = matchCandidatesWithinSlugs(text, slugs);
    const bMs = Math.round(performance.now() - b);

    const c = performance.now();
    buildMatchResultForSlug(text, sem[0]!.slug, sem[0]!.score);
    const cMs = Math.round(performance.now() - c);

    console.log(
      `"${text.slice(0, 24)}…"  semantic=${aMs}ms  scopedRules(${slugs.length}slugs->${rc.length})=${bMs}ms  buildResult=${cMs}ms  top=${sem[0]?.slug}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
