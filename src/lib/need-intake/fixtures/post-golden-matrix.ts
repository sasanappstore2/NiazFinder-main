/**
 * Golden matrix for /post pipeline — 150+ headless scenarios.
 */
import type { PostPipelineFormInput } from '@/lib/need-intake/fixtures/post-pipeline-harness';

export interface PostGoldenExpect {
  dealType?: string;
  transactionType?: string;
  city?: string;
  categoryIncludes?: string;
  subcategoryIncludes?: string;
  rahnAmount?: number;
  monthlyRent?: number;
  budgetMin?: number;
  titleIncludes?: RegExp[];
  titleExcludes?: RegExp[];
  publishWhenComplete?: boolean;
  badAiTitle?: string;
}

export interface PostGoldenScenario {
  id: string;
  group: string;
  input: PostPipelineFormInput;
  expect: PostGoldenExpect;
}

const SHOP_RAHN_DETAILS =
  'تا سقف سرامیک باشه یک میلیارد رهن دارم ۱۰۰ میلیون اجاره';

function estateScenario(
  id: string,
  group: string,
  input: PostPipelineFormInput,
  expect: PostGoldenExpect
): PostGoldenScenario {
  return { id, group, input, expect };
}

function buildEstateDealScenarios(): PostGoldenScenario[] {
  const out: PostGoldenScenario[] = [];
  const deals: Array<{
    suffix: string;
    need: string;
    dealType: string;
    tx: string;
  }> = [
    { suffix: 'buy', need: 'آپارتمان خرید', dealType: 'buy', tx: 'BUY' },
    { suffix: 'rent', need: 'آپارتمان اجاره', dealType: 'rent_monthly', tx: 'RENT' },
    { suffix: 'rahn-full', need: 'آپارتمان رهن کامل', dealType: 'rent_rahn_full', tx: 'FULL_DEPOSIT' },
    { suffix: 'rahn-ejare', need: 'آپارتمان رهن و اجاره', dealType: 'rent_rahn_ejare', tx: 'DEPOSIT_AND_RENT' },
  ];
  const cities = ['مشهد', 'تهران', 'اصفهان', 'شیراز', 'تبریز'];
  for (const city of cities) {
    for (const d of deals) {
      out.push(
        estateScenario(
          `deal-${d.suffix}-${city}`,
          'estate-deal',
          {
            needText: `${d.need} در ${city}`,
            categorySlug: 'residential-rent',
            subcategorySlug: d.suffix === 'buy' ? 'apartment-sale' : 'apartment-rent',
            city,
          },
          {
            dealType: d.dealType,
            transactionType: d.tx,
            city,
            titleIncludes: [/آپارتمان/u],
          }
        )
      );
    }
  }
  return out;
}

function buildEstateKindScenarios(): PostGoldenScenario[] {
  const kinds: Array<{ slug: string; sub: string; label: string; need: string }> = [
    { slug: 'residential-sale', sub: 'apartment-sale', label: 'apartment', need: 'آپارتمان ۹۰ متری خرید مشهد' },
    { slug: 'residential-rent', sub: 'apartment-rent', label: 'apartment', need: 'آپارتمان دو خواب اجاره مشهد' },
    { slug: 'commercial-sale', sub: 'shop-sale', label: 'shop', need: 'مغازه فروش در مشهد' },
    { slug: 'commercial-rent', sub: 'shop-rent', label: 'shop', need: 'مغازه اجاره در مشهد' },
    { slug: 'residential-sale', sub: 'villa-sale', label: 'villa', need: 'ویلا خرید در مشهد' },
    { slug: 'residential-rent', sub: 'villa-rent', label: 'villa', need: 'ویلا اجاره در مشهد' },
    { slug: 'residential-sale', sub: 'land-sale', label: 'land', need: 'زمین ۳۰۰ متری خرید مشهد' },
    { slug: 'commercial-sale', sub: 'office-sale', label: 'office', need: 'دفتر کار خرید تهران' },
  ];
  return kinds.map((k, i) =>
    estateScenario(
      `kind-${k.label}-${i}`,
      'estate-kind',
      {
        needText: k.need,
        categorySlug: k.slug,
        subcategorySlug: k.sub,
        city: k.need.includes('تهران') ? 'تهران' : 'مشهد',
      },
      {
        city: k.need.includes('تهران') ? 'تهران' : 'مشهد',
        categoryIncludes: k.slug.split('-')[0],
        titleIncludes: [new RegExp(k.need.split(' ')[0])],
      }
    )
  );
}

