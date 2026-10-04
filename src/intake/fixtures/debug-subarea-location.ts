/**
 * Debug: sub-neighborhood (زیرمحله) detection through the location pipeline.
 * Run: NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/intake/fixtures/debug-subarea-location.ts
 */
process.env.NEED_INTAKE_LLM_ENABLED = 'false';

async function main() {
  const { searchLocationIndex } = await import(
    '@/intake/intelligence-engine/indexes/location-fuse-index'
  );
  const { loadLocationIndexRecords } = await import(
    '@/intake/intelligence-engine/indexes/location-fuse-index'
  );
  const { resolveLocation } = await import(
    '@/intake/intelligence-engine/resolvers/location-resolver'
  );

  const queries = [
    'نیاوران', // control: main neighborhood
    'موحد دانش', // sub of آجودانیه
    'سباری', // sub of آجودانیه
    'منظریه', // sub of نیاوران
    'باهنر', // ambiguous: sub of نیاوران + امام زاده قاسم + جماران
    'موحد دانش نیاوران', // sub + parent context
  ];

  console.log('=== searchLocationIndex (JSON path) ===');
  const records = await loadLocationIndexRecords();
  console.log('index records:', records.length);
  for (const q of queries) {
    const hits = await searchLocationIndex(q, { citySlug: 'tehran-city', limit: 4 });
    console.log(
      `\n[q] ${q}`,
      hits.length
        ? hits.map(
            (h) =>
              `${h.record.name} (${h.record.slug}) tier=${h.tier} conf=${h.confidence.toFixed(2)}`
          )
        : 'NO HITS'
    );
  }

  console.log('\n=== resolveLocation (raw text) ===');
  const texts = [
    'من یک آپارتمان ۱۸۰ متری در نیاوران تهران میخوام ۱۰۰ میلیون رهن دارم ۱۰۰ میلیون اجاره',
    'من یک آپارتمان ۱۸۰ متری در موحد دانش تهران میخوام ۱۰۰ میلیون رهن دارم ۱۰۰ میلیون اجاره',
    'من یک آپارتمان ۱۸۰ متری در سباری نیاوران تهران میخوام ۱۰۰ میلیون رهن دارم',
  ];
  for (const raw of texts) {
    const res = await resolveLocation('', raw, {});
    console.log(`\n[text] ${raw.slice(0, 45)}…`);
    console.log('  status:', res.status);
    const hood = res.fields.neighborhood;
    const hoodSlug = res.fields.neighborhoodSlug;
    console.log('  neighborhood:', hood?.value, hood?.confidence, '| slug:', hoodSlug?.value);
    console.log(
      '  candidates:',
      res.candidates.map((c) => `${c.label}(${c.score.toFixed(2)})`).join(' | ') || '—'
    );
  }
}

main().catch((e) => {
  console.error('DEBUG FAILED:', e);
  process.exit(1);
});
