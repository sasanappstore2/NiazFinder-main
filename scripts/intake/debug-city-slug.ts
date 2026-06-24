async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}
async function main(): Promise<void> {
  await stub();
  const { smartResolveLocation, resolveCatalogCitySlugByName } = await import(
    '@/intake/intelligence-engine/semantic/smart-location'
  );

  console.log('direct catalog lookup "تبریز":', resolveCatalogCitySlugByName('تبریز'));
  console.log(
    'smartResolveLocation full text:',
    JSON.stringify(
      smartResolveLocation(
        'استخدام مهندس برق قدرت در تبریز، تمام‌وقت حضوری، حقوق ۳۰ میلیون، مسلط به طراحی تابلو برق صنعتی و PLC، دارای مدرک کارشناسی برق و حداقل ۳ سال سابقه کار در کارخانه',
      ),
    ),
  );
  console.log('smartResolveLocation "در تبریز":', JSON.stringify(smartResolveLocation('در تبریز')));
  console.log(
    'smartResolveLocation "سابقه کار در کارخانه":',
    JSON.stringify(smartResolveLocation('سابقه کار در کارخانه')),
  );
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