function buildLocationScenarios(): PostGoldenScenario[] {
  const locs: Array<{ need: string; city: string; hood?: string; re?: RegExp }> = [
    { need: 'آپارتمان در فرامرز عباسی مشهد اجاره', city: 'مشهد', re: /فرامرز|مشهد/u },
    { need: 'آپارتمان در کوهسنگی مشهد', city: 'مشهد', re: /مشهد/u },
    { need: 'آپارتمان در سجاد مشهد', city: 'مشهد', hood: 'سجاد', re: /مشهد/u },
    { need: 'آپارتمان دو خواب در ونک تهران برای اجاره', city: 'تهران', re: /ونک|تهران/u },
    { need: 'آپارتمان در چهارباغ اصفهان', city: 'اصفهان', re: /اصفهان/u },
    { need: 'ویلا در شیراز', city: 'شیراز', re: /شیراز/u },
    { need: 'آپارتمان در احمدآباد مشهد', city: 'مشهد', re: /مشهد/u },
    { need: 'آپارتمان در ملک آباد مشهد', city: 'مشهد', re: /مشهد/u },
    { need: 'آپارتمان در پونک تهران', city: 'تهران', re: /تهران/u },
    { need: 'آپارتمان در سعادت آباد تهران', city: 'تهران', re: /تهران/u },
  ];
  return locs.map((l, i) =>
    estateScenario(
      `loc-${i}-${l.city}`,
      'estate-location',
      {
        needText: l.need,
        categorySlug: 'residential-rent',
        subcategorySlug: 'apartment-rent',
        city: l.city,
        neighborhood: l.hood ?? '',
      },
      {
        city: l.city,
        dealType: l.need.includes('اجاره') ? 'rent_monthly' : undefined,
        titleIncludes: l.re ? [l.re] : undefined,
      }
    )
  );
}

function buildMoneyScenarios(): PostGoldenScenario[] {
  return [
    estateScenario(
      'money-shop-rahn-1b',
      'regression',
      {
        needText: 'مغازه در خیابان سجاد مشهد',
        detailsText: SHOP_RAHN_DETAILS,
        categorySlug: 'commercial-sale',
        subcategorySlug: 'shop-sale',
        city: 'مشهد',
        neighborhood: 'سجاد',
      },
      {
        dealType: 'rent_rahn_ejare',
        transactionType: 'DEPOSIT_AND_RENT',
        rahnAmount: 1_000_000_000,
        monthlyRent: 100_000_000,
        city: 'مشهد',
        titleIncludes: [/رهن/u, /مغازه/u],
        titleExcludes: [/^فروش/u],
        badAiTitle: 'فروش مغازه در ابتدای خیابان سجاد، مشهد',
      }
    ),
    estateScenario(
      'money-rahn-10b',
      'estate-money',
      {
        needText: 'من یک خونه توی زعفرانیه تهران می‌خوام رهن و اجاره باشه حدوداً ۱۰ میلیارد هم بودجه دارم اجاره‌ام هم ۱۵ میلیون',
        categorySlug: 'residential-rent',
        subcategorySlug: 'apartment-rent',
        city: 'تهران',
      },
      {
        dealType: 'rent_rahn_ejare',
        rahnAmount: 10_000_000_000,
        monthlyRent: 15_000_000,
        city: 'تهران',
      }
    ),
    estateScenario(
      'money-budget-buy',
      'estate-money',
      {
        needText: 'آپارتمان دو خواب برای خرید در مشهد بودجه ۱۰ میلیارد',
        categorySlug: 'residential-sale',
        subcategorySlug: 'apartment-sale',
        city: 'مشهد',
      },
      {
        dealType: 'buy',
        transactionType: 'BUY',
        city: 'مشهد',
        titleIncludes: [/خرید|فروش/u, /مشهد/u],
      }
    ),
  ];
}

