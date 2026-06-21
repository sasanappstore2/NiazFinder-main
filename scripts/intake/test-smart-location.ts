/** Quick standalone check of smartResolveLocation across the bug classes. */
async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main(): Promise<void> {
  await stub();
  const { smartResolveLocation } = await import('@/intake/intelligence-engine/semantic/smart-location');

  const cases = [
    'یخچالم خراب شده تو نیاوران',          // infer Tehran from neighborhood
    'آپارتمان دو خوابه در سعادت‌آباد',     // infer Tehran
    'خونه در سجاد مشهد',                   // city + neighborhood
    'tehran vanak',                        // finglish city + nb
    'مغازه در تهرون',                      // typo -> Tehran (fuzzy)
    'اجاره آپارتمان در اصفهان',            // direct city
    'نظافت منزل در رشت',                   // direct city
    'خونه در زعفرانیه میخوام',             // infer Tehran
    'ویلا در کیش',                         // direct city (small)
    'mashhad sajad',                       // finglish city + nb
    'یه تعمیرکار کولر میخوام',             // NO location -> none
    'خرید آپارتمان نوساز',                 // no location, stop words only -> none
    'دنبال خونه در شهرک غرب هستم',         // Tehran neighborhood
    'املاک در باهنر کرمان',                // city + nb
    'من یک گرامافون نو میخوام اگر حلقه ها موجود هست هم خریدارم، من در نارمک هستم', // -> Tehran
    'گرامافون قدیمی و صفحه‌های موسیقی میخوام', // -> NO location
    'من در نارمک هستم',                    // -> Tehran
  ];

  const t0 = performance.now();
  smartResolveLocation('warmup');
  console.log(`index build: ${Math.round(performance.now() - t0)}ms\n`);

  for (const text of cases) {
    const s = performance.now();
    const r = smartResolveLocation(text);
    const ms = Math.round(performance.now() - s);
    console.log(
      `"${text}"\n   -> city=${r.cityName ?? '—'} | nb=${r.neighborhoodName ?? '—'} | method=${r.method} | conf=${r.confidence} (${ms}ms)`
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
