/**
 * Generate 1000 colloquial Persian real-estate need ads (100–300 words each)
 * from iran-locations-tree + canonical RE leaf categories.
 *
 * Outputs:
 *   fixtures/estate-needs-colloquial-1000.md
 *   fixtures/estate-needs-colloquial-1000.jsonl  (oracle-compatible)
 *   fixtures/estate-paragraph-1000.jsonl         (runner drop-in)
 *
 * Usage: npx tsx scripts/intake/generate-estate-colloquial-1000.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstateParagraphCase, EstateParagraphOracle } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const LOC_TREE = join(ROOT, 'src/data/iran-locations-tree.json');
const OUT_MD = join(ROOT, 'fixtures/estate-needs-colloquial-1000.md');
const OUT_JSONL = join(ROOT, 'fixtures/estate-needs-colloquial-1000.jsonl');
const OUT_RUNNER = join(ROOT, 'fixtures/estate-paragraph-1000.jsonl');
const SEED = 20260712;
const TOTAL = 1000;
const MIN_WORDS = 100;
const MAX_WORDS = 300;

const LEAVES = [
  { slug: 'apartment-sale', kind: 'apartment', deal: 'buy', label: 'آپارتمان', labelLong: 'آپارتمان مسکونی' },
  { slug: 'villa-sale', kind: 'villa', deal: 'buy', label: 'ویلا', labelLong: 'خانه ویلایی یا ویلا' },
  { slug: 'land-sale', kind: 'land', deal: 'buy', label: 'زمین', labelLong: 'زمین یا کلنگی' },
  { slug: 'office-sale', kind: 'office', deal: 'buy', label: 'دفتر', labelLong: 'دفتر کار اداری' },
  { slug: 'shop-sale', kind: 'shop', deal: 'buy', label: 'مغازه', labelLong: 'مغازه یا غرفه تجاری' },
  { slug: 'industrial-sale', kind: 'industrial', deal: 'buy', label: 'سوله', labelLong: 'سوله یا کارگاه صنعتی' },
  { slug: 'apartment-rent', kind: 'apartment', deal: 'rent_rahn_ejare', label: 'آپارتمان', labelLong: 'آپارتمان مسکونی' },
  { slug: 'villa-rent', kind: 'villa', deal: 'rent_rahn_ejare', label: 'خانه ویلایی', labelLong: 'خانه ویلایی' },
  { slug: 'land-rent', kind: 'land', deal: 'rent_monthly', label: 'زمین', labelLong: 'زمین یا کلنگی' },
  { slug: 'office-rent', kind: 'office', deal: 'rent_monthly', label: 'دفتر', labelLong: 'دفتر اداری' },
  { slug: 'shop-rent', kind: 'shop', deal: 'rent_rahn_full', label: 'مغازه', labelLong: 'مغازه تجاری' },
  { slug: 'industrial-rent', kind: 'industrial', deal: 'rent_monthly', label: 'سوله', labelLong: 'سوله صنعتی' },
  { slug: 'suite-apartment-rent', kind: 'apartment', deal: 'rent_short_term', label: 'سوئیت', labelLong: 'سوئیت یا آپارتمان اقامتی' },
  { slug: 'villa-short-rent', kind: 'villa', deal: 'rent_short_term', label: 'ویلا', labelLong: 'ویلای روزانه یا هفتگی' },
  { slug: 'workspace-short-rent', kind: 'office', deal: 'rent_short_term', label: 'فضای کار', labelLong: 'فضای کار اشتراکی' },
  { slug: 'construction-partnership', kind: 'land', deal: 'partnership', label: 'زمین', labelLong: 'زمین برای مشارکت در ساخت' },
  { slug: 'pre-sale-services', kind: 'apartment', deal: 'pre_sale', label: 'آپارتمان', labelLong: 'واحد پیش‌فروش' },
  { slug: 'agency-services', kind: 'service', deal: 'agency', label: 'مشاور املاک', labelLong: 'خدمات آژانس املاک' },
] as const;

const PRIORITY_CITIES = new Set([
  'تهران',
  'مشهد',
  'اصفهان',
  'شیراز',
  'کرج',
  'تبریز',
  'اهواز',
  'قم',
  'کرمانشاه',
  'ارومیه',
  'رشت',
  'زاهدان',
  'همدان',
  'کرمان',
  'یزد',
  'اردبیل',
  'بندرعباس',
  'اراک',
  'اسلامشهر',
  'کاشان',
  'ساری',
  'قزوین',
  'زنجان',
  'سنندج',
  'خرم‌آباد',
  'گرگان',
  'سمنان',
  'بوشهر',
  'یاسوج',
  'شهرکرد',
  'بجنورد',
  'بیرجند',
  'ایلام',
  'خرمشهر',
  'آبادان',
  'نجف‌آباد',
  'ملایر',
  'سبزوار',
  'نیشابور',
  'فردیس',
  'ری',
  'قدس',
  'اندیشه',
]);

interface LocRow {
  province: string;
  city: string;
  citySlug: string;
  neighborhoods: string[];
}

function mulberry32(a: number) {
  return function rand() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function pickN<T>(rand: () => number, arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const i = Math.floor(rand() * copy.length);
    out.push(copy.splice(i, 1)[0]!);
  }
  return out;
}

function moneyFa(n: number): string {
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000;
    return Number.isInteger(b) ? `${b} میلیارد` : `${b.toFixed(1)} میلیارد`;
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} میلیون`;
  return `${n.toLocaleString('fa-IR')}`;
}

function wordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function cityNameKey(name: string): string {
  return name.replace(/\s*\(.+\)\s*$/, '').trim();
}

function loadCityToProvince(): Map<string, string> {
  const map = new Map<string, string>();
  const adminPath = join(ROOT, 'src/data/admin-locations.json');
  if (!existsSync(adminPath)) return map;
  const admin = JSON.parse(readFileSync(adminPath, 'utf8')) as {
    countries: Array<{
      provinces: Array<{ name: string; cities: Array<{ name: string }> }>;
    }>;
  };
  for (const p of admin.countries[0]?.provinces ?? []) {
    for (const c of p.cities) {
      map.set(c.name.trim(), p.name);
      map.set(cityNameKey(c.name), p.name);
    }
  }
  return map;
}

function weightLocationPool(rows: LocRow[]): LocRow[] {
  const priority = rows.filter(
    (r) => PRIORITY_CITIES.has(r.city) || PRIORITY_CITIES.has(cityNameKey(r.city))
  );
  const rich = rows.filter((r) => r.neighborhoods.length >= 20);
  return [...priority, ...priority, ...rich];
}

function loadLocationsFromTree(): LocRow[] {
  const raw = JSON.parse(readFileSync(LOC_TREE, 'utf8')) as {
    countries: Array<{
      provinces: Array<{
        name: string;
        cities: Array<{
          id: string;
          name: string;
          neighborhoods?: Array<{ name: string } | string>;
        }>;
      }>;
    }>;
  };
  const rows: LocRow[] = [];
  for (const p of raw.countries[0]?.provinces ?? []) {
    for (const c of p.cities) {
      const neighborhoods = (c.neighborhoods ?? [])
        .map((h) => (typeof h === 'string' ? h : h.name))
        .map((n) => n.trim())
        .filter((n) => n.length >= 2 && n.length <= 40 && !/^\d+$/.test(n));
      if (neighborhoods.length < 3) continue;
      rows.push({
        province: p.name,
        city: c.name,
        citySlug: c.id,
        neighborhoods,
      });
    }
  }
  return weightLocationPool(rows);
}

/** Fallback when iran-locations-tree.json is gitignored / missing: Divar neighborhood catalogs. */
function loadLocationsFromCatalogs(): LocRow[] {
  const catalogDir = join(ROOT, 'src/data/neighborhoods/catalog');
  if (!existsSync(catalogDir)) return [];
  const cityToProvince = loadCityToProvince();
  const rows: LocRow[] = [];
  for (const file of readdirSync(catalogDir).filter((f) => f.endsWith('.json'))) {
    const raw = JSON.parse(readFileSync(join(catalogDir, file), 'utf8')) as {
      cityId: string;
      cityName?: string;
      neighborhoods?: Array<{ name?: string } | string>;
    };
    const city = (raw.cityName ?? '').trim();
    if (!city) continue;
    const neighborhoods = (raw.neighborhoods ?? [])
      .map((h) => (typeof h === 'string' ? h : String(h.name ?? '').trim()))
      .map((n) => n.trim())
      .filter((n) => n.length >= 2 && n.length <= 40 && !/^\d+$/.test(n));
    if (neighborhoods.length < 3) continue;
    rows.push({
      province: cityToProvince.get(city) ?? cityToProvince.get(cityNameKey(city)) ?? city,
      city,
      citySlug: raw.cityId,
      neighborhoods,
    });
  }
  return weightLocationPool(rows);
}