function buildVerticalScenarios(): PostGoldenScenario[] {
  const verticals: Array<{ id: string; need: string; titleRe: RegExp }> = [
    { id: 'vehicle-207', need: 'دنبال پژو ۲۰۷ سفید کارکرده در مشهد تا ۱ میلیارد', titleRe: /۲۰۷|پژو/u },
    { id: 'vehicle-swap', need: 'معاوضه خودرو پراید با سمند', titleRe: /خودرو/u },
    { id: 'product-iphone', need: 'گوشی آیفون ۱۳ کارکرده میخرم تهران', titleRe: /آیفون|گو/i },
    { id: 'service-ac', need: 'تعمیرکار کولر گازی فوری غرب تهران', titleRe: /کولر|تعمیر/u },
    { id: 'job-dev', need: 'استخدام برنامه نویس فرانت‌اند ریموت', titleRe: /استخدام|برنامه/u },
    { id: 'social-lost', need: 'گم کردم کیف پول در مترو تجریش', titleRe: /.+/u },
  ];
  return verticals.map((v) =>
    estateScenario(v.id, 'vertical', { needText: v.need }, { titleIncludes: [v.titleRe] })
  );
}

function buildEdgeScenarios(): PostGoldenScenario[] {
  const edges: PostGoldenScenario[] = [];
  for (let i = 0; i < 15; i++) {
    edges.push(
      estateScenario(
        `edge-short-${i}`,
        'edge',
        {
          needText: `آپارتمان ${i + 1} خواب مشهد اجاره`,
          city: 'مشهد',
          categorySlug: 'residential-rent',
          subcategorySlug: 'apartment-rent',
        },
        { city: 'مشهد', dealType: 'rent_monthly', titleIncludes: [/آپارتمان/u] }
      )
    );
  }
  edges.push(
    estateScenario(
      'edge-details-only',
      'edge',
      {
        needText: 'ملک',
        detailsText: 'دو خواب نورگیر سجاد مشهد اجاره ماهانه ۲۰ میلیون',
        city: 'مشهد',
      },
      { city: 'مشهد', dealType: 'rent_monthly' }
    )
  );
  edges.push(
    estateScenario(
      'edge-sale-slug-rent-text',
      'regression',
      {
        needText: 'مغازه رهن و اجاره سجاد مشهد',
        detailsText: 'یک میلیارد رهن ۱۰۰ میلیون اجاره',
        categorySlug: 'commercial-sale',
        subcategorySlug: 'shop-sale',
        city: 'مشهد',
      },
      {
        dealType: 'rent_rahn_ejare',
        titleExcludes: [/^فروش/u],
      }
    )
  );
  return edges;
}

function buildNeighborhoodBoundaryScenarios(): PostGoldenScenario[] {
  const cases: Array<{ id: string; need: string; city: string; re: RegExp }> = [
    { id: 'hood-sajjad-shop', need: 'مغازه رهن و اجاره سجاد مشهد', city: 'مشهد', re: /مغازه|رهن/u },
    { id: 'hood-vanak-wb', need: 'آپارتمان اجاره ونک تهران', city: 'تهران', re: /ونک|تهران/u },
    { id: 'hood-poonak', need: 'آپارتمان خرید پونک تهران', city: 'تهران', re: /تهران/u },
    { id: 'hood-saadat', need: 'ویلا اجاره سعادت آباد تهران', city: 'تهران', re: /تهران/u },
    { id: 'hood-niavaran', need: 'آپارتمان رهن کامل نیاوران تهران', city: 'تهران', re: /تهران/u },
    { id: 'hood-tabriz-valiasr', need: 'آپارتمان اجاره ولیعصر تبریز', city: 'تبریز', re: /تبریز/u },
    { id: 'hood-shiraz-sadra', need: 'آپارتمان خرید صدرا شیراز', city: 'شیراز', re: /شیراز/u },
    { id: 'hood-isfahan-jolfa', need: 'آپارتمان اجاره جلفا اصفهان', city: 'اصفهان', re: /اصفهان/u },
  ];
  return cases.map((c) =>
    estateScenario(
      c.id,
      'estate-location',
      {
        needText: c.need,
        city: c.city,
        categorySlug: c.need.includes('خرید') ? 'residential-sale' : 'residential-rent',
        subcategorySlug: c.need.includes('مغازه') ? 'shop-rent' : 'apartment-rent',
      },
      { city: c.city, titleIncludes: [c.re] }
    )
  );
}

