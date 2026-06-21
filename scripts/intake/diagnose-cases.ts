/**
 * Diagnostic: run the FULL hybrid pipeline (semantic category + smart location +
 * Gemma) on specific problem cases and print category/city/neighborhood + candidates.
 * Iteration harness for the گرامافون / نارمک class of failures.
 *
 * Usage: npx --yes tsx scripts/intake/diagnose-cases.ts
 */
async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'false';
  process.env.NEED_INTAKE_SEMANTIC_RETRIEVAL_ENABLED = 'true';
  process.env.NEED_INTAKE_SEMANTIC_LOCATION_ENABLED = 'true';
  process.env.LOCAL_EMBED_URL = process.env.LOCAL_EMBED_URL ?? 'http://127.0.0.1:11434';
  process.env.LOCAL_EMBED_MODEL = process.env.LOCAL_EMBED_MODEL ?? 'bge-m3';
  process.env.LOCAL_EMBED_PREFIX_STYLE = 'none';
  process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
  process.env.NEED_INTAKE_INTENT_SLICE_ENABLED = 'false';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
  process.env.NEED_INTAKE_LLM_URL = process.env.NEED_INTAKE_LLM_URL ?? 'http://127.0.0.1:1234';
  process.env.NEED_INTAKE_LLM_MODEL = process.env.NEED_INTAKE_LLM_MODEL ?? 'gemma';
  const noLlm = process.argv.includes('--no-llm');
  process.env.NEED_INTAKE_LLM_ENABLED = noLlm ? 'false' : 'true';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = noLlm ? 'false' : 'true';

  await stub();
  const { runHybridIntakePipeline } = await import('@/intake/intelligence-engine/hybrid/hybrid-pipeline');
  const { clearIntelligenceCache } = await import('@/lib/need-intake/intake-parse-cache-store');
  await clearIntelligenceCache();

  const cases = [
    'من یک گرامافون نو میخوام اگر حلقه ها موجود هست هم خریدارم، من در نارمک هستم',
    'گرامافون قدیمی و صفحه‌های موسیقی میخوام',
    'دوربین عکاسی حرفه‌ای کنون میخوام',
    'یه عتیقه و اشیای قدیمی برای فروش دارم',
    'آپارتمان در سعادت‌آباد',
    'خونه در نارمک تهران',           // explicit city present
    'مغازه در زعفرانیه',
  ];

  for (const text of cases) {
    const r = await runHybridIntakePipeline({ text });
    const cat = String(r.fields.subcategorySlug?.value ?? r.fields.categorySlug?.value ?? '—');
    const city = String(r.fields.city?.value ?? '—');
    const nb = String(r.fields.neighborhood?.value ?? '—');
    const cands = (r.categoryCandidates ?? []).slice(0, 4).map((c) => c.slug).join(', ');
    console.log(`\n"${text}"`);
    console.log(`   category=${cat} | city=${city} | nb=${nb}`);
    console.log(`   candidates=[${cands || '—'}] | engine=${r.meta.engine}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
