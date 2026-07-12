/**
 * Expand Smart Intake scenarios to 1000 deterministic Tehran/Mashhad cases.
 * Kept separate so hand-written goldens (1–100) stay readable.
 */

import type { ExpectedField, SmartIntakeScenario } from './scenarios';

function eq(path: string, equals: unknown): ExpectedField {
  return { path, equals };
}

const MASHHAD_HOODS = [
  'سجاد',
  'احمدآباد',
  'وکیل آباد',
  'کوهسنگی',
  'قاسم آباد',
  'الهیه',
  'فردوسی',
  'بنفشه',
  'خیام',
  'امامت',
] as const;

const TEHRAN_HOODS = [
  'ونک',
  'جردن',
  'نیاوران',
  'زعفرانیه',
  'پاسداران',
  'فرمانیه',
  'تجریش',
  'سعادت آباد',
  'شهرک غرب',
  'الهیه',
] as const;

type CityCfg = { name: string; slug: string; hoods: readonly string[] };

const CITIES: CityCfg[] = [
  { name: 'مشهد', slug: 'mashhad', hoods: MASHHAD_HOODS },
  { name: 'تهران', slug: 'tehran', hoods: TEHRAN_HOODS },
];

function cityOf(i: number): CityCfg {
  return CITIES[i % CITIES.length]!;
}

function hoodOf(city: CityCfg, i: number): string {
  return city.hoods[i % city.hoods.length]!;
}

/**
 * Build scenarios 101–1000 (900 cases). Combined with hand-written 1–100 → 1000.
 */
