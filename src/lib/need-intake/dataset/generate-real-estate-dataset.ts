import { join } from 'node:path';
import { CANONICAL_CITIES } from '@/config/locations';
import type { DatasetFixture } from './schema';
import { labelsFromParsedIntent } from './schema';
import { exportFixturesToFile } from './export-jsonl';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

type PropertyDeal =
  | 'buy'
  | 'sell'
  | 'rent_monthly'
  | 'rent_rahn_full'
  | 'rent_rahn_ejare'
  | 'rent_short_term';
type PropertyKind = 'apartment' | 'villa' | 'land' | 'office' | 'shop' | 'industrial';

const KIND_LABEL: Record<PropertyKind, string[]> = {
  apartment: ['آپارتمان', 'واحد آپارتمانی', 'سوئیت', 'آپارتمان دو خواب'],
  villa: ['ویلا', 'خانه ویلایی', 'خانه', 'ویلای استخردار'],
  land: ['زمین', 'زمین کلنگی', 'کلنگی', 'زمین مسکونی'],
  office: ['دفتر کار', 'دفتر اداری', 'دفتر تجاری'],
  shop: ['مغازه', 'غرفه تجاری', 'مغازه سر پیچ'],
  industrial: ['سوله', 'ملک صنعتی', 'انبار صنعتی', 'سوله صنعتی'],
};

const CITIES = CANONICAL_CITIES.map((c) => c.title) as readonly string[];

type CityTitle = (typeof CITIES)[number];

const DISTRICTS: Partial<Record<CityTitle, string[]>> = {
  تهران: ['ولنجک', 'یوسف‌آباد', 'سعادت‌آباد', 'پونک', 'نیاوران', 'تهرانپارس'],
  مشهد: ['احمدآباد', 'سجاد', 'هاشمیه'],
  اصفهان: ['مرداویج', 'چهارباغ'],
  شیراز: ['معالی‌آباد', 'صدرا'],
};

const AREAS = ['55', '70', '85', '90', '100', '120', '150', '180', '200', '250', '300', '500', '800'];
const BUDGETS = ['۴۰۰', '۵۰۰', '۶۰۰', '۸۰۰', '۱', '۱.۵', '۲', '۲.۵', '۳', '۴', '۵', '۷'];
const ROOMS = ['۱', '۲', '۳'];

function expectedCategorySlug(deal: PropertyDeal, kind: PropertyKind): string {
  const prefix: Record<PropertyKind, string> = {
    apartment: 'apartment',
    villa: 'villa',
    land: 'land',
    office: 'office',
    shop: 'shop',
    industrial: 'industrial',
  };
  if (deal === 'rent_short_term') {
    if (kind === 'villa') return 'villa-short-rent';
    if (kind === 'office') return 'workspace-short-rent';
    if (kind === 'apartment') return 'suite-apartment-rent';
    return 'suite-apartment-rent';
  }
  if (deal === 'buy' || deal === 'sell') return `${prefix[kind]}-sale`;
  return `${prefix[kind]}-rent`;
}

function districtFor(city: CityTitle, variant: number): string {
  const list = DISTRICTS[city];
  if (!list?.length) return city;
  return `${list[variant % list.length]} ${city}`;
}

