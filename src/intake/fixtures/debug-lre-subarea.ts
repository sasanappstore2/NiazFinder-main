/**
 * Debug: LRE (location-resolution-engine) sub-neighborhood handling.
 * Run: npx --yes tsx src/intake/fixtures/debug-lre-subarea.ts
 */
async function main() {
  const { resolveLocation } = await import('@/lib/need-intake/location-resolution-engine');

  const cases: Array<{ label: string; text: string; city: string; cityId: string }> = [
    {
      label: 'control: main hood',
      text: 'من یک آپارتمان ۱۸۰ متری در نیاوران تهران میخوام ۱۰۰ میلیون رهن دارم ۱۰۰ میلیون اجاره',
      city: 'تهران',
      cityId: 'tehran-city',
    },
    {
      label: 'sub + parent',
      text: 'من یک آپارتمان ۱۸۰ متری در سباری نیاوران تهران میخوام ۱۰۰ میلیون رهن دارم',
      city: 'تهران',
      cityId: 'tehran-city',
    },
    {
      label: 'bare unique sub',
      text: 'دنبال آپارتمان در سباری تهران هستم حدود ۸۰ متر',
      city: 'تهران',
      cityId: 'tehran-city',
    },
    {
      label: 'shared sub (ambiguous expected)',
      text: 'من یک آپارتمان ۱۸۰ متری در موحد دانش تهران میخوام ۱۰۰ میلیون رهن دارم',
      city: 'تهران',
      cityId: 'tehran-city',
    },
    {
      label: 'sub of ونک',
      text: 'آپارتمان ۱۲۰ متری در سئول ونک تهران نیازمندم، رهن ۵۰۰',
      city: 'تهران',
      cityId: 'tehran-city',
    },
    {
      label: 'no city scope: bare sub',
      text: 'دنبال آپارتمان در موحد دانش هستم ۱۰۰ رهن ۱۰۰ اجاره',
      city: '',
      cityId: '',
    },
  ];

  for (const c of cases) {
    const res = resolveLocation(c.text, {
      explicitCity: c.city || undefined,
      preferredCityId: c.cityId || undefined,
    });
    console.log(
      `\n[${c.label}] status=${res.status} conf=${res.confidence}` +
        ` hood=${res.neighborhoodLabel ?? '—'} (${res.neighborhoodSlug ?? '—'})` +
        ` rejectAutoConfirm=${res.rejectAutoConfirm}`
    );
    if (res.neighborhoodCandidates?.length) {
      console.log(
        '  candidates:',
        res.neighborhoodCandidates.map((x) => `${x.label}(${x.score})`).join(' | ')
      );
    }
  }
}

main().catch((e) => {
  console.error('DEBUG FAILED:', e);
  process.exit(1);
});
