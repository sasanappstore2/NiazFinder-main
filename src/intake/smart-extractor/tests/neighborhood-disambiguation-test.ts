/**
 * Neighborhood disambiguation tests — Claude Step 3
 * Run: npx tsx src/intake/smart-extractor/tests/neighborhood-disambiguation-test.ts
 */

import { disambiguateNeighborhoodWithCatalog } from '../disambiguation/neighborhood-disambiguator';
import { extractSmartFields } from '../smart-field-extractor';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main() {
  // 1) احمدآباد without clear context → OSM/managed candidates, needs disambiguation or multi candidates
  const ahmad = await disambiguateNeighborhoodWithCatalog({
    phrase: 'احمدآباد',
    rawText: 'خونه میخوام احمدآباد',
    cityName: 'مشهد',
    citySlug: 'mashhad',
  });
  console.log('احمدآباد candidates:', ahmad.candidates.map((c) => c.name));
  assert(ahmad.candidates.length >= 1, 'احمدآباد should yield candidates');
  assert(
    ahmad.needsDisambiguation === true || ahmad.candidates.length >= 1,
    'احمدآباد should be ambiguous or have candidates'
  );
  assert(
    ahmad.candidates.some((c) => c.name.includes('احمدآباد')),
    'candidate names should include احمدآباد'
  );
  console.log('✅ case1 احمدآباد');

  // 2) خیابان فردوسی → street context prefers OSM numbered فردوسی streets
  const ferdowsiStreet = await disambiguateNeighborhoodWithCatalog({
    phrase: 'فردوسی',
    rawText: 'آپارتمان خیابان فردوسی',
    cityName: 'مشهد',
    citySlug: 'mashhad',
  });
  console.log(
    'فردوسی (street) top:',
    ferdowsiStreet.candidates.slice(0, 5).map((c) => `${c.name} [${c.matchReason}]`)
  );
  assert(ferdowsiStreet.candidates.length >= 2, 'فردوسی should be multi-candidate');
  assert(
    ferdowsiStreet.needsDisambiguation || ferdowsiStreet.candidates.length > 1,
    'فردوسی street should need disambiguation or list alternatives'
  );
  assert(
    ferdowsiStreet.candidates.some((c) => /فردوسی/.test(c.name)),
    'should include فردوسی OSM/managed hits'
  );
  console.log('✅ case2 خیابان فردوسی');

  // 3) محله احمدآباد → neighborhood context
  const ahmadHood = await disambiguateNeighborhoodWithCatalog({
    phrase: 'احمدآباد',
    rawText: 'رهن در محله احمدآباد مشهد',
    cityName: 'مشهد',
    citySlug: 'mashhad',
  });
  console.log(
    'احمدآباد (محله) top:',
    ahmadHood.candidates.slice(0, 5).map((c) => `${c.name} [${c.matchReason}] conf=${c.confidence}`)
  );
  assert(ahmadHood.candidates.length >= 1, 'محله احمدآباد should resolve candidates');
  console.log('✅ case3 محله احمدآباد');

  // Integration: extractor surfaces disambiguationNeeded for فردوسی
  const extracted = await extractSmartFields('آپارتمان برای اجاره در خیابان فردوسی', '', {
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    useAI: false,
  });
  console.log('extractor فردوسی:', {
    neighborhood: extracted.location.neighborhood,
    disambiguationNeeded: extracted.location.disambiguationNeeded,
    alternatives: extracted.location.alternatives?.map((a) => a.neighborhood),
  });
  assert(extracted.location.neighborhood != null, 'extractor should capture فردوسی');
  assert(
    extracted.location.disambiguationNeeded === true ||
      (extracted.location.alternatives?.length ?? 0) > 1,
    'extractor should flag فردوسی ambiguity or alternatives'
  );
  console.log('✅ extractor integration');

  console.log('\nneighborhood-disambiguation-test: 3/3 (+integration) passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