function buildTemplate(
  deal: PropertyDeal,
  kind: PropertyKind,
  kindLabel: string,
  place: string,
  variant: number
): string {
  const area = AREAS[variant % AREAS.length];
  const budget = BUDGETS[variant % BUDGETS.length];
  const rooms = ROOMS[variant % ROOMS.length];
  const n = variant + 1;

  switch (deal) {
    case 'buy':
      return [
        `میخوام ${kindLabel} ${area} متری در ${place} بخرم`,
        `دنبال ${kindLabel} تا ${budget} میلیارد در ${place}`,
        `خرید ${kindLabel} در ${place} حدود ${area} متر`,
        `نیاز به ${kindLabel} ${rooms} خواب در ${place} تا ${budget} میلیارد`,
        `میخواهم ${kindLabel} در محدوده ${place} با متراژ ${area}`,
        `${kindLabel} برای خرید در ${place} #${n}`,
      ][variant % 6];
    case 'sell':
      return [
        `میفروشم ${kindLabel} ${area} متری در ${place}`,
        `فروش ${kindLabel} در ${place}`,
        `آگهی فروش ${kindLabel} ${area} متری ${place}`,
        `فروشنده ${kindLabel} در ${place} با قیمت مناسب`,
        `${kindLabel} ${area} متری ${place} برای فروش`,
      ][variant % 5];
    case 'rent_monthly':
      if (kind === 'land') {
        return [
          `اجاره زمین ${area} متری در ${place}`,
          `اجاره ماهانه زمین ${area} متری ${place}`,
          `دنبال اجاره زمین در ${place} حدود ${area} متر`,
          `زمین ${area} متری برای اجاره ماهانه در ${place}`,
        ][variant % 4];
      }
      return [
        `اجاره ماهانه ${kindLabel} ${area} متری در ${place}`,
        `دنبال اجاره ${kindLabel} در ${place} حدود ${area} متر`,
        `${kindLabel} برای اجاره ماهانه در ${place}`,
        `اجاره ${kindLabel} ${rooms} خواب ${area} متری ${place}`,
        `مستاجر ${kindLabel} در ${place} #${n}`,
      ][variant % 5];
    case 'rent_rahn_full':
      if (kind === 'land') {
        return [
          `رهن کامل زمین ${area} متری ${place}`,
          `فقط رهن زمین در ${place}`,
          `رهن کامل زمین ${area} متر ${place} تا ${budget} میلیارد`,
        ][variant % 3];
      }
      return [
        `رهن کامل ${kindLabel} ${area} متری ${place} تا ${budget} میلیارد`,
        `فقط رهن ${kindLabel} در ${place}`,
        `رهن کامل ${kindLabel} در ${place} ${area} متر`,
        `${kindLabel} رهن کامل ${place}`,
      ][variant % 4];
    case 'rent_rahn_ejare':
      if (kind === 'land') {
        return [
          `رهن و اجاره زمین ${area} متری در ${place}`,
          `ودیعه و اجاره زمین در ${place}`,
          `زمین ${area} متری رهن و اجاره ${place}`,
        ][variant % 3];
      }
      return [
        `رهن و اجاره ${kindLabel} ${area} متری در ${place}`,
        `ودیعه و اجاره ${kindLabel} در ${place}`,
        `${kindLabel} رهن و اجاره در ${place} تا ${budget} میلیارد`,
        `ودیعه ${kindLabel} ${area} متری ${place}`,
      ][variant % 4];
    case 'rent_short_term':
      if (kind === 'office') {
        return [
          `اجاره روزانه دفتر کار در ${place} برای ${rooms} نفر`,
          `دفتر کوتاه‌مدت ${area} متری ${place} اجاره شبانه`,
          `فضای آموزشی روزانه در ${place}`,
        ][variant % 3];
      }
      if (kind === 'villa') {
        return [
          `اجاره روزانه ویلا ${area} متری در ${place} برای ${rooms} نفر`,
          `ویلا کوتاه‌مدت ${place} ${budget} میلیون شب`,
          `باغ و ویلا اجاره شبانه ${place}`,
        ][variant % 3];
      }
      return [
        `اجاره روزانه ${kindLabel} ${area} متری در ${place} برای ${rooms} نفر`,
        `سوئیت کوتاه‌مدت ${place} ${budget} میلیون هر شب`,
        `${kindLabel} روزانه ${area} متر ${place}`,
        `اجاره شبانه ${kindLabel} در ${place}`,
      ][variant % 4];
    default:
      return `${kindLabel} ${place}`;
  }
}

