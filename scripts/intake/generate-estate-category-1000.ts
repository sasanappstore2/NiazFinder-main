/**
 * Generate 1000 realistic Persian real-estate *categorization* cases.
 * One leaf per case, real city/neighborhood names from Divar catalogs.
 *
 * Outputs:
 *   tmp/estate-category-1000/corpus.jsonl
 *   fixtures/estate-category-1000.jsonl
 *
 * Usage: npx tsx scripts/intake/generate-estate-category-1000.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const SEED = 20260815;
const TOTAL = 1000;
const OUT_TMP = join(ROOT, 'tmp/estate-category-1000/corpus.jsonl');
const OUT_FIXTURE = join(ROOT, 'fixtures/estate-category-1000.jsonl');

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
  'ورامین',
  'اسلامشهر',
]);

type LeafKind =
  | 'apartment'
  | 'villa'
  | 'land'
  | 'office'
  | 'shop'
  | 'industrial'
  | 'suite'
  | 'workspace'
  | 'service';

type DealKind =
  | 'buy'
  | 'rent_rahn_ejare'
  | 'rent_rahn_full'
  | 'rent_monthly'
  | 'rent_short_term'
  | 'partnership'
  | 'pre_sale'
  | 'agency';

interface LeafSpec {
  slug: string;
  kind: LeafKind;
  deal: DealKind;
}

const LEAVES: readonly LeafSpec[] = [
  { slug: 'apartment-sale', kind: 'apartment', deal: 'buy' },
  { slug: 'villa-sale', kind: 'villa', deal: 'buy' },
  { slug: 'land-sale', kind: 'land', deal: 'buy' },
  { slug: 'office-sale', kind: 'office', deal: 'buy' },
  { slug: 'shop-sale', kind: 'shop', deal: 'buy' },
  { slug: 'industrial-sale', kind: 'industrial', deal: 'buy' },
  { slug: 'apartment-rent', kind: 'apartment', deal: 'rent_rahn_ejare' },
  { slug: 'villa-rent', kind: 'villa', deal: 'rent_rahn_ejare' },
  { slug: 'land-rent', kind: 'land', deal: 'rent_monthly' },
  { slug: 'office-rent', kind: 'office', deal: 'rent_monthly' },
  { slug: 'shop-rent', kind: 'shop', deal: 'rent_rahn_full' },
  { slug: 'industrial-rent', kind: 'industrial', deal: 'rent_monthly' },
  { slug: 'suite-apartment-rent', kind: 'suite', deal: 'rent_short_term' },
  { slug: 'villa-short-rent', kind: 'villa', deal: 'rent_short_term' },
  { slug: 'workspace-short-rent', kind: 'workspace', deal: 'rent_short_term' },
  { slug: 'construction-partnership', kind: 'land', deal: 'partnership' },
  { slug: 'pre-sale-services', kind: 'apartment', deal: 'pre_sale' },
  { slug: 'agency-services', kind: 'service', deal: 'agency' },
];

interface LocRow {
  province: string;
  city: string;
  citySlug: string;
  neighborhoods: string[];
}

interface Ctx {
  city: string;
  hood: string;
  alt: string;
  province: string;
  area: number;
  rooms: number;
  budgetFa: string;
  rahnFa: string;
  rentFa: string;
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

function moneyFa(n: number): string {
  if (n >= 1_000_000_000) {
    const b = n / 1_000_000_000;
    return Number.isInteger(b) ? `${b} میلیارد` : `${b.toFixed(1)} میلیارد`;
  }
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} میلیون`;
  return `${n.toLocaleString('fa-IR')}`;
}

function cityNameKey(name: string): string {
  return name.replace(/\s*\(.+\)\s*$/, '').trim();
}

function loadLocations(): LocRow[] {
  const catalogDir = join(ROOT, 'src/data/neighborhoods/catalog');
  const adminPath = join(ROOT, 'src/data/admin-locations.json');
  const cityToProvince = new Map<string, string>();
  if (existsSync(adminPath)) {
    const admin = JSON.parse(readFileSync(adminPath, 'utf8')) as {
      countries: Array<{
        provinces: Array<{ name: string; cities: Array<{ name: string }> }>;
      }>;
    };
    for (const p of admin.countries[0]?.provinces ?? []) {
      for (const c of p.cities) {
        cityToProvince.set(c.name.trim(), p.name);
        cityToProvince.set(cityNameKey(c.name), p.name);
      }
    }
  }
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
      .filter((n) => n.length >= 2 && n.length <= 40 && !/^\d+$/.test(n));
    if (neighborhoods.length < 3) continue;
    rows.push({
      province: cityToProvince.get(city) ?? cityToProvince.get(cityNameKey(city)) ?? city,
      city,
      citySlug: raw.cityId,
      neighborhoods,
    });
  }
  const priority = rows.filter(
    (r) => PRIORITY_CITIES.has(r.city) || PRIORITY_CITIES.has(cityNameKey(r.city))
  );
  const rich = rows.filter((r) => r.neighborhoods.length >= 15);
  const pool = [...priority, ...priority, ...rich];
  if (pool.length < 40) throw new Error(`Too few catalog cities: ${pool.length}`);
  return pool;
}

function preferHood(rand: () => number, hoods: string[], kind: LeafKind, deal: DealKind): string {
  const industrial = hoods.filter((h) => /صنعتی|کارگاه|شهرک صنعتی/.test(h));
  const villaish = hoods.filter((h) => /ویلایی|باغ/.test(h));
  const melk = hoods.filter((h) => /ملک/.test(h));
  if (kind === 'industrial' && industrial.length) return pick(rand, industrial);
  if ((kind === 'villa' || deal === 'partnership') && villaish.length && rand() < 0.35) {
    return pick(rand, villaish);
  }
  if (kind === 'villa' && melk.length && rand() < 0.25) return pick(rand, melk);
  if (kind === 'land' && villaish.length && rand() < 0.2) return pick(rand, villaish);
  return pick(rand, hoods);
}

type Writer = (ctx: Ctx) => string;

const BANKS: Record<string, Writer[]> = {
  'apartment-sale': [
    (c) =>
      `سلام، می‌خوام آپارتمان مسکونی بخرم تو شهر ${c.city} محله ${c.hood}. حدود ${c.area} متر و ${c.rooms} خواب، بودجه تا ${c.budgetFa} تومان. نوساز یا بازسازی‌شده باشه. پارکینگ اگر داشته باشه بهتره.`,
    (c) =>
      `قصد خرید آپارتمان در ${c.city}، محدوده ${c.hood} دارم. واحد ${c.rooms} خواب حدود ${c.area} متر. تا ${c.budgetFa} تومان کنار گذاشتم. لطفاً فایل اداری یا مغازه نفرستید، مسکونی می‌خوام.`,
    (c) =>
      `دنبال خرید واحد آپارتمانی‌ام استان ${c.province} شهر ${c.city} محله ${c.hood}. ${c.rooms} خواب، متراژ حدود ${c.area}. سند و کد رهگیری مهمه. بودجه ${c.budgetFa} تومان.`,
    (c) =>
      `می‌خوام اپارتمان بخرم، نه ویلا و نه زمین. ${c.city} محله ${c.hood} اولویتمه. ${c.area} متر ${c.rooms} خواب. حداکثر ${c.budgetFa} تومان.`,
  ],
  'villa-sale': [
    (c) =>
      `می‌خواهم ویلای مسکونی بخرم در شهر ${c.city} محله ${c.hood}. باغ‌ویلا یا خانه ویلایی حدود ${c.area} متر، ${c.rooms} خواب. بودجه تا ${c.budgetFa} تومان. آپارتمان نمی‌خوام.`,
    (c) =>
      `خرید ویلا در ${c.city} محدوده ${c.hood}. ویلای مستقل با حیاط، حدود ${c.area} متر. تا ${c.budgetFa} تومان. لطفاً واحد آپارتمانی نفرستید.`,
    (c) =>
      `دنبال خرید خانه ویلایی هستم استان ${c.province}، ${c.city} محله ${c.hood}. ${c.rooms} خواب، متراژ ${c.area}. سند شش‌دانگ. بودجه ${c.budgetFa} تومان.`,
    (c) =>
      `ویلا می‌خوام بخرم تو ${c.hood} ${c.city}. نه مغازه نه زمین کلنگی؛ ویلای مسکونی برای زندگی. حدود ${c.area} متر، بودجه ${c.budgetFa}.`,
  ],
  'land-sale': [
    (c) =>
      `دنبال خرید زمین یا کلنگی هستم در ${c.city} محله ${c.hood}. قطعه حدود ${c.area} متر، کاربری شفاف. بودجه تا ${c.budgetFa} تومان. ویلای آماده نمی‌خوام، خود زمین را می‌خرم.`,
    (c) =>
      `زمین بخرم تو ${c.city} محدوده ${c.hood}. کلنگی هم اوکیه اگر متراژ حدود ${c.area} متر باشه. حداکثر ${c.budgetFa} تومان. مشارکت در ساخت فعلاً نمی‌خوام، خرید قطعی.`,
    (c) =>
      `قصد خرید زمین در استان ${c.province} شهر ${c.city} محله ${c.hood} دارم. شکل منظم، حدود ${c.area} متر. بودجه ${c.budgetFa} تومان.`,
    (c) =>
      `خرید زمین و کلنگی در ${c.hood} ${c.city}. ${c.area} متر. آپارتمان و سوله نمی‌خوام؛ فقط زمین.`,
  ],
  'office-sale': [
    (c) =>
      `می‌خوام دفتر کار اداری بخرم در ${c.city} محله ${c.hood}. حدود ${c.area} متر، مناسب شرکت. بودجه تا ${c.budgetFa} تومان. آپارتمان مسکونی نمی‌خوام.`,
    (c) =>
      `خرید دفتر اداری در ${c.city} محدوده ${c.hood}. آفیس حدود ${c.area} متر. تا ${c.budgetFa} تومان. مغازه خیابانی نمی‌خوام، دفتر کار می‌خوام.`,
    (c) =>
      `دنبال خرید واحد اداری‌ام استان ${c.province} ${c.city} ${c.hood}. متراژ ${c.area}. بودجه ${c.budgetFa}. سند اداری مهمه.`,
    (c) =>
      `دفتر کار می‌خوام بخرم تو ${c.hood} ${c.city}، حدود ${c.area} متر. برای استقرار تیم، نه مطب اجاره‌ای.`,
  ],
  'shop-sale': [
    (c) =>
      `خرید مغازه تجاری در ${c.city} محله ${c.hood}. غرفه یا مغازه حدود ${c.area} متر با ویترین به خیابان. بودجه تا ${c.budgetFa} تومان.`,
    (c) =>
      `می‌خوام مغازه بخرم تو ${c.hood} ${c.city}. پاساژ هم اوکیه اگر دیده شدن از خیابان خوب باشه. متراژ حدود ${c.area}. حداکثر ${c.budgetFa} تومان. آپارتمان نمی‌خوام.`,
    (c) =>
      `قصد خرید مغازه یا غرفه دارم استان ${c.province} شهر ${c.city} محدوده ${c.hood}. ${c.area} متر. بودجه ${c.budgetFa}.`,
    (c) =>
      `فروشنده نیستم، خریدار مغازه‌ام در ${c.city} ${c.hood}. تجاری بر خیابان، حدود ${c.area} متر، تا ${c.budgetFa} تومان.`,
  ],
  'industrial-sale': [
    (c) =>
      `قصد خرید سوله صنعتی دارم در ${c.city} محله ${c.hood}. سوله یا کارگاه حدود ${c.area} متر، ورودی کامیون. بودجه تا ${c.budgetFa} تومان. آپارتمان مسکونی نمی‌خوام.`,
    (c) =>
      `سوله می‌خوام بخرم تو ${c.hood} ${c.city}. کارگاه صنعتی هم اوکیه. متراژ حدود ${c.area}. حداکثر ${c.budgetFa} تومان.`,
    (c) =>
      `خرید سوله یا کارگاه صنعتی استان ${c.province} شهر ${c.city} محدوده ${c.hood}. ارتفاع سقف مهمه. ${c.area} متر. بودجه ${c.budgetFa}.`,
    (c) =>
      `دنبال خرید انبار صنعتی / سوله هستم در ${c.city} ${c.hood}. ${c.area} متر. زمین خالی بدون سوله نمی‌خوام.`,
  ],
  'apartment-rent': [
    (c) =>
      `رهن و اجاره آپارتمان مسکونی می‌خوام در ${c.city} محله ${c.hood}. ${c.rooms} خواب حدود ${c.area} متر. رهن حدود ${c.rahnFa} تومان و اجاره ماهانه حدود ${c.rentFa} تومان. اجاره روزانه و سوئیت مسافری نمی‌خوام.`,
    (c) =>
      `اجاره آپارتمان در ${c.city} محدوده ${c.hood}. قرارداد سالانه، ${c.rooms} خواب، ${c.area} متر. ودیعه ${c.rahnFa} و اجاره ${c.rentFa}. کوتاه‌مدت نمی‌خوام.`,
    (c) =>
      `رهن آپارتمان ${c.rooms} خواب تو ${c.hood} ${c.city}. متراژ حدود ${c.area}. رهن ${c.rahnFa} اجاره ${c.rentFa}. خانواده هستیم نه مسافر.`,
    (c) =>
      `آپارتمان رهن‌اجاره لازم دارم استان ${c.province} شهر ${c.city} محله ${c.hood}. ${c.area} متر ${c.rooms} خواب. ماهانه ${c.rentFa} اوکیه.`,
  ],
  'villa-rent': [
    (c) =>
      `رهن و اجاره خانه ویلایی می‌خوام در ${c.city} محله ${c.hood}. ویلا حدود ${c.area} متر ${c.rooms} خواب برای سکونت سالانه. رهن ${c.rahnFa} اجاره ${c.rentFa}. اجاره روزانه ویلا نمی‌خوام.`,
    (c) =>
      `اجاره ویلا در ${c.city} محدوده ${c.hood} برای زندگی، قرارداد بلندمدت. ${c.area} متر. ودیعه ${c.rahnFa}. کوتاه‌مدت و مسافری نیست.`,
    (c) =>
      `خانه ویلایی رهن کامل یا رهن‌اجاره تو ${c.hood} ${c.city}. ${c.rooms} خواب ${c.area} متر. خانواده چهارنفره. روزانه نمی‌خوایم.`,
    (c) =>
      `ویلا اجاره می‌کنم استان ${c.province} ${c.city} ${c.hood} برای سکونت، نه تعطیلات. اجاره ماهانه حدود ${c.rentFa}.`,
  ],
  'land-rent': [
    (c) =>
      `اجاره ماهانه زمین یا کلنگی می‌خوام در ${c.city} محله ${c.hood}. قطعه حدود ${c.area} متر برای کار. اجاره حدود ${c.rentFa} تومان. خرید زمین فعلاً نه، اجاره.`,
    (c) =>
      `زمین اجاره در ${c.hood} ${c.city}. کاربری مشخص، حدود ${c.area} متر. اجاره ماهانه ${c.rentFa}. ویلا و آپارتمان نمی‌خوام.`,
    (c) =>
      `اجاره زمین و کلنگی استان ${c.province} شهر ${c.city} محدوده ${c.hood}. متراژ ${c.area}. سوله آماده نمی‌خوام، خود زمین.`,
    (c) =>
      `کلنگی اجاره می‌کنم تو ${c.city} ${c.hood} حدود ${c.area} متر. مشارکت در ساخت نیست؛ اجاره ماهانه.`,
  ],
  'office-rent': [
    (c) =>
      `اجاره دفتر کار در ${c.city} محله ${c.hood}. واحد اداری حدود ${c.area} متر برای شرکت. اجاره ماهانه حدود ${c.rentFa} تومان. آپارتمان مسکونی نمی‌خوام.`,
    (c) =>
      `دفتر اداری اجاره می‌کنم تو ${c.hood} ${c.city}. آفیس ${c.area} متری. ماهانه ${c.rentFa}. فضای کار اشتراکی روزانه نمی‌خوام، دفتر مستقل می‌خوام.`,
    (c) =>
      `اجاره ماهانه دفتر کار اداری استان ${c.province} ${c.city} ${c.hood}. متراژ ${c.area}. قرارداد رسمی.`,
    (c) =>
      `دنبال اجاره واحد اداری‌ام در ${c.city} محدوده ${c.hood}. ${c.area} متر. مغازه نمی‌خوام، دفتر کار.`,
  ],
  'shop-rent': [
    (c) =>
      `رهن کامل مغازه می‌خوام در ${c.city} محله ${c.hood}. مغازه تجاری حدود ${c.area} متر با ویترین. رهن حدود ${c.rahnFa} تومان. خرید مغازه نمی‌خوام، اجاره/رهن.`,
    (c) =>
      `اجاره مغازه در ${c.hood} ${c.city}. غرفه پاساژ هم اوکیه. متراژ ${c.area}. ودیعه ${c.rahnFa}. آپارتمان نیست، تجاری.`,
    (c) =>
      `رهن مغازه تجاری استان ${c.province} شهر ${c.city} محدوده ${c.hood}. ${c.area} متر. اجاره کم یا رهن کامل.`,
    (c) =>
      `مغازه اجاره‌ای لازم دارم تو ${c.city} ${c.hood} برای فروشگاه. حدود ${c.area} متر. دفتر اداری نمی‌خوام.`,
  ],
  'industrial-rent': [
    (c) =>
      `اجاره سوله در ${c.city} محله ${c.hood}. سوله صنعتی حدود ${c.area} متر، ورودی کامیون. اجاره ماهانه حدود ${c.rentFa} تومان. خرید سوله فعلاً نه.`,
    (c) =>
      `کارگاه صنعتی اجاره می‌کنم تو ${c.hood} ${c.city}. متراژ ${c.area}. ماهانه ${c.rentFa}. آپارتمان مسکونی نیست.`,
    (c) =>
      `اجاره ماهانه سوله یا انبار صنعتی استان ${c.province} ${c.city} ${c.hood}. ${c.area} متر. مجوز فعالیت مهمه.`,
    (c) =>
      `سوله اجاره در ${c.city} محدوده ${c.hood}. ارتفاع سقف و برق سه‌فاز. ${c.area} متر. زمین خالی بدون سوله نمی‌خوام.`,
  ],
  'suite-apartment-rent': [
    (c) =>
      `اجاره کوتاه‌مدت سوئیت یا آپارتمان اقامتی می‌خوام در ${c.city} محله ${c.hood} برای چند روز تا حداکثر دو هفته. حدود ${c.area} متر، تمیز و مبله. رهن‌اجاره سالانه نمی‌خوام.`,
    (c) =>
      `سوئیت روزانه نزدیک ${c.hood} ${c.city} لازم دارم. اقامت کوتاه چند شب. آپارتمان خالی برای قرارداد سالانه نمی‌خوام.`,
    (c) =>
      `آپارتمان اجاره کوتاه مدت در ${c.city} محدوده ${c.hood}. مبله، برای مسافرت حدود یک هفته. ${c.area} متر.`,
    (c) =>
      `سوییت اقامتی کوتاه‌مدت تو ${c.hood} ${c.city}. چند روز تا دو هفته. اجاره ماهانه و رهن خانوادگی نیست.`,
  ],
  'villa-short-rent': [
    (c) =>
      `اجاره روزانه ویلا می‌خوام در ${c.city} محله ${c.hood} برای تعطیلات چند روزه. ویلای مبله حدود ${c.area} متر. سکونت سالانه و رهن‌اجاره نمی‌خوام، فقط کوتاه‌مدت.`,
    (c) =>
      `ویلا اجاره کوتاه‌مدت تو ${c.hood} ${c.city} برای آخر هفته. باغ‌ویلا روزانه. قرارداد یک‌ساله نمی‌خوام.`,
    (c) =>
      `اجاره کوتاه مدت ویلا در استان ${c.province} شهر ${c.city} محدوده ${c.hood}. چند روز تا حداکثر دو هفته. ${c.area} متر.`,
    (c) =>
      `ویلای روزانه / هفتگی لازم دارم ${c.city} ${c.hood}. برای سفر، نه زندگی دائمی. مبله باشد.`,
  ],
  'workspace-short-rent': [
    (c) =>
      `اجاره کوتاه‌مدت فضای کار اشتراکی می‌خوام در ${c.city} محله ${c.hood} برای چند روز تا دو هفته. میز و اینترنت. دفتر اداری سالانه نمی‌خوام.`,
    (c) =>
      `فضای کار اشتراکی روزانه تو ${c.hood} ${c.city}. کوتاه مدت برای پروژه. اجاره ماهانه دفتر مستقل نمی‌خوام.`,
    (c) =>
      `اجاره کوتاه مدت فضای کار در ${c.city} محدوده ${c.hood}. ورک‌اسپیس چندروزه. ${c.area} متر برای تیم کوچک.`,
    (c) =>
      `فضای کار کوتاه‌مدت لازم دارم استان ${c.province} ${c.city} ${c.hood}. چند روز کار حضوری، نه خرید دفتر.`,
  ],
  'construction-partnership': [
    (c) =>
      `برای مشارکت در ساخت روی زمین در ${c.city} محله ${c.hood} دنبال شریک سازنده مطمئن هستم. زمین حدود ${c.area} متر. خرید قطعی زمین بدون مشارکت نمی‌خوام.`,
    (c) =>
      `مشارکت در ساخت زمین ${c.hood} ${c.city}. مالک زمینم / یا دنبال زمین برای مشارکت. ${c.area} متر. فروش نقدی ملک نیست.`,
    (c) =>
      `مشارکت ساخت در استان ${c.province} شهر ${c.city} محدوده ${c.hood}. زمین یا کلنگی برای ساخت مشترک. پیش‌فروش واحد آماده جداست.`,
    (c) =>
      `دنبال شریک مشارکت در ساخت هستم ${c.city} ${c.hood}. آورده زمین حدود ${c.area} متر. اجاره و رهن مطرح نیست.`,
  ],
  'pre-sale-services': [
    (c) =>
      `واحد پیش‌فروش آپارتمان می‌خوام در ${c.city} محله ${c.hood}. پروژه مسکونی با مدارک شفاف و زمان تحویل مشخص. حدود ${c.area} متر ${c.rooms} خواب. خرید واحد آماده کلید نخورده از مالک شخصی جداست؛ پیش‌فروش سازنده می‌خوام.`,
    (c) =>
      `پیش‌فروش آپارتمان در ${c.hood} ${c.city}. پروژه در حال ساخت، ${c.area} متر. بودجه تا ${c.budgetFa} تومان. فایل دست‌دوم آماده نمی‌خوام.`,
    (c) =>
      `پیش فروش واحد مسکونی استان ${c.province} ${c.city} ${c.hood}. ${c.rooms} خواب. قرارداد پیش‌فروش و کد رهگیری.`,
    (c) =>
      `دنبال پیش‌فروش مسکن تو ${c.city} محدوده ${c.hood} هستم. پروژه معتبر. ${c.area} متر. مشارکت در ساخت زمین خالی نیست.`,
  ],
  'agency-services': [
    (c) =>
      `دنبال مشاور املاک حرفه‌ای در ${c.city} محله ${c.hood} هستم که نیازم را بفهمد و فایل اسپم نفرستد. خودم ملک خاصی برای خرید/اجاره اعلام نمی‌کنم؛ خدمات آژانس و بازدید می‌خوام.`,
    (c) =>
      `آژانس املاک معتبر تو ${c.hood} ${c.city} لازم دارم برای کارشناسی قیمت و مشاوره معامله. بنگاه با مجوز.`,
    (c) =>
      `مشاور املاک استان ${c.province} شهر ${c.city} محدوده ${c.hood}. خدمات مشاوره و قرارداد، نه اینکه خودم سوله یا آپارتمان مشخص بخرم.`,
    (c) =>
      `بنگاه املاک می‌خوام در ${c.city} ${c.hood} که کارشناسی ملک و مذاکره انجام بده. نیازم خدمات آژانس است.`,
  ],
};

function buildText(leaf: LeafSpec, ctx: Ctx, rand: () => number): string {
  const bank = BANKS[leaf.slug];
  if (!bank?.length) throw new Error(`No templates for ${leaf.slug}`);
  return pick(rand, bank)(ctx).replace(/\s+/g, ' ').trim();
}

function buildCase(index: number, rand: () => number, locs: LocRow[]): EstateParagraphCase {
  const leaf = LEAVES[index % LEAVES.length]!;
  const loc = pick(rand, locs);
  const hood = preferHood(rand, loc.neighborhoods, leaf.kind, leaf.deal);
  const alt = pick(
    rand,
    loc.neighborhoods.filter((n) => n !== hood)
  );
  const area =
    leaf.kind === 'land' || leaf.kind === 'industrial'
      ? 200 + Math.floor(rand() * 1800)
      : 45 + Math.floor(rand() * 180);
  const rooms = 1 + Math.floor(rand() * 4);
  const budgetMax = (2 + Math.floor(rand() * 45)) * 1_000_000_000;
  const rahn = (80 + Math.floor(rand() * 920)) * 1_000_000;
  const rent = (4 + Math.floor(rand() * 90)) * 1_000_000;
  const ctx: Ctx = {
    city: loc.city,
    hood,
    alt,
    province: loc.province,
    area,
    rooms,
    budgetFa: moneyFa(budgetMax),
    rahnFa: moneyFa(rahn),
    rentFa: moneyFa(rent),
  };
  const text = buildText(leaf, ctx, rand);
  return {
    id: `estate-cat-${String(index + 1).padStart(4, '0')}`,
    index: index + 1,
    seed: SEED,
    text,
    oracle: {
      leaf: [leaf.slug],
      deal: leaf.deal,
      city: loc.city,
      neighborhood: hood,
      hard: ['category'],
      weighted: ['location'],
      ambiguous: false,
      expectQuestion: false,
      hallucinationTrap: false,
    },
    tags: [
      `leaf:${leaf.slug}`,
      `deal:${leaf.deal}`,
      `kind:${leaf.kind}`,
      `city:${loc.city}`,
      `province:${loc.province}`,
      `hood:${hood}`,
    ],
  };
}

function main() {
  const locs = loadLocations();
  const rand = mulberry32(SEED);
  const cases: EstateParagraphCase[] = [];
  for (let i = 0; i < TOTAL; i++) cases.push(buildCase(i, rand, locs));
  const jsonl = cases.map((c) => JSON.stringify(c)).join('\n') + '\n';
  mkdirSync(dirname(OUT_TMP), { recursive: true });
  mkdirSync(dirname(OUT_FIXTURE), { recursive: true });
  writeFileSync(OUT_TMP, jsonl, 'utf8');
  writeFileSync(OUT_FIXTURE, jsonl, 'utf8');
  const byLeaf: Record<string, number> = {};
  const cities = new Set<string>();
  for (const c of cases) {
    const leaf = c.oracle.leaf[0]!;
    byLeaf[leaf] = (byLeaf[leaf] ?? 0) + 1;
    if (c.oracle.city) cities.add(c.oracle.city);
  }
  console.log(
    JSON.stringify(
      {
        wrote: cases.length,
        tmp: OUT_TMP,
        fixture: OUT_FIXTURE,
        locPool: locs.length,
        uniqueCities: cities.size,
        byLeaf,
      },
      null,
      2
    )
  );
}

main();
