/** Test the scoped-city neighborhood validation fix directly (no raw-fragment leakage). */
async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  process.env.NEED_INTAKE_SEMANTIC_LOCATION_ENABLED = 'true';
  await stub();
  const { resolveLocationViaLre } = await import(
    '@/intake/intelligence-engine/resolvers/location-lre-bridge'
  );

  const cases: Array<{ text: string; cityName: string; expectNb: string | null }> = [
    // bare "رسالت" is NOT a real catalog entry in Kermanshah (only "رسالت فاز ۱/۲") -> must stay empty
    { text: 'لوازم خانگی میخوام، من در رسالت کرمانشاه ساکن هستم', cityName: 'کرمانشاه', expectNb: null },
    // a real catalog neighborhood (آزادگان IS a real Kermanshah entry) -> must resolve
    { text: 'یه آپارتمان میخوام، محله آزادگان کرمانشاه', cityName: 'کرمانشاه', expectNb: 'non-null' },
    // no neighborhood mentioned at all -> must stay empty
    { text: 'یه تعمیرکار کولر گازی میخوام', cityName: 'کرمانشاه', expectNb: null },
  ];

  for (const c of cases) {
    const r = await resolveLocationViaLre(c.text, c.text, {
      text: c.text,
      cityName: c.cityName,
      formHints: { city: c.cityName },
    } as never);
    const nb = r.fields.neighborhood?.value ?? null;
    const ok = c.expectNb === null ? nb === null : nb != null;
    console.log(
      `${ok ? 'OK  ' : 'FAIL'} "${c.text.slice(0, 40)}" (city=${c.cityName})  -> neighborhood=${nb ?? '∅'}`
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