export function buildCorpus1000Extra(): SmartIntakeScenario[] {
  const out: SmartIntakeScenario[] = [];
  let id = 101;

  const push = (partial: Omit<SmartIntakeScenario, 'id'> & { id?: string }) => {
    out.push({ ...partial, id: String(id++) });
  };

  // --- A: apartment rent rooms+area (120) ---
  for (let i = 0; i < 120; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const rooms = (i % 4) + 1;
    const area = 60 + (i % 20) * 5;
    push({
      description: `corpus-rent-${i + 1}`,
      needText: `آپارتمان ${rooms} خواب ${area} متر برای اجاره در ${hood} ${city.name}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-rent',
      expected: [
        eq('property.rooms', rooms),
        eq('property.area', area),
        eq('transaction.type', 'RENT'),
        { path: 'location.neighborhood', includes: hood.replace(/\s+/g, '').slice(0, 3) === 'وکیل' ? 'وکیل' : hood.slice(0, 3) },
      ],
    });
  }

  // Fix neighborhood includes properly - use smarter includes
  // Actually the includes for وکیل آباد should be 'وکیل'. For others use first meaningful part.
  // Let me regenerate rent with better includes in a cleaner way - I'll rewrite the loop.

  out.length = 0;
  id = 101;

  const hoodIncludes = (hood: string): string => {
    if (hood.includes('وکیل')) return 'وکیل';
    if (hood.includes('کوه')) return 'کوه';
    if (hood.includes('قاسم')) return 'قاسم';
    if (hood.includes('سعادت')) return 'سعادت';
    if (hood.includes('شهرک')) return 'شهرک';
    return hood.slice(0, Math.min(4, hood.length));
  };

  for (let i = 0; i < 120; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const rooms = (i % 4) + 1;
    const area = 60 + (i % 20) * 5;
    push({
      description: `corpus-rent-${i + 1}`,
      needText: `آپارتمان ${rooms} خواب ${area} متر برای اجاره در ${hood} ${city.name}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-rent',
      expected: [
        eq('property.rooms', rooms),
        eq('property.area', area),
        eq('transaction.type', 'RENT'),
        { path: 'location.neighborhood', includes: hoodIncludes(hood) },
      ],
    });
  }

  // --- B: deposit+rent (100) ---
  for (let i = 0; i < 100; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 3);
    const deposit = 50 + (i % 25) * 20; // 50..530
    const rent = 3 + (i % 15); // 3..17
    const rooms = (i % 3) + 1;
    push({
      description: `corpus-rahn-ejare-${i + 1}`,
      needText: `خونه ${rooms} خواب ${deposit} میلیون رهن ${rent} میلیون اجاره در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-rahn-ejare',
      expected: [
        eq('transaction.type', 'DEPOSIT_AND_RENT'),
        eq('budget.depositAmount', deposit * 1_000_000),
        eq('budget.rentAmount', rent * 1_000_000),
        eq('property.rooms', rooms),
      ],
    });
  }

  // --- C: full deposit (80) ---
  for (let i = 0; i < 80; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 1);
    const deposit = 200 + (i % 20) * 50;
    push({
      description: `corpus-full-rahn-${i + 1}`,
      needText: `آپارتمان رهن کامل ${deposit} میلیون در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-full-rahn',
      expected: [
        eq('transaction.type', 'FULL_DEPOSIT'),
        eq('budget.depositAmount', deposit * 1_000_000),
      ],
    });
  }

  // --- D: buy with single budget (80) ---
  for (let i = 0; i < 80; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 2);
    const billions = 1 + (i % 8); // 1..8
    const rooms = (i % 4) + 1;
    push({
      description: `corpus-buy-${i + 1}`,
      needText: `خرید آپارتمان ${rooms} خواب با بودجه ${billions} میلیارد در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-buy',
      expected: [
        eq('transaction.type', 'BUY'),
        eq('property.rooms', rooms),
        eq('budget.max', billions * 1_000_000_000),
      ],
    });
  }

  // --- E: buy range (60) ---
  for (let i = 0; i < 60; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const minB = 1 + (i % 5);
    const maxB = minB + 1 + (i % 3);
    push({
      description: `corpus-buy-range-${i + 1}`,
      needText: `آپارتمان برای خرید بین ${minB} تا ${maxB} میلیارد در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-buy-range',
      expected: [
        eq('transaction.type', 'BUY'),
        eq('budget.min', minB * 1_000_000_000),
        eq('budget.max', maxB * 1_000_000_000),
      ],
    });
  }

  // --- F: amenities parking/elevator (50) ---
  for (let i = 0; i < 50; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 4);
    const hasP = i % 2 === 0;
    const hasE = i % 3 !== 0;
    const amen = [hasP ? 'پارکینگ' : null, hasE ? 'آسانسور' : null].filter(Boolean).join(' و ');
    const rent = 8 + (i % 10);
    push({
      description: `corpus-amenity-${i + 1}`,
      needText: `اجاره آپارتمان در ${hood}، ${amen || 'نورگیر'}، ${rent} میلیون اجاره`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-amenity',
      expected: [
        eq('transaction.type', 'RENT'),
        ...(hasP ? [eq('property.hasParking', true)] : []),
        ...(hasE ? [eq('property.hasElevator', true)] : []),
        eq('budget.rentAmount', rent * 1_000_000),
      ],
    });
  }

  // --- G: urgency (40) ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const rooms = (i % 3) + 1;
    push({
      description: `corpus-urgency-${i + 1}`,
      needText: `فوری نیاز به آپارتمان ${rooms} خواب اجاره در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-urgency',
      expected: [
        eq('metadata.urgency', 'immediate'),
        eq('property.rooms', rooms),
        eq('transaction.type', 'RENT'),
      ],
    });
  }

  // --- H: service cleaning (40) — anti RE leak ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 5);
    push({
      description: `corpus-service-${i + 1}`,
      needText: `نظافت آپارتمانم در ${hood} ${city.name} تا آخر تیر`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-service',
      expected: [
        eq('category.value', 'services'),
        eq('transaction.type', 'SERVICE'),
        eq('metadata.urgency', 'this_month'),
      ],
    });
  }

  // --- I: rent→buy correction (50) ---
  for (let i = 0; i < 50; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 1);
    const billions = 1 + (i % 6);
    const deposit = 100 + (i % 10) * 20;
    const rent = 5 + (i % 8);
    push({
      description: `corpus-rent-to-buy-${i + 1}`,
      needText: `آپارتمان اجاره‌ای در ${hood}، حدود ${deposit} میلیون رهن و ${rent} میلیون اجاره راستش می‌خوام بخرم، بودجه ${billions} میلیارد تومان`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-rent-to-buy',
      expected: [
        eq('transaction.type', 'BUY'),
        eq('budget.max', billions * 1_000_000_000),
      ],
    });
  }

  // --- J: buy→rent correction (50) ---
  for (let i = 0; i < 50; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 2);
    const deposit = 200 + (i % 15) * 50;
    push({
      description: `corpus-buy-to-rent-${i + 1}`,
      needText: `می‌خوام یه آپارتمان بخرم در ${hood}. راستش نه، می‌خوام رهن کنم، رهن ${deposit} میلیون`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-buy-to-rent',
      expected: [
        eq('transaction.type', 'FULL_DEPOSIT'),
        eq('budget.depositAmount', deposit * 1_000_000),
      ],
    });
  }

  // --- K: budget floor/ceiling (40) ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    if (i % 2 === 0) {
      const maxM = 300 + (i % 10) * 50;
      push({
        description: `corpus-ceil-${i + 1}`,
        needText: `خرید آپارتمان زیر ${maxM} میلیون در ${hood}`,
        preferredCity: city.name,
        preferredCitySlug: city.slug,
        category: 'corpus-budget-bound',
        expected: [
          eq('transaction.type', 'BUY'),
          eq('budget.min', null),
          eq('budget.max', maxM * 1_000_000),
        ],
      });
    } else {
      const minM = 200 + (i % 10) * 40;
      push({
        description: `corpus-floor-${i + 1}`,
        needText: `خرید آپارتمان بالای ${minM} میلیون در ${hood}`,
        preferredCity: city.name,
        preferredCitySlug: city.slug,
        category: 'corpus-budget-bound',
        expected: [
          eq('transaction.type', 'BUY'),
          eq('budget.min', minM * 1_000_000),
          eq('budget.max', null),
        ],
      });
    }
  }

  // --- L: deposit+rent ranges (40) ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 3);
    const dMin = 100 + (i % 8) * 25;
    const dMax = dMin + 50;
    const rMin = 4 + (i % 5);
    const rMax = rMin + 2;
    push({
      description: `corpus-range-rent-${i + 1}`,
      needText: `آپارتمان اجاره رهن ${dMin} تا ${dMax} میلیون اجاره ${rMin} تا ${rMax} میلیون در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-range-rent',
      expected: [
        eq('transaction.type', 'DEPOSIT_AND_RENT'),
        eq('budget.depositMin', dMin * 1_000_000),
        eq('budget.depositMax', dMax * 1_000_000),
        eq('budget.rentMin', rMin * 1_000_000),
        eq('budget.rentMax', rMax * 1_000_000),
      ],
    });
  }

  // --- M: pre-sale after rent history (30) ---
  for (let i = 0; i < 30; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 6);
    const billions = 2 + (i % 5);
    push({
      description: `corpus-presale-${i + 1}`,
      needText: `الان رهن‌نشین‌ام، رهن ${300 + i * 10} میلیون اجاره ${10 + (i % 5)} میلیون می‌دم توی ${hood}. ولی راستش می‌خوام یه واحد پیش‌فروش بخرم، بودجه کل ${billions} میلیارد.`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-presale',
      expected: [
        eq('transaction.type', 'BUY'),
        eq('category.value', 'pre-sale-services'),
        eq('budget.max', billions * 1_000_000_000),
      ],
    });
  }

  // --- N: long-noise performance (40) ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const rooms = (i % 4) + 1;
    const area = 70 + (i % 15) * 5;
    const padding = ' جزئیات محله و نور و سکوت و دسترسی مترو و پارک.'.repeat(6);
    push({
      description: `corpus-long-${i + 1}`,
      needText: `آپارتمان ${rooms} خواب ${area} متر برای اجاره در ${hood} ${city.name}.${padding}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-performance',
      expected: [
        eq('property.rooms', rooms),
        eq('property.area', area),
        eq('transaction.type', 'RENT'),
      ],
    });
  }

  // --- O: floor totalFloors (30) ---
  for (let i = 0; i < 30; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const floor = 1 + (i % 5);
    const total = floor + 2 + (i % 3);
    push({
      description: `corpus-floor-${i + 1}`,
      needText: `آپارتمان طبقه ${floor} از ${total} طبقه برای اجاره در ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-floor',
      expected: [
        eq('property.floor', floor),
        eq('property.totalFloors', total),
        eq('transaction.type', 'RENT'),
      ],
    });
  }

  // --- P: colloquial / typos smoke (40) ---
  for (let i = 0; i < 40; i++) {
    const city = cityOf(i);
    const hood = hoodOf(city, i + 7);
    const rooms = (i % 3) + 1;
    push({
      description: `corpus-colloquial-${i + 1}`,
      needText: `خونه ${rooms} خوابه میخوام اجاره ${hood}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-colloquial',
      expected: [
        eq('property.rooms', rooms),
        eq('transaction.type', 'RENT'),
      ],
    });
  }

  // Pad/truncate to exactly 900 extras
  if (out.length > 900) {
    out.length = 900;
  }
  while (out.length < 900) {
    const i = out.length;
    const city = cityOf(i);
    const hood = hoodOf(city, i);
    const rooms = (i % 4) + 1;
    push({
      description: `corpus-pad-${i + 1}`,
      needText: `اجاره آپارتمان ${rooms} خواب در ${hood} ${city.name}`,
      preferredCity: city.name,
      preferredCitySlug: city.slug,
      category: 'corpus-pad',
      expected: [eq('property.rooms', rooms), eq('transaction.type', 'RENT')],
      smokeOnly: out.length >= 895,
    });
  }

  // Re-id 101..1000
  return out.map((s, idx) => ({ ...s, id: String(101 + idx) }));
}