function buildVehicleScenarios(): PostGoldenScenario[] {
  const vehicles = [
    'دنبال پژو ۲۰۷ سفید کارکرده در مشهد تا ۱ میلیارد',
    'خرید تیبا صفر کیلومتر تهران',
    'فروش سمند EF7 مدل ۹۸',
    'معاوضه پراید با پژو پارس',
    'دنا پلاس تورbo اقساطی مشهد',
    'هایما S7 برقی کارکرده',
    'بنز E200 مدل ۲۰۱۸ تهران',
    'بی‌ام‌و ۵۳۰i کارکرده',
    'موتور هوندا ۲۵۰ سی‌سی',
    'وانت نیسان دیزل باربری',
    'کامیونت ایسوزو باری',
    'پژو ۴۰۵ GLX مشهد',
    'رنو تندر ۹۰ پلاس',
    'کیا سراتو ۲۰۱۷',
    'تویوتا کرولا هیبرید',
  ];
  return vehicles.map((need, i) =>
    estateScenario(`vehicle-${i}`, 'vehicle', { needText: need }, {})
  );
}

function buildServiceJobProductScenarios(): PostGoldenScenario[] {
  const items = [
    { id: 'svc-plumber', need: 'لوله‌کش فوری غرب تهران' },
    { id: 'svc-clean', need: 'نظافت منزل هفتگی مشهد' },
    { id: 'svc-move', need: 'اسباب‌کشی دربست تهران' },
    { id: 'svc-paint', need: 'نقاش ساختمان تجربه دار' },
    { id: 'svc-tutor', need: 'معلم ریاضی دبیرستان' },
    { id: 'prd-laptop', need: 'لپ‌تاپ گیمینگ دست دوم' },
    { id: 'prd-sofa', need: 'مبل راحتی ۷ نفره' },
    { id: 'prd-bike', need: 'دوچرخه کوهستان' },
    { id: 'job-accountant', need: 'استخدام حسابدار با سابقه' },
    { id: 'job-nurse', need: 'پرستار خانگی تمام وقت' },
    { id: 'job-driver', need: 'راننده پایه یک سنگین' },
    { id: 'job-sales', need: 'کارشناس فروش املاک' },
    { id: 'social-adopt', need: 'فرزندخواندگی گربه' },
    { id: 'social-event', need: 'اجاره سالن عروسی مشهد' },
  ];
  return items.map((x) =>
    estateScenario(x.id, 'vertical', { needText: x.need }, {})
  );
}

function buildRegressionScenarios(): PostGoldenScenario[] {
  return [
    estateScenario(
      'reg-ai-sale-vs-rahn',
      'regression',
      {
        needText: 'مغازه در سجاد مشهد',
        detailsText: 'یک میلیارد رهن ۱۰۰ میلیون اجاره',
        categorySlug: 'commercial-sale',
        subcategorySlug: 'shop-sale',
        city: 'مشهد',
        neighborhood: 'سجاد',
      },
      {
        dealType: 'rent_rahn_ejare',
        titleExcludes: [/^فروش/u],
        badAiTitle: 'فروش مغازه در سجاد مشهد',
      }
    ),
    estateScenario(
      'reg-coarse-rent-slug',
      'regression',
      {
        needText: 'آپارتمان رهن و اجاره در مشهد',
        categorySlug: 'residential-rent',
        subcategorySlug: 'apartment-rent',
        city: 'مشهد',
      },
      { dealType: 'rent_rahn_ejare', transactionType: 'DEPOSIT_AND_RENT' }
    ),
    estateScenario(
      'reg-user-lock-deal',
      'regression',
      {
        needText: 'آپارتمان اجاره مشهد',
        categorySlug: 'residential-rent',
        subcategorySlug: 'apartment-rent',
        city: 'مشهد',
        userDealType: 'rent_rahn_full',
      },
      { dealType: 'rent_rahn_full', transactionType: 'FULL_DEPOSIT' }
    ),
    estateScenario(
      'reg-details-only-money',
      'regression',
      {
        needText: 'ملک',
        detailsText: 'رهن کامل ۵ میلیارد آپارتمان سجاد مشهد',
        city: 'مشهد',
      },
      { dealType: 'rent_rahn_full', city: 'مشهد' }
    ),
    estateScenario(
      'reg-persian-billion',
      'regression',
      {
        needText: 'زمین خرید مشهد',
        detailsText: 'بودجه یک میلیارد تومان',
        categorySlug: 'residential-sale',
        subcategorySlug: 'land-sale',
        city: 'مشهد',
      },
      { dealType: 'buy', city: 'مشهد' }
    ),
  ];
}

