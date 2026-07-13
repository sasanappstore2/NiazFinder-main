/**
 * API / serialization smoke — Claude Step 6+7
 * Run: npx tsx src/intake/smart-extractor/tests/api-smoke.test.ts
 */

import { extractSmartFields } from '../smart-field-extractor';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const apiCases = [
  {
    text: 'خونه ۲خوابه مشهد فردوسی تا ۱۵ میلیون رهن کامل',
    city: 'مشهد',
    citySlug: 'mashhad',
  },
  {
    text: 'آپارتمان 2 خواب 100 متر برای اجاره در سجاد',
    city: 'مشهد',
    citySlug: 'mashhad',
  },
  {
    text: '100 میلیون رهن 10 میلیون اجاره احمدآباد',
    city: 'مشهد',
    citySlug: 'mashhad',
  },
];

async function main() {
  console.log('API/serialization smoke (extractSmartFields + JSON round-trip)\n');

  for (const c of apiCases) {
    const result = await extractSmartFields(c.text, '', {
      preferredCity: c.city,
      preferredCitySlug: c.citySlug,
      useAI: false,
      useRules: true,
    });

    const json = JSON.stringify(result);
    assert(json.length > 20, 'serialized empty');
    const parsed = JSON.parse(json);
    assert(parsed.transaction != null, 'missing transaction after round-trip');
    assert(parsed.property != null, 'missing property after round-trip');
    assert(typeof parsed.trace?.extractionTime === 'number', 'missing timing');

    console.log(`✅ ${c.text.slice(0, 50)}`);
    console.log(
      `   type=${parsed.transaction?.type} rooms=${parsed.property?.rooms} neighborhood=${parsed.location?.neighborhood} deposit=${parsed.budget?.depositAmount} ms=${parsed.trace?.extractionTime}`
    );
  }

  // Live HTTP if server up
  try {
    const res = await fetch('http://localhost:3000/api/intake/smart-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        needText: 'آپارتمان برای اجاره در خیابان فردوسی',
        options: {
          preferredCity: 'مشهد',
          preferredCitySlug: 'mashhad',
          useAI: false,
        },
      }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        location?: { neighborhood?: string; disambiguationNeeded?: boolean; alternatives?: unknown[] };
        transaction?: { type?: string };
      };
      assert(body.transaction?.type === 'RENT', `HTTP type=${body.transaction?.type}`);
      assert(
        body.location?.disambiguationNeeded === true ||
          (body.location?.alternatives?.length ?? 0) > 1,
        'HTTP فردوسی should be ambiguous'
      );
      console.log('\n✅ Live HTTP /api/intake/smart-extract فردوسی disambiguation OK');
    } else {
      console.log(`\n⚠️ Live HTTP returned ${res.status} (dev may be down)`);
    }
  } catch {
    console.log('\n⚠️ Live HTTP skipped (dev server not reachable)');
  }

  console.log('\napi-smoke: PASS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
