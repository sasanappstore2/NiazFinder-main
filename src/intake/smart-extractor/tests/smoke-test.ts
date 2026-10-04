/**
 * Smoke test for Smart Field Extractor (Claude Step 2)
 * Run: npx tsx src/intake/smart-extractor/tests/smoke-test.ts
 */

import { extractSmartFields } from '../smart-field-extractor';

const testCases = [
  {
    input: 'آپارتمان 2 خواب 100 متر برای اجاره در سجاد مشهد',
    expected: { rooms: 2, area: 100, neighborhood: 'سجاد', type: 'RENT' },
  },
  {
    input: 'خونه میخوام 100 میلیون رهن 10 میلیون اجاره احمدآباد',
    expected: { deposit: 100_000_000, rent: 10_000_000, type: 'DEPOSIT_AND_RENT' },
  },
  {
    input: 'رهن کامل 500 میلیون 3 خواب با پارکینگ و آسانسور',
    expected: {
      deposit: 500_000_000,
      rooms: 3,
      parking: true,
      elevator: true,
      type: 'FULL_DEPOSIT',
    },
  },
] as const;

function assertMatch(label: string, got: unknown, expected: unknown): boolean {
  const ok = got === expected;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: got=${JSON.stringify(got)} expected=${JSON.stringify(expected)}`);
  return ok;
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const result = await extractSmartFields(tc.input, '', {
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      useAI: false,
      useRules: true,
    });

    console.log(`\nInput: ${tc.input}`);
    console.log('Expected:', tc.expected);
    const got = {
      rooms: result.property?.rooms,
      area: result.property?.area,
      neighborhood: result.location?.neighborhood,
      type: result.transaction?.type,
      deposit: result.budget?.depositAmount,
      rent: result.budget?.rentAmount,
      parking: result.property?.hasParking,
      elevator: result.property?.hasElevator,
      city: result.location?.city,
      rules: result.trace?.rulesUsed,
      ms: result.trace?.extractionTime,
    };
    console.log('Got:', got);

    const checks: Array<[string, unknown, unknown]> = [];
    if ('rooms' in tc.expected) checks.push(['rooms', got.rooms, tc.expected.rooms]);
    if ('area' in tc.expected) checks.push(['area', got.area, tc.expected.area]);
    if ('neighborhood' in tc.expected) {
      checks.push(['neighborhood', got.neighborhood, tc.expected.neighborhood]);
    }
    if ('type' in tc.expected) checks.push(['type', got.type, tc.expected.type]);
    if ('deposit' in tc.expected) checks.push(['deposit', got.deposit, tc.expected.deposit]);
    if ('rent' in tc.expected) checks.push(['rent', got.rent, tc.expected.rent]);
    if ('parking' in tc.expected) checks.push(['parking', got.parking, tc.expected.parking]);
    if ('elevator' in tc.expected) checks.push(['elevator', got.elevator, tc.expected.elevator]);

    let caseOk = true;
    for (const [label, g, e] of checks) {
      if (!assertMatch(label, g, e)) caseOk = false;
    }
    if (caseOk) passed += 1;
    else failed += 1;
  }

  console.log(`\n=== Smoke summary: ${passed}/${passed + failed} passed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
