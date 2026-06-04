import { buildBrowsePageTitlesFromPath, truncateBrowsePageH1 } from '@/lib/browse/page-heading';
import { scopeLabelForHeading, scopeFromUrl } from '@/lib/search/location-scope';
import { SITE_NAME } from '@/lib/seo';

function assert(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

interface HeadingCase {
  pathname: string;
  search?: Record<string, string>;
  listingType: 'need' | 'business';
  expectedH1: string;
  expectedLocationLabel?: string;
}

const HEADING_CASES: HeadingCase[] = [
  {
    pathname: '/n/tehran/real-estate',
    listingType: 'need',
    expectedH1: 'نیازهای املاک در تهران',
    expectedLocationLabel: 'تهران',
  },
  {
    pathname: '/n/iran/real-estate',
    listingType: 'need',
    expectedH1: 'نیازهای املاک در سراسر ایران',
    expectedLocationLabel: 'سراسر ایران',
  },
  {
    pathname: '/n/iran/real-estate',
    search: { cities: 'tehran,mashhad' },
    listingType: 'need',
    expectedH1: 'نیازهای املاک در تهران، مشهد',
    expectedLocationLabel: 'تهران، مشهد',
  },
  {
    pathname: '/n/tehran',
    listingType: 'need',
    expectedH1: 'نیازها در تهران',
    expectedLocationLabel: 'تهران',
  },
  {
    pathname: '/b/tehran/real-estate',
    listingType: 'business',
    expectedH1: 'کسب‌وکارهای املاک در تهران',
    expectedLocationLabel: 'تهران',
  },
];

function toSearchParams(search?: Record<string, string>): URLSearchParams {
  const params = new URLSearchParams();
  if (!search) return params;
  for (const [key, value] of Object.entries(search)) {
    params.set(key, value);
  }
  return params;
}

function testHeadingCases(): string[] {
  const failed: string[] = [];

  for (const testCase of HEADING_CASES) {
    const searchParams = toSearchParams(testCase.search);
    const titles = buildBrowsePageTitlesFromPath(
      testCase.pathname,
      searchParams,
      SITE_NAME,
      testCase.listingType
    );

    failed.push(
      assert(
        titles.h1 === testCase.expectedH1,
        `${testCase.pathname}: h1 expected "${testCase.expectedH1}", got "${titles.h1}"`
      ) ?? ''
    );

    if (testCase.expectedLocationLabel) {
      failed.push(
        assert(
          titles.locationLabel === testCase.expectedLocationLabel,
          `${testCase.pathname}: locationLabel expected "${testCase.expectedLocationLabel}", got "${titles.locationLabel}"`
        ) ?? ''
      );
    }

    failed.push(
      assert(
        titles.title === `${testCase.expectedH1} | ${SITE_NAME}`,
        `${testCase.pathname}: title should match H1 + site name`
      ) ?? ''
    );

    failed.push(
      assert(
        titles.description.includes(testCase.expectedH1.split(' در ')[1] ?? ''),
        `${testCase.pathname}: description should mention location`
      ) ?? ''
    );
  }

  return failed.filter(Boolean);
}

function testScopeLabelForHeading(): string[] {
  const failed: string[] = [];
  const multiCity = scopeFromUrl('/n/iran/real-estate', new URLSearchParams('cities=tehran,mashhad'));
  failed.push(
    assert(
      scopeLabelForHeading(multiCity) === 'تهران، مشهد',
      `scopeLabelForHeading multi-city: got "${scopeLabelForHeading(multiCity)}"`
    ) ?? ''
  );

  const singleCity = scopeFromUrl('/n/tehran/real-estate', new URLSearchParams());
  failed.push(
    assert(
      scopeLabelForHeading(singleCity) === 'تهران',
      `scopeLabelForHeading single city: got "${scopeLabelForHeading(singleCity)}"`
    ) ?? ''
  );

  const multiProvince = scopeFromUrl(
    '/n/iran/electronics',
    new URLSearchParams('provinces=tehran,isfahan')
  );
  failed.push(
    assert(
      scopeLabelForHeading(multiProvince) === 'تهران، اصفهان',
      `scopeLabelForHeading multi-province: got "${scopeLabelForHeading(multiProvince)}"`
    ) ?? ''
  );

  return failed.filter(Boolean);
}

function testTruncateBrowsePageH1(): string[] {
  const failed: string[] = [];
  const long = 'ا'.repeat(200);
  const truncated = truncateBrowsePageH1(long);
  failed.push(
    assert(truncated.length === 160, `truncate: length expected 160, got ${truncated.length}`) ?? ''
  );
  failed.push(
    assert(truncated.endsWith('...'), 'truncate: should end with ...') ?? ''
  );
  failed.push(
    assert(truncateBrowsePageH1('نیازها در تهران') === 'نیازها در تهران', 'truncate: short unchanged') ??
      ''
  );
  return failed.filter(Boolean);
}

function main(): void {
  const failed = [
    ...testHeadingCases(),
    ...testScopeLabelForHeading(),
    ...testTruncateBrowsePageH1(),
  ];
  if (failed.length > 0) {
    console.error('page-heading self-test FAILED:');
    failed.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`page-heading self-test passed (${HEADING_CASES.length} heading cases + scope labels)`);
}

main();