function loadLocations(): LocRow[] {
  if (existsSync(LOC_TREE)) return loadLocationsFromTree();
  const fromCatalogs = loadLocationsFromCatalogs();
  if (fromCatalogs.length) return fromCatalogs;
  throw new Error(
    `Missing ${LOC_TREE} and neighborhood catalogs under src/data/neighborhoods/catalog`
  );
}

function dealOpeners(deal: string, labelLong: string, rand: () => number): string[] {
  switch (deal) {
    case 'buy':
      return pickN(rand, [
        `سلام، دنبال خرید ${labelLong} هستم و خیلی دقیق می‌خوام بگم چی می‌خوام تا مشاور الکی فایل نفرسته.`,
        `وقت‌تون بخیر، قصد خرید ${labelLong} دارم و چند وقته دارم می‌گردم ولی هنوز به چیزی که تو سرم هست نرسیدم.`,
        `می‌خوام ${labelLong} بخرم، نه برای سرمایه‌گذاری الکی، برای زندگی خودمون و حوصلهٔ فایل بی‌ربط هم ندارم.`,
      ], 1);
    case 'rent_rahn_ejare':
      return pickN(rand, [
        `سلام، رهن و اجارهٔ ${labelLong} می‌خوام؛ خانواده‌ایم و دنبال جایی آروم و تمیز هستیم.`,
        `رهن‌اجاره ${labelLong} لازم دارم، قرارداد رسمی و مالک پاسخگو برام خیلی مهمه.`,
      ], 1);
    case 'rent_rahn_full':
      return pickN(rand, [
        `رهن کامل ${labelLong} می‌خوام، ترجیحاً بدون اجاره ماهانه یا با اجاره خیلی کم.`,
      ], 1);
    case 'rent_monthly':
      return pickN(rand, [
        `برای کارم نیاز به اجاره ماهانهٔ ${labelLong} دارم و می‌خوام سریع جمع‌بندی کنم.`,
      ], 1);
    case 'rent_short_term':
      return pickN(rand, [
        `اجاره کوتاه‌مدت ${labelLong} می‌خوام برای چند روز تا حداکثر دو هفته، تمیز و قابل اعتماد باشه.`,
      ], 1);
    case 'partnership':
      return pickN(rand, [
        `برای مشارکت در ساخت روی ${labelLong} دنبال شریک مطمئن یا زمین مناسب هستم.`,
      ], 1);
    case 'pre_sale':
      return pickN(rand, [
        `واحد پیش‌فروش ${labelLong} می‌خوام، ولی فقط پروژه‌ای که مدارکش شفاف باشه و زمان تحویل واقع‌بینانه بده.`,
      ], 1);
    case 'agency':
      return pickN(rand, [
        `دنبال مشاور املاک حرفه‌ای هستم که واقعاً نیازم رو بفهمه و الکی فایل اسپم نکنه.`,
      ], 1);
    default:
      return [`نیاز به ${labelLong} دارم.`];
  }
}