function teacherMatches(
  input: string,
  deal: PropertyDeal,
  kind: PropertyKind,
  expectedSlug: string
): DatasetFixture | null {
  const parsed = parseIntentFromText(input);
  const haystack = [parsed.categorySlug, parsed.subcategorySlug].filter(Boolean).join(' ');
  if (!haystack.includes(expectedSlug)) return null;
  if (parsed.entities.dealType !== deal) return null;
  if (parsed.entities.propertyKind !== kind) return null;
  if (!parsed.intentType.startsWith('property')) return null;

  const id = `estate-gen-${deal}-${kind}-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    input,
    labels: labelsFromParsedIntent(parsed),
    meta: { source: 'fixture', vertical: 'real-estate', tags: ['generated', 'real-estate'] },
  };
}

export interface GenerateRealEstateOptions {
  targetCount?: number;
  maxAttemptsPerCombo?: number;
}

/** Rule-teacher synthetic dataset for real-estate vertical (default 2000+ rows). */
export function generateRealEstateDataset(
  options: GenerateRealEstateOptions = {}
): DatasetFixture[] {
  const targetCount = options.targetCount ?? 2000;
  const maxAttempts = options.maxAttemptsPerCombo ?? 48;

  const deals: PropertyDeal[] = [
    'buy',
    'sell',
    'rent_monthly',
    'rent_rahn_full',
    'rent_rahn_ejare',
    'rent_short_term',
  ];
  const kinds: PropertyKind[] = ['apartment', 'villa', 'land', 'office', 'shop', 'industrial'];
  const shortTermKinds: PropertyKind[] = ['apartment', 'villa', 'office'];

  const fixtures: DatasetFixture[] = [];
  const seenInputs = new Set<string>();
  const perCombo = Math.ceil(targetCount / (deals.length * kinds.length)) + 4;

  for (const deal of deals) {
    const kindList = deal === 'rent_short_term' ? shortTermKinds : kinds;
    for (const kind of kindList) {
      const expectedSlug = expectedCategorySlug(deal, kind);
      const labels = KIND_LABEL[kind];
      let addedForCombo = 0;
      let variant = 0;

      outer: for (const city of CITIES) {
        const place = districtFor(city, variant);
        for (let attempt = 0; attempt < maxAttempts && addedForCombo < perCombo; attempt++) {
          const kindLabel = labels[(variant + attempt) % labels.length];
          const input = buildTemplate(deal, kind, kindLabel, place, variant + attempt);
          variant += 1;
          if (seenInputs.has(input)) continue;

          const row = teacherMatches(input, deal, kind, expectedSlug);
          if (!row) continue;

          seenInputs.add(input);
          fixtures.push(row);
          addedForCombo += 1;
          if (fixtures.length >= targetCount) break outer;
        }
        if (fixtures.length >= targetCount) break;
      }
    }
    if (fixtures.length >= targetCount) break;
  }

  let extraVariant = 500;
  while (fixtures.length < targetCount && extraVariant < 8000) {
    for (const deal of deals) {
      const kindList = deal === 'rent_short_term' ? shortTermKinds : kinds;
      for (const kind of kindList) {
        const expectedSlug = expectedCategorySlug(deal, kind);
        const city = CITIES[extraVariant % CITIES.length];
        const place = districtFor(city, extraVariant);
        const kindLabel = KIND_LABEL[kind][extraVariant % KIND_LABEL[kind].length];
        const input = buildTemplate(deal, kind, kindLabel, place, extraVariant);
        extraVariant += 1;
        if (seenInputs.has(input)) continue;
        const row = teacherMatches(input, deal, kind, expectedSlug);
        if (!row) continue;
        seenInputs.add(input);
        fixtures.push(row);
        if (fixtures.length >= targetCount) return fixtures;
      }
    }
  }

  return fixtures;
}

export function exportRealEstateDataset(
  fixtures: DatasetFixture[],
  outPath = join(
    process.cwd(),
    'data',
    'need-intake-training',
    'need-intake-real-estate-train.jsonl'
  )
): string {
  return exportFixturesToFile(fixtures, outPath);
}
