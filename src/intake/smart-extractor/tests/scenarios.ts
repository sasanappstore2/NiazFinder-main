/**
 * Encoded Smart Intake scenarios from SMART_INTAKE_TEST_SCENARIOS.md
 * Plus generated fillers (37–100) and corpus-1000 extras (101–1000).
 */

import { buildCorpus1000Extra } from './corpus-1000';

export type ExpectedField =
  | { path: string; equals: unknown }
  | { path: string; includes?: string; oneOf?: unknown[]; min?: number; max?: number; truthy?: boolean }
  | { path: string; disambiguationNeeded?: boolean; alternativesMin?: number };

export interface SmartIntakeScenario {
  id: string;
  description: string;
  needText: string;
  preferredCity?: string;
  preferredCitySlug?: string;
  /** Soft expectations — failures counted but categorized */
  expected: ExpectedField[];
  /** If true, scenario only checks that extraction completes without throw */
  smokeOnly?: boolean;
  category: string;
}

function eq(path: string, equals: unknown): ExpectedField {
  return { path, equals };
}

function includes(path: string, includes: string): ExpectedField {
  return { path, includes };
}

export const SMART_INTAKE_SCENARIOS: SmartIntakeScenario[] = [
  // === دسته 1: آپارتمان اجاره (1-10) ===
  {
    id: '1',
    description: 'تست محله‌های مشابه مشهد — فردوسی',
    needText: 'آپارتمان 2 خواب برای اجاره در خیابان فردوسی',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'disambiguation',
    expected: [
      eq('property.rooms', 2),
      eq('transaction.type', 'RENT'),
      { path: 'location.neighborhood', includes: 'فردوسی' },
      { path: 'location.disambiguationNeeded', disambiguationNeeded: true, alternativesMin: 2 },
    ],
  },
  {
    id: '2',
    description: 'رهن و اجاره ترکیبی',
    needText: 'خونه 3 خواب 100 میلیون رهن 15 میلیون اجاره نزدیک دانشگاه فردوسی مشهد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'budget',
    expected: [
      eq('property.rooms', 3),
      eq('budget.depositAmount', 100_000_000),
      eq('budget.rentAmount', 15_000_000),
      eq('transaction.type', 'DEPOSIT_AND_RENT'),
    ],
  },
  {
    id: '3',
    description: 'رهن کامل',
    needText: 'آپارتمان رهن کامل 800 میلیون تومان در وکیل آباد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'budget',
    expected: [
      eq('budget.depositAmount', 800_000_000),
      eq('transaction.type', 'FULL_DEPOSIT'),
      { path: 'location.neighborhood', includes: 'وکیل' },
    ],
  },
  {
    id: '4',
    description: 'با متراژ و امکانات',
    needText: 'اجاره آپارتمان 120 متر 2 خواب با پارکینگ و آسانسور در سجاد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'property',
    expected: [
      eq('property.area', 120),
      eq('property.rooms', 2),
      eq('property.hasParking', true),
      eq('property.hasElevator', true),
      { path: 'location.neighborhood', includes: 'سجاد' },
      eq('transaction.type', 'RENT'),
    ],
  },
  {
    id: '5',
    description: 'بودجه با تا',
    needText: 'آپارتمان اجاره تا 10 میلیون تومان ماهانه در قاسم آباد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'budget',
    expected: [
      eq('transaction.type', 'RENT'),
      { path: 'budget.max', equals: 10_000_000 },
    ],
  },
  {
    id: '6',
    description: 'طبقه مشخص',
    needText: 'آپارتمان طبقه 3 از 5 طبقه برای اجاره در الهیه مشهد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'property',
    expected: [
      eq('property.floor', 3),
      eq('property.totalFloors', 5),
      eq('transaction.type', 'RENT'),
      { path: 'location.neighborhood', includes: 'الهیه' },
    ],
  },
  {
    id: '7',
    description: 'سن بنا',
    needText: 'اجاره آپارتمان نوساز یا حداکثر 5 سال ساخت در کوهسنگی',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'property',
    expected: [
      eq('property.age', 5),
      eq('transaction.type', 'RENT'),
      { path: 'location.neighborhood', includes: 'کوهسنگی' },
    ],
  },
  {
    id: '8',
    description: 'فوری',
    needText: 'فوری نیاز به آپارتمان 1 خواب اجاره در مرکز شهر',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'metadata',
    expected: [
      eq('metadata.urgency', 'immediate'),
      eq('property.rooms', 1),
      eq('transaction.type', 'RENT'),
    ],
  },
  {
    id: '9',
    description: 'محله خیام ابهام + اداری',
    needText: 'واحد اداری برای مزون میخوام حاشیه خیام اجاره کنم',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'disambiguation',
    expected: [
      eq('transaction.type', 'RENT'),
      { path: 'location.neighborhood', includes: 'خیام' },
    ],
  },
  {
    id: '10',
    description: 'بلوار بنفشه ابهام',
    needText: 'آپارتمان 90 متری خیابان بنفشه برای اجاره',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'disambiguation',
    expected: [
      eq('property.area', 90),
      eq('transaction.type', 'RENT'),
      { path: 'location.neighborhood', includes: 'بنفشه' },
      { path: 'location.disambiguationNeeded', disambiguationNeeded: true, alternativesMin: 2 },
    ],
  },

  // === دسته 2: خرید (11-15) ===
  {
    id: '11',
    description: 'خرید با بودجه مشخص',
    needText: 'خرید آپارتمان 2 خواب با بودجه 3 میلیارد در نیاوران',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'budget',
    expected: [
      eq('property.rooms', 2),
      eq('transaction.type', 'BUY'),
      { path: 'budget.max', equals: 3_000_000_000 },
      { path: 'location.neighborhood', includes: 'نیاوران' },
    ],
  },
  {
    id: '12',
    description: 'خرید با بازه قیمت',
    needText: 'آپارتمان برای خرید بین 2 تا 4 میلیارد در سعادت آباد',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'budget',
    expected: [
      eq('transaction.type', 'BUY'),
      { path: 'budget.min', equals: 2_000_000_000 },
      { path: 'budget.max', equals: 4_000_000_000 },
    ],
  },
  {
    id: '13',
    description: 'لوکس با امکانات',
    needText: 'خرید آپارتمان لوکس 200 متر با استخر و سونا در زعفرانیه',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [
      eq('property.area', 200),
      eq('transaction.type', 'BUY'),
      { path: 'location.neighborhood', includes: 'زعفرانیه' },
    ],
  },
  {
    id: '14',
    description: 'پنت هاوس',
    needText: 'دنبال پنت هاوس برای خرید در الهیه تهران هستم',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'category',
    expected: [
      eq('transaction.type', 'BUY'),
      { path: 'location.neighborhood', includes: 'الهیه' },
    ],
  },
  {
    id: '15',
    description: 'سوئیت',
    needText: 'سوئیت 50 متری برای خرید در مرزداران',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [
      eq('property.area', 50),
      eq('transaction.type', 'BUY'),
    ],
  },

  // === ویلا / تجاری / زمین (16-26) ===
  {
    id: '16',
    description: 'ویلا شمال',
    needText: 'ویلا برای خرید در رامسر با ویو دریا',
    preferredCity: 'رامسر',
    category: 'category',
    expected: [eq('transaction.type', 'BUY')],
  },
  {
    id: '17',
    description: 'ویلا با متراژ',
    needText: 'ویلا 300 متر بنا در 500 متر زمین در کردان',
    preferredCity: 'کرج',
    category: 'property',
    expected: [eq('property.area', 300)],
  },
  {
    id: '18',
    description: 'باغ ویلا',
    needText: 'باغ ویلا 1000 متر با درختان میوه در شهریار',
    preferredCity: 'شهریار',
    category: 'property',
    expected: [eq('property.area', 1000)],
  },
  {
    id: '19',
    description: 'مغازه با بر',
    needText: 'مغازه 50 متر با 6 متر بَر برای اجاره در بازار رضا',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'property',
    expected: [
      eq('property.area', 50),
      eq('transaction.type', 'RENT'),
    ],
  },
  {
    id: '20',
    description: 'دفتر کار',
    needText: 'دفتر 100 متری طبقه دوم برای اجاره در ونک',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [
      eq('property.area', 100),
      eq('transaction.type', 'RENT'),
    ],
  },
  {
    id: '21',
    description: 'انبار',
    needText: 'انبار 200 متر با رمپ تخلیه در شهرک صنعتی توس',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'property',
    expected: [eq('property.area', 200)],
  },
  {
    id: '22',
    description: 'کارگاه',
    needText: 'کارگاه 500 متر با برق صنعتی در خاوران',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [eq('property.area', 500)],
  },
  {
    id: '23',
    description: 'رستوران',
    needText: 'جای آماده برای رستوران با پروانه کسب در جردن',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'category',
    expected: [{ path: 'location.neighborhood', includes: 'جردن' }],
  },
  {
    id: '24',
    description: 'زمین مسکونی',
    needText: 'زمین 300 متری برای ساخت در شهرک غرب',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [
      eq('property.area', 300),
      eq('transaction.type', 'BUY'),
    ],
  },
  {
    id: '25',
    description: 'زمین تجاری',
    needText: 'زمین تجاری گوشه دو کوچه 150 متر در ستارخان',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [eq('property.area', 150)],
  },
  {
    id: '26',
    description: 'زمین کشاورزی',
    needText: 'زمین کشاورزی 2 هکتار با آب در ورامین',
    preferredCity: 'ورامین',
    category: 'property',
    expected: [],
    smokeOnly: true,
  },

  // === پیچیده (27-36) ===
  {
    id: '27',
    description: 'متن طولانی با جزئیات',
    needText:
      'سلام من دنبال یک آپارتمان هستم برای خانواده 4 نفره. 3 خواب میخواهیم ترجیحا 120 تا 150 متر. بودجه ما برای رهن حدود 200 میلیون و اجاره ماهانه 8 میلیون هست. منطقه وکیل آباد یا الهیه مشهد مد نظرمون هست. حتما پارکینگ داشته باشه و اگر انباری هم داشته باشه عالی میشه. طبقات بالا رو ترجیح میدیم.',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'complex',
    expected: [
      eq('property.rooms', 3),
      eq('budget.depositAmount', 200_000_000),
      eq('budget.rentAmount', 8_000_000),
      eq('transaction.type', 'DEPOSIT_AND_RENT'),
      eq('property.hasParking', true),
      eq('property.hasStorage', true),
    ],
  },
  {
    id: '28',
    description: 'چند محله',
    needText: 'آپارتمان 80 متری 2 خواب در احمدآباد یا قاسم آباد یا سجاد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'disambiguation',
    expected: [
      eq('property.area', 80),
      eq('property.rooms', 2),
    ],
  },
  {
    id: '29',
    description: 'محاوره‌ای',
    needText: 'یه خونه کوچیک میخوام تو حدود 60-70 متر واسه زوج جوان قیمتشم مناسب باشه',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'complex',
    expected: [],
    smokeOnly: true,
  },
  {
    id: '30',
    description: 'فارسی+انگلیسی',
    needText: 'آپارتمان 2bedroom مساحت 95m2 در فاز 2 پردیس',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'property',
    expected: [
      eq('property.rooms', 2),
      eq('property.area', 95),
    ],
  },
  {
    id: '31',
    description: 'اشتباه تایپی',
    needText: 'اپارتمان ۳خواب دروکیل اباد مشهد برای اجاره',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'complex',
    expected: [
      eq('property.rooms', 3),
      eq('transaction.type', 'RENT'),
    ],
  },
  {
    id: '32',
    description: 'فقط محله بدون شهر',
    needText: 'خونه در امامت میخوام',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'location',
    expected: [{ path: 'location.neighborhood', includes: 'امامت' }],
  },
  {
    id: '33',
    description: 'قیمت نامتعارف',
    needText: 'آپارتمان با 10 تومن اجاره',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'edge',
    expected: [eq('transaction.type', 'RENT')],
  },
  {
    id: '34',
    description: 'متن انگلیسی',
    needText: '2 bedroom apartment for rent in Tehran',
    preferredCity: 'تهران',
    preferredCitySlug: 'tehran',
    category: 'edge',
    expected: [eq('transaction.type', 'RENT')],
    smokeOnly: true,
  },
  {
    id: '35',
    description: 'بدون جزئیات',
    needText: 'خونه میخوام',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'edge',
    expected: [],
    smokeOnly: true,
  },
  {
    id: '36',
    description: 'متن بسیار کوتاه',
    needText: 'سجاد',
    preferredCity: 'مشهد',
    preferredCitySlug: 'mashhad',
    category: 'edge',
    expected: [{ path: 'location.neighborhood', includes: 'سجاد' }],
  },
];

