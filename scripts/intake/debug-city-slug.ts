async function stub(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}
async function main(): Promise<void> {
  await stub();
  const { searchLocationIndex } = await import('@/intake/intelligence-engine/indexes/location-fuse-index');
  const hits = await searchLocationIndex('کرمانشاه', { limit: 5 });
  console.log('searchLocationIndex(کرمانشاه):', JSON.stringify(hits.map((h) => ({ slug: h.record.slug, type: h.record.type, label: h.record.label }))));

  const { readdirSync } = await import('node:fs');
  const files = readdirSync('src/data/neighborhoods/catalog').filter((f) => /kerman/i.test(f));
  console.log('catalog files matching kerman:', files);
}
main().catch((e) => { console.error(e); process.exit(1); });