function buildNarrative(opts: {
  rand: () => number;
  leaf: (typeof LEAVES)[number];
  province: string;
  city: string;
  hood: string;
  altHoods: string[];
  area: number;
  rooms: number | null;
  budgetMax?: number;
  rahn?: number;
  rent?: number;
  ambiguous: boolean;
  tone: 'casual' | 'urgent' | 'family' | 'investor' | 'student';
}): string {
  const { rand, leaf, province, city, hood, altHoods, area, rooms, budgetMax, rahn, rent, ambiguous, tone } =
    opts;
  const parts: string[] = [];
  parts.push(...dealOpeners(leaf.deal, leaf.labelLong, rand));

  if (tone === 'urgent') {
    parts.push(
      'موضوع برام فوریه چون تا آخر ماه باید تکلیف‌مون روشن بشه و دیگه نمی‌تونیم این وضع موقت رو ادامه بدیم.'
    );
  }
  if (tone === 'family') {
    parts.push(
      'ما یه خانوادهٔ چهارنفره‌ایم، دو تا بچه داریم و مدرسه و امنیت محله برامون از بقیه چیزا مهم‌تره.'
    );
  }
  if (tone === 'investor') {
    parts.push(
      'نگاه‌م بیشتر سرمایه‌گذاریه ولی نه هر ملکی؛ نقدشوندگی و موقعیت برام اولویت داره تا ظاهر لوکس الکی.'
    );
  }
  if (tone === 'student') {
    parts.push(
      'دانشجوییم و بودجه محدودی داریم؛ دنبال جایی هستیم که رفت‌وآمد دانشگاه و هزینهٔ ماهانه فشار نیاره.'
    );
  }

  if (!ambiguous) {
    parts.push(
      `استان ${province}، شهر ${city}، محله ${hood} اولویت اوله؛ اگه فایل خیلی مناسب نزدیک همین محدوده باشه هم نگاه می‌کنم.`
    );
    if (altHoods.length) {
      parts.push(
        `محله‌های جایگزین که می‌تونم قبول کنم: ${altHoods.join('، ')}. لطفاً بیرون از این محدوده نفرستید مگر اینکه واقعاً استثنایی باشه.`
      );
    }
    parts.push(
      `تو ${city} دنبال دسترسی راحت به نانوایی، میوه‌فروشی و حمل‌ونقل عمومی هستم و ترافیک سنگین دائمی اذیتم می‌کنه.`
    );
  } else {
    parts.push(
      'هنوز شهر رو قطعی نکردم؛ بین چند شهر بزرگ مرددم و اول می‌خوام ببینم با بودجه و سبک زندگی‌مون کدوم منطقی‌تره.'
    );
  }

  if (leaf.kind === 'land') {
    parts.push(
      `متراژ حدود ${area} متر مد نظرمه؛ شکل زمین منظم باشه و کاربری‌اش شفاف باشه تا بعداً گیر مجوز نخوریم.`
    );
  } else if (leaf.kind !== 'service') {
    parts.push(
      `متراژ حدود ${area} متر می‌خوام` +
        (rooms != null ? ` و ترجیحاً ${rooms} خواب/اتاق.` : '.') +
        ' خیلی کوچیک یا بیش از حد بزرگ برام مناسب نیست.'
    );
  }

  if (leaf.kind === 'apartment' || leaf.kind === 'villa') {
    parts.push(
      pick(rand, [
        'نورگیر بودن، تهویه خوب و اینکه آشپزخانه کاربردی باشه برام مهمه؛ خانه تاریک و دم‌کرده نمی‌خوام.',
        'ترجیح می‌دم واحد نوساز یا بازسازی‌شده تمیز باشه؛ اگه قدیمی باشه حداقل تاسیسات‌ش سالم باشه.',
        'طبقه خیلی همکف شلوغ یا آخرین طبقه بدون آسانسور معمولاً برام سخت تمام می‌شه.',
      ])
    );
    parts.push(
      pick(rand, [
        'پارکینگ و انباری اگه داشته باشه عالی می‌شه، ولی اگه متراژ و موقعیت عالی باشه روی پارکینگ کوتاه می‌آم.',
        'بالکن واقعی می‌خوام، نه یه لبه‌ی تزئینی بی‌مصرف؛ لباس‌شستن و نشستن بیرون برام کاربرد داره.',
      ])
    );
  }
  if (leaf.kind === 'shop' || leaf.kind === 'office') {
    parts.push(
      'برندینگ و دیده شدن از خیابان برام مهمه؛ جای دنج بدون عبور مشتری معمولاً جواب نمی‌ده.'
    );
    parts.push(
      'برق سه‌فاز یا ظرفیت مناسب، سرویس بهداشتی داخل واحد و امکان نصب تابلو رو چک می‌کنم.'
    );
  }
  if (leaf.kind === 'industrial') {
    parts.push(
      'ارتفاع سقف، ورودی کامیون، فاصله از گمرک/جاده اصلی و مجوز فعالیت صنعتی برام خط قرمزه.'
    );
  }

  if (budgetMax) {
    parts.push(
      `بودجه خرید‌م تا حدود ${moneyFa(budgetMax)} تومان است؛ بالاتر از این فقط اگه ملک واقعاً خاص باشه صحبت می‌کنیم.`
    );
  }
  if (rahn) {
    parts.push(`برای رهن حدود ${moneyFa(rahn)} تومان کنار گذاشتم.`);
  }
  if (rent && leaf.deal !== 'rent_rahn_full') {
    parts.push(
      leaf.deal === 'rent_short_term'
        ? `اجاره هر شب/دوره حدود ${moneyFa(rent)} تومان اوکیه اگه کیفیت خوب باشه.`
        : `اجاره ماهانه حدود ${moneyFa(rent)} تومان منطقی می‌دونم و بیشتر از این فشار میاره.`
    );
  }

  parts.push(
    pick(rand, [
      'لطفاً فقط فایل‌هایی بفرستید که عکس واقعی و توضیح درست دارن؛ از فایل‌های تکراری و قیمت الکی خسته شدم.',
      'اگه بازدید حضوری لازم باشه عصرهای وسط هفته آزادترم؛ جمعه‌ها معمولاً شلوغم.',
      'قرارداد رسمی، کد رهگیری و شفافیت مالک برام غیرقابل مذاکره‌ست.',
    ])
  );
  parts.push(
    pick(rand, [
      'یه نکته دیگه اینکه همسایه‌ها آروم باشن و سروصدای شبانه نداشته باشه؛ خواب راحت برام حیاتیه.',
      'نزدیکی به درمانگاه یا داروخانه شبانه‌روزی امتیاز مثبته، مخصوصاً برای خانواده.',
      'اگه محله نوساز و خلوت باشه اوکیه، ولی زیرساخت آب و برق و اینترنت باید پایدار باشه.',
    ])
  );
  parts.push(
    pick(rand, [
      'خلاصه اینکه نیازم جدیه، زمانم محدوده، و ترجیح می‌دم با کسی کار کنم که دقیق گوش بده نه اینکه فقط لیست اسپم کنه.',
      'اگر فایل مناسب دارید کوتاه و مفید بگید متراژ، طبقه، قیمت و دلیل پیشنهادتون چیه تا سریع تصمیم بگیرم.',
      'ممنون می‌شم اول دو سه تا گزینهٔ نزدیک به توضیح من بفرستید؛ بعد اگر لازم شد بازه رو بازتر می‌کنیم.',
    ])
  );

  // Pad to hit min words with natural filler tied to location/need — not nonsense.
  const fillers = [
    `تو تجربهٔ قبلی‌م تو ${city} دیدم بعضی آگهی‌ها محله رو اشتباه می‌زنن؛ لطفاً آدرس دقیق و نزدیک‌ترین خیابان اصلی رو بگید.`,
    'من آدم چانه‌زنی الکی نیستم؛ قیمت منصفانه و مدارک کامل برام از تخفیف نمایشی مهم‌تره.',
    'اگه ملک رهن مستأجر داره یا درگیری حقوقی داره از اول بگید تا وقت طرفین تلف نشه.',
    'برای مقایسه، چند تا شاخص دارم: دسترسی، نور، امنیت، هزینه نگهداری، و امکان رشد ارزش ملک.',
    'ترجیح می‌دم فایل‌ها رو تو پیامک/چت با جزئیات ساخت‌یافته بفرستید: متراژ، خواب، پارکینگ، سن بنا، و شرایط معامله.',
    `استان ${province} رو خوب می‌شناسم ولی هر محله‌ای فرهنگ خودش رو داره؛ لطفاً صادقانه بگید فضای ${hood} چطوره.`,
    'اگه گزینهٔ نوساز کلید نخورده دارید و شرایط پرداخت‌ش منطقیه، حتماً بفرستید حتی اگر کمی از بودجه فاصله داشته باشه.',
    'بیمه ساختمان، وضعیت شوفاژ/اسپیلت، و قبض‌های اخیر هم اگه بدونید کمک می‌کنه تصمیم‌م سریع‌تر بشه.',
  ];
  let text = parts.join(' ');
  let guard = 0;
  while (wordCount(text) < MIN_WORDS && guard < 20) {
    text += ' ' + pick(rand, fillers);
    guard += 1;
  }
  // Trim if somehow too long (shouldn't with these banks).
  if (wordCount(text) > MAX_WORDS) {
    const words = text.split(/\s+/);
    text = words.slice(0, MAX_WORDS).join(' ');
  }
  return text.replace(/\s+/g, ' ').trim();
}

