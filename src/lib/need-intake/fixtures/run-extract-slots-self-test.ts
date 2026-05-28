import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { findNeighborhoodInAnyCity } from '@/lib/need-intake/neighborhood-catalog.server';

const CASES: { id: string; text: string; expect: Partial<ReturnType<typeof extractPropertySlotsFromText>> }[] =
  [
    {
      id: 'area-max-farsi',
      text: 'میخوام آپارتمان ۱۵۰ متر حداکثر',
      expect: { areaMax: '150' },
    },
    {
      id: 'area-min',
      text: 'حداقل ۸۰ متر آپارتمان',
      expect: { areaMin: '80' },
    },
    {
      id: 'rooms',
      text: 'آپارتمان دو خواب تهران',
      expect: { rooms: '2' },
    },
    {
      id: 'partnership-area-width',
      text: '۵۰۰ متر برای مشارکت در ساخت عرض ۱۲',
      expect: { areaMin: '500', plotWidth: '12' },
    },
    {
      id: 'nightly-rent-guests',
      text: 'اجاره روزانه برای ۳ نفر 800000 تومان شب',
      expect: { guestCount: '3', nightlyRent: '800000' },
    },
    {
      id: 'price-per-meter',
      text: 'آپارتمان متری 45000000 تهران',
      expect: { pricePerMeterMin: '45000000' },
    },
    {
      id: 'area-metri-not-ppm',
      text: 'یک خونه مجردی ۵۰ متری میخوام منطقه سجاد مشهد',
      expect: { areaMin: '50' },
    },
    {
      id: 'floor',
      text: 'آپارتمان طبقه ۵ تهران',
      expect: { floorMin: '5' },
    },
  ];

function run(): { failed: string[] } {
  const failed: string[] = [];
  for (const c of CASES) {
    const got = extractPropertySlotsFromText(c.text);
    for (const [key, val] of Object.entries(c.expect)) {
      const k = key as keyof typeof got;
      if (got[k] !== val) {
        failed.push(`${c.id}: ${k} got ${got[k]} expected ${val}`);
      }
    }
  }

  const hood = findNeighborhoodInAnyCity('فرامرز عباسی');
  if (!hood?.slug.includes('فرامرز')) {
    failed.push(`neighborhood: expected فرامرز match, got ${hood?.slug ?? 'null'}`);
  }
  if (hood?.city !== 'مشهد') {
    failed.push(`neighborhood city: got ${hood?.city} expected مشهد`);
  }

  const falseHood = findNeighborhoodInAnyCity(
    'یک خانه مجردی با اجاره کوتاه مدت چند ساعته میخوام'
  );
  if (falseHood?.name === 'ده دی') {
    failed.push('neighborhood: false positive ده دی from مجردی/ساعته');
  }

  return { failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-extract-slots-self-test'));

if (isDirectRun) {
  const { failed } = run();
  if (failed.length) {
    console.error('extract-slots FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log('extract-slots OK');
}

export { run as runExtractSlotsSelfTest };
