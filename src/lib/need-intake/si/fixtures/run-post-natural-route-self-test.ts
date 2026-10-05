import { POST } from '@/app/api/post/natural-analyze/route';
import { NextRequest } from 'next/server';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function analyze(input: Record<string, unknown>, ip: string) {
  const request = new NextRequest('http://localhost/api/post/natural-analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(input),
  });
  const response = await POST(request);
  const body = await response.json() as {
    draftPatch?: { entities?: Record<string, unknown> };
    locationCandidates?: Array<{ slug: string; label: string; city?: string; citySlug?: string }>;
    fields?: Array<{ key: string; value: unknown; source: string; requiresConfirmation: boolean; confidence?: number; evidence?: string }>;
    gaps?: string[];
    warnings?: string[];
    si?: { status: string };
  };
  return { status: response.status, body };
}

const previousSiUrl = process.env.SI_POST_URL;
process.env.SI_POST_URL = 'http://127.0.0.1:1/predict';

try {
  const joinedMashhadText =
    'من یک مغازه میخوام برای لوازم آرایشی محدوده فرامرزعباسی ۱ ملیارد رهن دارم ۲۰۰ میلیون اجاره';
  const mashhad = await analyze(
    {
      sourceText: joinedMashhadText,
      cityName: 'مشهد',
      // Deliberately stale URL context: a selected city name is authoritative.
      citySlug: 'tehran',
      categorySlug: 'shop-rent',
      cityLockedByUser: true,
    },
    '127.0.0.101'
  );
  const mashhadEntities = mashhad.body.draftPatch?.entities ?? {};
  assert(mashhad.status === 200, 'locked Mashhad request returns successfully');
  assert(mashhadEntities.neighborhood === 'شهید فرامرز عباسی', 'canonical neighborhood name is returned');
  assert(mashhadEntities.neighborhoodSlug === 'شهید-فرامرز-عباسی', 'catalog slug is returned');
  assert(mashhadEntities.lat === 36.3326645 && mashhadEntities.lng === 59.5485897, 'catalog centroid is returned');
  assert(!('city' in mashhadEntities), 'a locked city is not duplicated or rewritten in the patch');

  const tehran = await analyze(
    {
      sourceText: joinedMashhadText,
      cityName: 'تهران',
      citySlug: 'tehran',
      cityLockedByUser: true,
    },
    '127.0.0.102'
  );
  assert(tehran.status === 200, 'locked Tehran request returns successfully');
  assert(!tehran.body.draftPatch?.entities?.neighborhood, 'a Mashhad phrase is not guessed as a Tehran neighborhood');

  const vanak = await analyze(
    {
      sourceText: 'یک آپارتمان ۱۹۶ متری در ونک می‌خواهم ۱۰ میلیارد بودجه دارم',
      cityName: 'تهران',
      citySlug: 'tehran',
      cityLockedByUser: true,
    },
    '127.0.0.106'
  );
  const vanakEntities = vanak.body.draftPatch?.entities ?? {};
  assert(vanak.status === 200, 'selected Tehran context resolves a neighborhood from the full city catalog');
  assert(vanakEntities.neighborhood === 'ونک', 'Vanak is applied as the canonical Tehran neighborhood');
  assert(vanakEntities.neighborhoodSlug === 'ونک', 'Vanak canonical catalog id is returned');
  assert(vanakEntities.lat === 35.7607574 && vanakEntities.lng === 51.4050674, 'map pin uses Vanak centroid instead of the Tehran city center');

  const tehranVilla = await analyze(
    {
      sourceText: 'نیاز به آپارتمان حدود ۷۰ متر ۲ خواب در محدودهٔ تهران‌ویلا، تهران دارم؛ قصد خرید دارم.',
      cityName: 'تهران',
      citySlug: 'tehran',
      cityLockedByUser: true,
    },
    '127.0.0.108'
  );
  const tehranVillaEntities = tehranVilla.body.draftPatch?.entities ?? {};
  assert(tehranVilla.status === 200, 'compound Tehran-Villa neighborhood resolves through the analyze route');
  assert(tehranVillaEntities.neighborhood === 'تهران‌ویلا', 'the city-like prefix remains part of the neighborhood name');
  assert(tehranVillaEntities.neighborhoodSlug === 'تهرانویلا', 'the exact Tehran-Villa catalog id is applied');
  assert(
    tehranVillaEntities.lat === 35.7229023 && tehranVillaEntities.lng === 51.3654499,
    'map pin uses the Tehran-Villa neighborhood centroid'
  );
  assert(
    !('city' in tehranVillaEntities) && !('citySlug' in tehranVillaEntities),
    'a locked user-selected city is not rewritten in the analyzer patch'
  );

  const catalogOnlyAndisheh = await analyze(
    {
      sourceText: 'برای اجاره آپارتمان در اندیشه می‌خواهم',
    },
    '127.0.0.107'
  );
  const andishehEntities = catalogOnlyAndisheh.body.draftPatch?.entities ?? {};
  assert(catalogOnlyAndisheh.status === 200, 'a catalog city outside the parser registry returns successfully');
  assert(andishehEntities.city === 'اندیشه', 'Andisheh is resolved from the full catalog instead of being guessed as Tehran');
  assert(andishehEntities.citySlug === 'andisheh-new-town', 'Andisheh catalog identity is preserved');

  const ambiguous = await analyze(
    {
      sourceText: 'یک مغازه در محدوده بنفشه می‌خواهم',
      cityName: 'مشهد',
      citySlug: 'mashhad',
      cityLockedByUser: true,
    },
    '127.0.0.103'
  );
  assert(ambiguous.status === 200, 'ambiguous location request returns successfully');
  assert(!ambiguous.body.draftPatch?.entities?.neighborhood, 'an ambiguous neighborhood is not silently chosen');
  assert((ambiguous.body.locationCandidates?.length ?? 0) >= 2, 'ambiguous candidates are returned for user choice');

  const originalFetch = globalThis.fetch;
  process.env.SI_POST_URL = 'http://127.0.0.1:8101/predict';
  let siNeighborhoodChoice: string | undefined;
  globalThis.fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as {
      questions?: Record<string, { criteria?: Record<string, string> }>;
    };
    const criteria = payload.questions?.neighborhood_candidate?.criteria;
    assert(criteria, 'ambiguous city-scoped locations must become an explicit Si choice question');
    assert(Object.keys(criteria).length <= 9, 'Si must receive at most eight neighborhoods plus unknown');
    siNeighborhoodChoice = Object.keys(criteria).find((slug) => slug !== 'unknown');
    assert(siNeighborhoodChoice, 'the mocked decision must select only an offered catalog candidate');
    return new Response(
      JSON.stringify({
        answers: {
          neighborhood_candidate: {
            choice: siNeighborhoodChoice,
            answer_confidence: 0.94,
          },
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  try {
    const siNeighborhood = await analyze(
      {
        sourceText: 'یک مغازه در محدوده بنفشه می‌خواهم',
        cityName: 'مشهد',
        citySlug: 'mashhad',
        cityLockedByUser: true,
      },
      '127.0.0.109'
    );
    const neighborhoodProposal = siNeighborhood.body.fields?.find((field) => field.key === 'neighborhood');
    assert(siNeighborhood.status === 200 && siNeighborhood.body.si?.status === 'ready', 'mock Si response is consumed by the real analyze route');
    assert(Boolean(siNeighborhood.body.locationCandidates?.some((candidate) => candidate.slug === siNeighborhoodChoice)), 'Si is constrained to candidates from the selected city catalog');
    assert(neighborhoodProposal?.source === 'si' && neighborhoodProposal.requiresConfirmation, 'Si neighborhood result is returned only as a user-confirmed proposal');
    assert(!siNeighborhood.body.draftPatch?.entities?.neighborhood, 'model choice never auto-applies a neighborhood or moves the map');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SI_POST_URL = 'http://127.0.0.1:1/predict';
  }

  const nearMiss = await analyze(
    {
      sourceText: 'یک مغازه در محدوده چهارراه فرامرز عابسی می‌خواهم',
      cityName: 'مشهد',
      citySlug: 'mashhad',
      cityLockedByUser: true,
    },
    '127.0.0.104'
  );
  assert(nearMiss.status === 200, 'near-match location request returns successfully');
  assert(!nearMiss.body.draftPatch?.entities?.neighborhood, 'a two-edit near match is not auto-applied');
  assert(
    nearMiss.body.locationCandidates?.some((candidate) => candidate.slug === 'شهید-فرامرز-عباسی'),
    'a two-edit near match is surfaced for explicit user confirmation'
  );

  const catalogOnlyCity = await analyze(
    {
      sourceText: 'برای اجاره آپارتمان در فولادشهر می‌خواهم',
    },
    '127.0.0.105'
  );
  const catalogOnlyCityEntities = catalogOnlyCity.body.draftPatch?.entities ?? {};
  assert(catalogOnlyCity.status === 200, 'a city known only to the full neighborhood catalog returns successfully');
  assert(catalogOnlyCityEntities.city === 'فولادشهر', 'city outside the short URL registry is extracted from exact text');
  assert(catalogOnlyCityEntities.citySlug === 'foolad-shahr', 'the catalog city id is preserved as a usable city slug');

  const uniqueHood = await analyze(
    {
      sourceText: 'یک آپارتمان ۱۳۰ متری در جردن میخوام ۱۰۰ میلیون رهن دارم ۱۰ میلیون اجاره',
    },
    '127.0.0.110'
  );
  const uniqueHoodEntities = uniqueHood.body.draftPatch?.entities ?? {};
  assert(uniqueHood.status === 200, 'a unique nationwide neighborhood name returns successfully');
  assert(uniqueHoodEntities.city === 'تهران', 'a neighborhood name unique to one catalog infers that city');
  assert(uniqueHoodEntities.citySlug === 'tehran', 'the registry slug is preferred for the inferred city');
  assert(uniqueHoodEntities.neighborhood === 'جردن', 'the neighborhood auto-resolves inside the inferred city');
  assert(uniqueHoodEntities.neighborhoodSlug === 'جردن', 'the catalog slug is applied for the inferred city');
  assert(
    typeof uniqueHoodEntities.lat === 'number' && typeof uniqueHoodEntities.lng === 'number',
    'the inferred neighborhood carries its catalog centroid for the map pin'
  );
  const uniqueHoodCityField = uniqueHood.body.fields?.find((field) => field.key === 'city');
  assert(uniqueHoodCityField && !uniqueHoodCityField.requiresConfirmation, 'an exact unique city inference auto-applies');
  assert(uniqueHoodCityField?.confidence === 0.9, 'an exact unique city inference carries its documented confidence');
  assert(!(uniqueHood.body.gaps ?? []).includes('city'), 'a resolved city is never still reported missing');
  assert((uniqueHood.body.locationCandidates ?? []).length === 0, 'an exact unique match leaves no disambiguation candidates');

  const multiCityHood = await analyze(
    {
      sourceText: 'من یک آپارتمان ۱۴۳ متری به بالا میخوام در محدوده نیاوران ۱ ملیارد رهن دارم ۲۰۰ میلیون اجاره',
    },
    '127.0.0.111'
  );
  const multiCityHoodEntities = multiCityHood.body.draftPatch?.entities ?? {};
  assert(multiCityHood.status === 200, 'a neighborhood name shared by several cities returns successfully');
  assert(!multiCityHoodEntities.city, 'a multi-city neighborhood name is never silently assigned to one city');
  assert(!multiCityHoodEntities.neighborhood, 'no neighborhood auto-resolves without a city scope');
  const multiCityCandidates = multiCityHood.body.locationCandidates ?? [];
  const distinctCandidateCities = new Set(multiCityCandidates.map((candidate) => candidate.city));
  assert(multiCityCandidates.length >= 2, 'multi-city matches surface ranked candidates for fast choice');
  assert(distinctCandidateCities.size >= 2, 'candidates span distinct cities instead of guessing one');
  assert(
    multiCityCandidates.every((candidate) => candidate.city?.trim() && candidate.citySlug?.trim()),
    'every multi-city candidate carries its city and catalog city id for chips'
  );
  assert(
    multiCityCandidates.some((candidate) => candidate.label === 'نیاوران' && candidate.city === 'تهران'),
    'the prominent Tehran match ranks among the candidates'
  );
  assert((multiCityHood.body.gaps ?? []).includes('city'), 'the missing city is still reported for a multi-city match');
  assert((multiCityHood.body.gaps ?? []).includes('neighborhood'), 'the unresolved neighborhood is reported for a multi-city match');
  assert(
    (multiCityHood.body.warnings ?? []).some((warning) => warning.includes('چند شهر')),
    'a multi-city match explains itself instead of failing silently'
  );

  const lockedHoodCity = await analyze(
    {
      sourceText: 'یک آپارتمان ۱۳۰ متری در جردن میخوام',
      cityName: 'مشهد',
      citySlug: 'mashhad',
      cityLockedByUser: true,
    },
    '127.0.0.112'
  );
  const lockedHoodEntities = lockedHoodCity.body.draftPatch?.entities ?? {};
  assert(lockedHoodCity.status === 200, 'a user-locked city is never overridden by nationwide inference');
  assert(lockedHoodEntities.city !== 'تهران', 'a locked city wins over an exact unique neighborhood match');

  const bareMultiHood = await analyze(
    {
      sourceText: 'در محدوده نیاوران',
    },
    '127.0.0.113'
  );
  assert(bareMultiHood.status === 200, 'a bare multi-city neighborhood fragment returns successfully');
  assert(
    (bareMultiHood.body.locationCandidates ?? []).length >= 2,
    'a bare multi-city fragment still surfaces city-stamped candidates'
  );

  const originalFetchForCityless = globalThis.fetch;
  process.env.SI_POST_URL = 'http://127.0.0.1:8101/predict';
  let citylessQuestions: Record<string, unknown> | undefined;
  globalThis.fetch = async (_input, init) => {
    const payload = JSON.parse(String(init?.body)) as { questions?: Record<string, unknown> };
    citylessQuestions = payload.questions;
    return new Response(JSON.stringify({ answers: {} }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  try {
    const citylessSi = await analyze(
      {
        sourceText: 'در محدوده نیاوران',
      },
      '127.0.0.114'
    );
    assert(citylessSi.status === 200, 'a city-less multi-city request reaches Si without failing');
    assert(
      !citylessQuestions || !('neighborhood_candidate' in citylessQuestions),
      'a city-less multi-city match never becomes a Si neighborhood question'
    );
  } finally {
    globalThis.fetch = originalFetchForCityless;
    process.env.SI_POST_URL = 'http://127.0.0.1:1/predict';
  }

  console.log('post natural route self-test: ok');
} finally {
  if (previousSiUrl === undefined) delete process.env.SI_POST_URL;
  else process.env.SI_POST_URL = previousSiUrl;
}