function buildCase(index: number, rand: () => number, locs: LocRow[]): EstateParagraphCase {
  const leaf = LEAVES[index % LEAVES.length]!;
  const loc = pick(rand, locs);
  const hood = pick(rand, loc.neighborhoods);
  const altHoods = pickN(
    rand,
    loc.neighborhoods.filter((n) => n !== hood),
    2
  );
  const tones = ['casual', 'urgent', 'family', 'investor', 'student'] as const;
  const tone = tones[index % tones.length]!;
  const ambiguous = index % 41 === 0;
  const hallucinationTrap = index % 59 === 0;
  const expectQuestion = ambiguous || index % 31 === 0;

  const areaBase = leaf.kind === 'land' ? 200 + Math.floor(rand() * 1800) : 45 + Math.floor(rand() * 200);
  const rooms =
    leaf.kind === 'land' || leaf.kind === 'industrial' || leaf.kind === 'service'
      ? null
      : 1 + Math.floor(rand() * 4);
  const isSale = leaf.deal === 'buy' || leaf.deal === 'pre_sale';
  const isRent = leaf.deal.startsWith('rent');
  const budgetMax = isSale ? (2 + Math.floor(rand() * 45)) * 1_000_000_000 : undefined;
  const rahn =
    isRent && leaf.deal !== 'rent_short_term' ? (80 + Math.floor(rand() * 920)) * 1_000_000 : undefined;
  const rent =
    leaf.deal === 'rent_rahn_ejare' || leaf.deal === 'rent_monthly' || leaf.deal === 'rent_short_term'
      ? (4 + Math.floor(rand() * 90)) * 1_000_000
      : undefined;

  const text = buildNarrative({
    rand,
    leaf,
    province: loc.province,
    city: loc.city,
    hood,
    altHoods,
    area: areaBase,
    rooms,
    budgetMax: hallucinationTrap ? undefined : budgetMax,
    rahn: hallucinationTrap ? undefined : rahn,
    rent: hallucinationTrap ? undefined : rent,
    ambiguous,
    tone,
  });

  const hard: EstateParagraphOracle['hard'] = ['category', 'deal'];
  if (!hallucinationTrap && leaf.kind !== 'land' && leaf.kind !== 'service') hard.push('area');
  if (rooms != null && !hallucinationTrap) hard.push('rooms');

  const weighted: EstateParagraphOracle['weighted'] = [];
  if (!ambiguous) weighted.push('location');
  if (!hallucinationTrap && (budgetMax || rahn || rent)) weighted.push('budget');

  const wc = wordCount(text);
  if (wc < MIN_WORDS || wc > MAX_WORDS) {
    throw new Error(`Case ${index + 1} word count ${wc} out of range`);
  }

  return {
    id: `estate-colloquial-${String(index + 1).padStart(4, '0')}`,
    index: index + 1,
    seed: SEED,
    text,
    oracle: {
      leaf: [leaf.slug],
      deal: leaf.deal,
      city: ambiguous ? '' : loc.city,
      neighborhood: ambiguous ? undefined : hood,
      area:
        leaf.kind === 'land' || leaf.kind === 'service' || hallucinationTrap
          ? leaf.kind === 'land'
            ? { exact: areaBase }
            : undefined
          : { exact: areaBase },
      rooms: hallucinationTrap ? undefined : rooms,
      budget: {
        max: hallucinationTrap ? undefined : budgetMax,
        rahn: hallucinationTrap ? undefined : rahn,
        rent: hallucinationTrap ? undefined : rent,
      },
      hard,
      weighted,
      ambiguous,
      expectQuestion,
      hallucinationTrap,
    },
    tags: [
      `leaf:${leaf.slug}`,
      `deal:${leaf.deal}`,
      `tone:${tone}`,
      `province:${loc.province}`,
      `city:${loc.city}`,
      ambiguous ? 'ambiguity' : 'clear',
      hallucinationTrap ? 'hallucination-trap' : 'normal',
      `words:${wc}`,
    ],
  };
}