/** Expand to 100 with generated Mashhad rent/buy/rahn variants (categories 37-100). */
function buildGeneratedScenarios(): SmartIntakeScenario[] {
  const hoods = ['سجاد', 'احمدآباد', 'وکیل آباد', 'کوهسنگی', 'قاسم آباد', 'الهیه', 'فردوسی', 'بنفشه'];
  const out: SmartIntakeScenario[] = [];
  let id = 37;

  // 37-46 long-ish noise texts (performance)
  for (let i = 0; i < 10; i++) {
    const hood = hoods[i % hoods.length]!;
    const rooms = (i % 4) + 1;
    const area = 70 + i * 10;
    const padding = ' جزئیات اضافی درباره محله و دسترسی و نورگیر و سکوت و همسایه‌ها.'.repeat(8);
    out.push({
      id: String(id++),
      description: `long-noise-${i + 1}`,
      needText: `آپارتمان ${rooms} خواب ${area} متر برای اجاره در ${hood} مشهد.${padding}`,
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      category: 'performance',
      expected: [
        eq('property.rooms', rooms),
        eq('property.area', area),
        eq('transaction.type', 'RENT'),
      ],
    });
  }

  // 47-56 cities localization (smoke + rent signal)
  const cities: Array<[string, string]> = [
    ['تهران', 'tehran'],
    ['مشهد', 'mashhad'],
    ['اصفهان', 'isfahan'],
    ['شیراز', 'shiraz'],
    ['تبریز', 'tabriz'],
    ['کرج', 'karaj'],
    ['قم', 'qom'],
    ['اهواز', 'ahvaz'],
    ['کرمانشاه', 'kermanshah'],
    ['ارومیه', 'urmia'],
  ];
  for (const [name, slug] of cities) {
    out.push({
      id: String(id++),
      description: `city-${slug}`,
      needText: `آپارتمان 2 خواب 90 متر اجاره در مرکز ${name}`,
      preferredCity: name,
      preferredCitySlug: slug,
      category: 'localization',
      expected: [
        eq('property.rooms', 2),
        eq('property.area', 90),
        eq('transaction.type', 'RENT'),
        eq('location.city', name),
      ],
    });
  }

  // 57-66 UX-ish mashhad variants
  for (let i = 0; i < 10; i++) {
    const hood = hoods[i % hoods.length]!;
    out.push({
      id: String(id++),
      description: `ux-rahn-${i + 1}`,
      needText: `آپارتمان رهن کامل ${400 + i * 50} میلیون در ${hood}`,
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      category: 'ux',
      expected: [
        eq('transaction.type', 'FULL_DEPOSIT'),
        { path: 'budget.depositAmount', equals: (400 + i * 50) * 1_000_000 },
      ],
    });
  }

  // 67-76 deposit+rent variants
  for (let i = 0; i < 10; i++) {
    const deposit = 80 + i * 20;
    const rent = 5 + i;
    const hood = hoods[i % hoods.length]!;
    out.push({
      id: String(id++),
      description: `integration-rahn-ejare-${i + 1}`,
      needText: `خونه 2 خواب ${deposit} میلیون رهن ${rent} میلیون اجاره در ${hood}`,
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      category: 'integration',
      expected: [
        eq('transaction.type', 'DEPOSIT_AND_RENT'),
        eq('budget.depositAmount', deposit * 1_000_000),
        eq('budget.rentAmount', rent * 1_000_000),
        eq('property.rooms', 2),
      ],
    });
  }

  // 77-84 error recovery / edge
  const edges = [
    'آپارتمان اجاره',
    'رهن کامل',
    'مغازه اجاره سجاد',
    'ویلا خرید شمال',
    'زمین 200 متر',
    'دفتر کار اجاره',
    'آپارتمان نوساز اجاره کوهسنگی',
    'سوئیت اجاره مرکز',
  ];
  for (let i = 0; i < 8; i++) {
    out.push({
      id: String(id++),
      description: `error-recovery-${i + 1}`,
      needText: edges[i]!,
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      category: 'error',
      expected: [],
      smokeOnly: true,
    });
  }

  // 85-92 security-ish payloads (must not throw)
  const security = [
    "آپارتمان'; DROP TABLE users;--",
    '<script>alert(1)</script> آپارتمان اجاره سجاد',
    'آپارتمان ' + 'الف'.repeat(5000),
    'آپارتمان اجاره\0null',
    '../../../etc/passwd آپارتمان',
    'آپارتمان ${process.env}',
    'آپارتمان {{constructor}}',
    'آپارتمان اجاره سجاد\n'.repeat(200),
  ];
  for (let i = 0; i < 8; i++) {
    out.push({
      id: String(id++),
      description: `security-${i + 1}`,
      needText: security[i]!,
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      category: 'security',
      expected: [],
      smokeOnly: true,
    });
  }

  // 93-100 regression: known goldens
  const regressions: Array<[string, ExpectedField[], { city?: string; slug?: string }?]> = [
    [
      'آپارتمان 2 خواب 100 متر برای اجاره در سجاد مشهد',
      [eq('property.rooms', 2), eq('property.area', 100), eq('transaction.type', 'RENT')],
    ],
    [
      'خونه میخوام 100 میلیون رهن 10 میلیون اجاره احمدآباد',
      [
        eq('transaction.type', 'DEPOSIT_AND_RENT'),
        eq('budget.depositAmount', 100_000_000),
        eq('budget.rentAmount', 10_000_000),
      ],
    ],
    [
      'رهن کامل 500 میلیون 3 خواب با پارکینگ و آسانسور',
      [
        eq('transaction.type', 'FULL_DEPOSIT'),
        eq('budget.depositAmount', 500_000_000),
        eq('property.rooms', 3),
        eq('property.hasParking', true),
        eq('property.hasElevator', true),
      ],
    ],
    [
      'آپارتمان برای اجاره در خیابان فردوسی',
      [
        eq('transaction.type', 'RENT'),
        { path: 'location.disambiguationNeeded', disambiguationNeeded: true, alternativesMin: 2 },
      ],
    ],
    [
      'می‌خوام یه آپارتمان بخرم. راستش نه، می‌خوام رهن کنم، رهن ۵۰۰ میلیون',
      [
        eq('transaction.type', 'FULL_DEPOSIT'),
        eq('budget.depositAmount', 500_000_000),
        eq('category.subcategory', 'apartment-rent'),
      ],
    ],
    [
      'الان رهن‌نشین‌ام، رهن ۵۰۰ میلیون اجاره ۱۵ میلیون می‌دم توی شهرک غرب. ولی راستش می‌خوام یه واحد پیش‌فروش بخرم، بودجه کل ۳ میلیارد.',
      [
        eq('transaction.type', 'BUY'),
        eq('category.value', 'pre-sale-services'),
        { path: 'budget.max', equals: 3_000_000_000 },
        { path: 'budget.min', equals: 3_000_000_000 },
        { path: 'location.neighborhood', includes: 'شهرک غرب' },
      ],
      { city: 'تهران', slug: 'tehran' },
    ],
    [
      'آپارتمان اجاره‌ای در مشهد، وکیل‌آباد، حدود ۱۵ میلیون رهن و ۲ میلیون اجاره راستش می‌خوام بخرم، بودجه ۲ میلیارد تومان',
      [
        eq('transaction.type', 'BUY'),
        eq('category.subcategory', 'apartment-sale'),
        { path: 'budget.max', equals: 2_000_000_000 },
        { path: 'budget.min', equals: 2_000_000_000 },
        { path: 'location.neighborhood', includes: 'وکیل' },
      ],
    ],
    [
      'فوری نیاز به آپارتمان 1 خواب اجاره در مرکز شهر',
      [eq('metadata.urgency', 'immediate'), eq('property.rooms', 1)],
    ],
  ];
  for (const [text, expected, loc] of regressions) {
    out.push({
      id: String(id++),
      description: `regression-${id - 1}`,
      needText: text,
      preferredCity: loc?.city ?? (text.includes('نیاوران') ? 'تهران' : 'مشهد'),
      preferredCitySlug: loc?.slug ?? (text.includes('نیاوران') ? 'tehran' : 'mashhad'),
      category: 'regression',
      expected,
    });
  }

  return out;
}

export const ALL_SMART_INTAKE_SCENARIOS: SmartIntakeScenario[] = [
  ...SMART_INTAKE_SCENARIOS,
  ...buildGeneratedScenarios(),
  ...buildCorpus1000Extra(),
];

if (ALL_SMART_INTAKE_SCENARIOS.length !== 1000) {
  console.warn(
    `[smart-intake scenarios] count=${ALL_SMART_INTAKE_SCENARIOS.length} (expected 1000)`
  );
}
