import { buildIntakeIndexesSync } from '@/intake/dictionaries/loader';
import { analyzeNeedText } from '@/intake/engine/intakeEngine';

interface Fixture {
  id: string;
  text: string;
  preferredCitySlug?: string;
  preferredCityName?: string;
  expect: {
    categoryIncludes?: string;
    city?: string;
    neighborhoodIncludes?: string;
    area?: number;
    transactionType?: string | null;
    missingIncludes?: string[];
    maxLatencyMs?: number;
  };
}

const FIXTURES: Fixture[] = [
  {
    id: 'apartment-mashhad-faramarz',
    text: 'من یک آپارتمان ۱۸۰ متری در فرامرز عباسی میخوام',
    expect: {
      categoryIncludes: 'apartment',
      area: 180,
      transactionType: null,
      missingIncludes: ['transactionType'],
      maxLatencyMs: 30,
    },
  },
  {
    id: 'apartment-rent-explicit',
    text: 'آپارتمان 120 متری برای اجاره در تهران',
    expect: {
      categoryIncludes: 'apartment',
      city: 'تهران',
      area: 120,
      transactionType: 'RENT',
    },
  },
  {
    id: 'plumber-urgent',
    text: 'لوله کشی فوری در مشهد',
    expect: {
      categoryIncludes: 'plumb',
      city: 'مشهد',
    },
  },
  {
    id: 'budget-billion',
    text: 'خرید آپارتمان 10 میلیارد در مشهد',
    expect: {
      categoryIncludes: 'apartment',
      transactionType: 'BUY',
      city: 'مشهد',
    },
  },
  {
    id: 'rooms-two',
    text: 'آپارتمان دو خوابه در اصفهان',
    expect: {
      categoryIncludes: 'apartment',
      city: 'اصفهان',
    },
  },
  {
    id: 'imamat-prefers-user-city',
    text: 'خونه در محله امامت',
    preferredCitySlug: 'yasuj',
    preferredCityName: 'یاسوج',
    expect: {
      city: 'یاسوج',
      neighborhoodIncludes: 'امامت',
    },
  },
];

/** Minimal neighborhood rows for offline self-test (no filesystem). */
const TEST_NEIGHBORHOOD_ROWS = [
  {
    cityId: 'mashhad',
    cityName: 'مشهد',
    id: 'faramarz-abbasi',
    name: 'شهید فرامرز عباسی',
    areas: ['فرامرز عباسی', 'فرامرز'],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'vanak',
    name: 'ونک',
    areas: [],
  },
  {
    cityId: 'yasuj',
    cityName: 'یاسوج',
    id: 'imamat-yasuj',
    name: 'امامت',
    areas: [],
  },
  {
    cityId: 'tehran-city',
    cityName: 'تهران',
    id: 'imamat-tehran',
    name: 'امامت',
    areas: [],
  },
];

export function runIntakeEngineSelfTest(): { passed: number; failed: string[] } {
  const indexes = buildIntakeIndexesSync(TEST_NEIGHBORHOOD_ROWS);
  const failed: string[] = [];

  for (const f of FIXTURES) {
    const result = analyzeNeedText(f.text, indexes, {
      preferredCitySlug: f.preferredCitySlug,
      preferredCityName: f.preferredCityName,
    });
    const { expect: e } = f;

    if (e.categoryIncludes) {
      const hay = [result.entities.category, result.entities.categorySlug, result.entities.subcategorySlug]
        .filter(Boolean)
        .join(' ');
      if (!hay.includes(e.categoryIncludes)) {
        failed.push(`${f.id}: category expected includes "${e.categoryIncludes}" got "${hay}"`);
      }
    }
    if (e.city && result.entities.city !== e.city) {
      failed.push(`${f.id}: city expected "${e.city}" got "${result.entities.city}"`);
    }
    if (e.neighborhoodIncludes) {
      const n = result.entities.neighborhood ?? '';
      if (!n.includes(e.neighborhoodIncludes)) {
        failed.push(`${f.id}: neighborhood expected includes "${e.neighborhoodIncludes}" got "${n}"`);
      }
    }
    if (e.area != null && result.entities.area !== e.area) {
      failed.push(`${f.id}: area expected ${e.area} got ${result.entities.area}`);
    }
    if (e.transactionType !== undefined && result.entities.transactionType !== e.transactionType) {
      failed.push(
        `${f.id}: transactionType expected ${e.transactionType} got ${result.entities.transactionType}`
      );
    }
    if (e.missingIncludes) {
      const missingNames = result.missingFields.map((m) => m.field);
      for (const field of e.missingIncludes) {
        if (!missingNames.includes(field)) {
          failed.push(`${f.id}: missingFields expected to include "${field}" got [${missingNames}]`);
        }
      }
    }
    if (e.maxLatencyMs != null && result.latencyMs > e.maxLatencyMs) {
      failed.push(`${f.id}: latency ${result.latencyMs}ms exceeded ${e.maxLatencyMs}ms`);
    }
    if (!result.templateId) {
      failed.push(`${f.id}: templateId should be resolved`);
    }
    if (!result.completionState) {
      failed.push(`${f.id}: completionState should be present`);
    }
    if (!result.sections.length) {
      failed.push(`${f.id}: sections should not be empty`);
    }
    if (!result.nextQuestion && result.missingFields.length > 0) {
      failed.push(`${f.id}: expected nextQuestion when fields missing`);
    }
  }

  return { passed: FIXTURES.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-intake-engine-self-test'));

if (isDirectRun) {
  const { passed, failed } = runIntakeEngineSelfTest();
  if (failed.length) {
    console.error('Intake engine self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Intake engine self-test OK: ${passed}/${FIXTURES.length}`);
}