function buildCommercialScenarios(): PostGoldenScenario[] {
  const kinds = ['مغازه', 'دفتر', 'انبار', 'سوله', 'کارگاه'];
  const deals = ['اجاره', 'فروش', 'رهن و اجاره'];
  const out: PostGoldenScenario[] = [];
  for (const kind of kinds) {
    for (const deal of deals) {
      out.push(
        estateScenario(
          `commercial-${kind}-${deal}`,
          'estate-kind',
          {
            needText: `${kind} ${deal} در مشهد`,
            city: 'مشهد',
            categorySlug: deal === 'فروش' ? 'commercial-sale' : 'commercial-rent',
            subcategorySlug: kind === 'مغازه' ? 'shop-rent' : 'office-rent',
          },
          { city: 'مشهد', titleIncludes: [/مشهد/u] }
        )
      );
    }
  }
  return out;
}

function buildExtraEstateScenarios(): PostGoldenScenario[] {
  const hoods = ['سجاد', 'احمدآباد', 'کوهسنگی', 'فرامرز', 'ملک آباد', 'نیاوران', 'ونک', 'پونک'];
  const deals = [
    { label: 'rent', need: 'اجاره', dealType: 'rent_monthly' },
    { label: 'buy', need: 'خرید', dealType: 'buy' },
  ];
  const out: PostGoldenScenario[] = [];
  for (const hood of hoods) {
    for (const d of deals) {
      const city = ['ونک', 'پونک', 'نیاوران'].includes(hood) ? 'تهران' : 'مشهد';
      out.push(
        estateScenario(
          `extra-${hood}-${d.label}`,
          'estate-location',
          {
            needText: `آپارتمان ${d.need} ${hood} ${city}`,
            city,
            categorySlug: d.label === 'buy' ? 'residential-sale' : 'residential-rent',
            subcategorySlug: d.label === 'buy' ? 'apartment-sale' : 'apartment-rent',
          },
          { city, dealType: d.dealType, titleIncludes: [/آپارتمان/u] }
        )
      );
    }
  }
  return out;
}

function buildRoomAreaScenarios(): PostGoldenScenario[] {
  const out: PostGoldenScenario[] = [];
  for (const rooms of [1, 2, 3, 4]) {
    for (const area of [60, 90, 120, 150]) {
      out.push(
        estateScenario(
          `rooms-${rooms}-area-${area}`,
          'estate-kind',
          {
            needText: `آپارتمان ${rooms} خواب ${area} متری در مشهد اجاره`,
            city: 'مشهد',
            categorySlug: 'residential-rent',
            subcategorySlug: 'apartment-rent',
          },
          {
            dealType: 'rent_monthly',
            city: 'مشهد',
            titleIncludes: [/آپارتمان/u, /مشهد/u],
          }
        )
      );
    }
  }
  return out;
}

/** 150+ curated /post pipeline scenarios. */
export function buildPostGoldenMatrix(): PostGoldenScenario[] {
  const all = [
    ...buildEstateDealScenarios(),
    ...buildEstateKindScenarios(),
    ...buildLocationScenarios(),
    ...buildNeighborhoodBoundaryScenarios(),
    ...buildMoneyScenarios(),
    ...buildVerticalScenarios(),
    ...buildVehicleScenarios(),
    ...buildServiceJobProductScenarios(),
    ...buildRegressionScenarios(),
    ...buildCommercialScenarios(),
    ...buildExtraEstateScenarios(),
    ...buildEdgeScenarios(),
    ...buildRoomAreaScenarios(),
  ];
  const seen = new Set<string>();
  return all.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

export const POST_GOLDEN_MATRIX = buildPostGoldenMatrix();
