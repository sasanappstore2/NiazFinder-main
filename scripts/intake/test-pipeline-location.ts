/** End-to-end: run the hybrid pipeline and check city/neighborhood resolution. */
async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_SEMANTIC_RETRIEVAL_ENABLED = 'false';
  const smart = !process.argv.includes('--off');
  process.env.NEED_INTAKE_SEMANTIC_LOCATION_ENABLED = smart ? 'true' : 'false';

  await stub();
  const { runHybridIntakePipeline } = await import('@/intake/intelligence-engine/hybrid/hybrid-pipeline');
  const { clearIntelligenceCache } = await import('@/lib/need-intake/intake-parse-cache-store');
  await clearIntelligenceCache();

  const cases = [
    'یخچالم خراب شده تو نیاوران',
    'آپارتمان دو خوابه در سعادت‌آباد میخوام',
    'tehran vanak خونه اجاره',
    'مغازه در تهرون',
    'نظافت منزل در زعفرانیه',
    'دنبال خونه در شهرک غرب هستم',
    'تعمیرکار کولر گازی میخوام',
  ];

  console.log(`\nsmart-location: ${smart ? 'ON' : 'OFF'}\n`);
  for (const text of cases) {
    const r = await runHybridIntakePipeline({ text });
    const city = r.fields.city?.value ?? '—';
    const nb = r.fields.neighborhood?.value ?? '—';
    console.log(`"${text}"\n   -> city=${city} | neighborhood=${nb}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