function toMarkdown(cases: EstateParagraphCase[]): string {
  const lines: string[] = [
    '# کورپوس ۱۰۰۰ نیاز املاک محاوره‌ای',
    '',
    `- تاریخ تولید: ${new Date().toISOString()}`,
    `- تعداد: ${cases.length}`,
    `- بازه طول: ${MIN_WORDS}–${MAX_WORDS} کلمه`,
    `- منبع مکان: \`src/data/iran-locations-tree.json\``,
    `- دسته‌بندی: برگ‌های املاک \`src/config/categories.ts\``,
    '',
    '---',
    '',
  ];
  for (const c of cases) {
    lines.push(`## ${c.id}`);
    lines.push('');
    lines.push(
      `- **شاخص:** ${c.index} · **دسته:** \`${c.oracle.leaf[0]}\` · **معامله:** \`${c.oracle.deal}\``
    );
    lines.push(
      `- **مکان اوراکل:** ${c.oracle.city || '(مبهم)'} / ${c.oracle.neighborhood ?? '—'} · **کلمات:** ${wordCount(c.text)}`
    );
    lines.push(`- **تگ‌ها:** ${c.tags.join(', ')}`);
    lines.push('');
    lines.push(c.text);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

function main() {
  const locs = loadLocations();
  if (locs.length < 50) throw new Error(`Too few locations: ${locs.length}`);
  const rand = mulberry32(SEED);
  const cases: EstateParagraphCase[] = [];
  for (let i = 0; i < TOTAL; i++) {
    cases.push(buildCase(i, rand, locs));
  }
  mkdirSync(dirname(OUT_MD), { recursive: true });
  const jsonl = cases.map((c) => JSON.stringify(c)).join('\n') + '\n';
  writeFileSync(OUT_MD, toMarkdown(cases), 'utf8');
  writeFileSync(OUT_JSONL, jsonl, 'utf8');
  writeFileSync(OUT_RUNNER, jsonl, 'utf8');
  const wcs = cases.map((c) => wordCount(c.text));
  const cities = new Set(cases.map((c) => c.oracle.city).filter(Boolean));
  console.log(
    JSON.stringify(
      {
        wrote: TOTAL,
        md: OUT_MD,
        jsonl: OUT_JSONL,
        runner: OUT_RUNNER,
        locPool: locs.length,
        uniqueCities: cities.size,
        wordMin: Math.min(...wcs),
        wordMax: Math.max(...wcs),
        wordAvg: Math.round(wcs.reduce((a, b) => a + b, 0) / wcs.length),
      },
      null,
      2
    )
  );
}

main();
