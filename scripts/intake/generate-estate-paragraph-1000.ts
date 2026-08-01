/**
 * Deterministic generator for fixtures/estate-paragraph-1000.jsonl
 * Seed-stable: same seed → identical corpus.
 *
 * Usage:
 *   npx tsx scripts/intake/generate-estate-paragraph-1000.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { EstateParagraphCase, EstateParagraphOracle } from '@/lib/need-intake/estate/estate-paragraph-types';

const ROOT = process.cwd();
const OUT = join(ROOT, 'fixtures/estate-paragraph-1000.jsonl');
const SEED = 20260711;
const TOTAL = 1000;

const LEAVES = [
  { slug: 'apartment-sale', kind: 'apartment', deal: 'buy', label: 'آپارتمان مسکونی' },
  { slug: 'villa-sale', kind: 'villa', deal: 'buy', label: 'ویلای مسکونی' },
  { slug: 'land-sale', kind: 'land', deal: 'buy', label: 'زمین و کلنگی' },
  { slug: 'office-sale', kind: 'office', deal: 'buy', label: 'دفتر کار اداری' },
  { slug: 'shop-sale', kind: 'shop', deal: 'buy', label: 'مغازه تجاری' },
  { slug: 'industrial-sale', kind: 'industrial', deal: 'buy', label: 'سوله صنعتی' },
  { slug: 'apartment-rent', kind: 'apartment', deal: 'rent_rahn_ejare', label: 'آپارتمان مسکونی' },
  { slug: 'villa-rent', kind: 'villa', deal: 'rent_rahn_ejare', label: 'خانه ویلایی' },
  { slug: 'land-rent', kind: 'land', deal: 'rent_monthly', label: 'زمین و کلنگی' },
  { slug: 'office-rent', kind: 'office', deal: 'rent_monthly', label: 'دفتر اداری' },
  { slug: 'shop-rent', kind: 'shop', deal: 'rent_rahn_full', label: 'مغازه تجاری' },
  { slug: 'industrial-rent', kind: 'industrial', deal: 'rent_monthly', label: 'کارگاه صنعتی' },
  { slug: 'suite-apartment-rent', kind: 'apartment', deal: 'rent_short_term', label: 'سوئیت اقامتی' },
  { slug: 'villa-short-rent', kind: 'villa', deal: 'rent_short_term', label: 'ویلای روزانه' },
  { slug: 'workspace-short-rent', kind: 'office', deal: 'rent_short_term', label: 'فضای کار اشتراکی' },
  { slug: 'construction-partnership', kind: 'land', deal: 'partnership', label: 'زمین برای مشارکت در ساخت' },
  { slug: 'pre-sale-services', kind: 'apartment', deal: 'pre_sale', label: 'واحد آپارتمانی پیش‌فروش' },
] as const;

const CITIES = [
  { name: 'تهران', hoods: ['ونک', 'سعادت‌آباد', 'پونک', 'جردن', 'نیاوران', 'تهرانپارس', 'پیروزی'] },
  { name: 'مشهد', hoods: ['هاشمیه', 'احمدآباد', 'سجاد', 'طلاب', 'قاسم‌آباد'] },
  { name: 'اصفهان', hoods: ['جلفا', 'ملک‌شهر', 'خوراسگان', 'سپاهان‌شهر'] },
  { name: 'شیراز', hoods: ['معالی‌آباد', 'زندیه', 'گلدشت', 'صدرا'] },
  { name: 'کرج', hoods: ['گوهردشت', 'مهرشهر', 'عظیمیه', 'فردیس'] },
  { name: 'تبریز', hoods: ['ولیعصر', 'الهیه', 'مرزداران'] },
  { name: 'اهواز', hoods: ['کیانپارس', 'گلستان', 'زیتون'] },
] as const;

const TONES = ['formal', 'casual', 'urgent', 'typo', 'noisy', 'short', 'long'] as const;
const AMENITIES = ['پارکینگ اختصاصی', 'انباری', 'بالکن', 'نورگیر جنوبی', 'سند تک‌برگ'] as const;

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
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)} میلیارد`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} میلیون`;
  return `${n.toLocaleString('fa-IR')}`;
}

function dealPhrase(deal: string, label: string, rand: () => number): string {
  switch (deal) {
    case 'buy':
      return pick(rand, [
        `به دنبال خرید ${label} هستم`,
        `می‌خواهم ${label} بخرم`,
        `برای خرید ${label} نیاز دارم`,
      ]);
    case 'rent_monthly':
      return `می‌خواهم ${label} اجاره کنم`;
    case 'rent_rahn_full':
      return `رهن کامل ${label} می‌خواهم`;
    case 'rent_rahn_ejare':
      return `رهن و اجاره ${label} می‌خواهم`;
    case 'rent_short_term':
      return `اجاره کوتاه‌مدت ${label} می‌خواهم`;
    case 'partnership':
      return `برای مشارکت در ساخت روی ${label} نیاز دارم`;
    case 'pre_sale':
      return `خرید ${label} به‌صورت پیش‌فروش می‌خواهم`;
    default:
      return `نیاز به ${label} دارم`;
  }
}

function buildCase(index: number, rand: () => number): EstateParagraphCase {
  const leaf = LEAVES[index % LEAVES.length]!;
  const city = pick(rand, CITIES);
  const hood = pick(rand, city.hoods);
  const tone = TONES[index % TONES.length]!;
  const area = 40 + Math.floor(rand() * 220);
  const rooms = leaf.kind === 'land' || leaf.kind === 'industrial' ? null : 1 + Math.floor(rand() * 4);
  const isRent = leaf.deal.startsWith('rent');
  const isSale = leaf.deal === 'buy' || leaf.deal === 'pre_sale';
  const budgetMax = isSale ? (2 + Math.floor(rand() * 40)) * 1_000_000_000 : undefined;
  const rahn = isRent && leaf.deal !== 'rent_short_term' ? (100 + Math.floor(rand() * 900)) * 1_000_000 : undefined;
  const rent =
    leaf.deal === 'rent_rahn_ejare' || leaf.deal === 'rent_monthly' || leaf.deal === 'rent_short_term'
      ? (5 + Math.floor(rand() * 80)) * 1_000_000
      : undefined;

  const ambiguous = index % 37 === 0;
  const hallucinationTrap = index % 53 === 0;
  const amenityTrap = index % 41 === 0;
  const expectQuestion = ambiguous || index % 29 === 0;

  const amenity = pick(rand, AMENITIES);
  const parts: string[] = [];

  if (tone === 'urgent') parts.push('فوری لازم دارم.');
  if (tone === 'formal') parts.push('با سلام');

  parts.push(dealPhrase(leaf.deal, leaf.label, rand));

  if (!ambiguous) {
    parts.push(`در شهر ${city.name} محله ${hood}`);
  } else {
    parts.push('در یک شهر بزرگ (شهر را مشخص نکردم)');
  }

  if (leaf.kind !== 'land') {
    parts.push(`متراژ حدود ${area} متر`);
    if (rooms != null) parts.push(`${rooms} خواب`);
  } else {
    parts.push(`متراژ حدود ${area * 10} متر`);
  }

  if (budgetMax) parts.push(`بودجه خرید تا ${moneyFa(budgetMax)} تومان`);
  if (rahn) parts.push(`رهن حدود ${moneyFa(rahn)} تومان`);
  if (rent && leaf.deal !== 'rent_rahn_full') {
    parts.push(
      leaf.deal === 'rent_short_term'
        ? `اجاره هر شب حدود ${moneyFa(rent)} تومان`
        : `اجاره ماهانه حدود ${moneyFa(rent)} تومان`
    );
  }

  if (!amenityTrap) parts.push(`ترجیحاً ${amenity} داشته باشد`);
  else parts.push('پارکینگ لازم نیست ولی نورگیر بودن مهم است');

  if (tone === 'long') {
    parts.push('سند تک‌برگ ترجیح داده می‌شود و امکان بازدید در روزهای هفته وجود دارد.');
  }
  if (tone === 'typo') {
    parts.push('متراژش مهمه برامم');
  }
  if (tone === 'noisy') {
    parts.push('!!! ### ???');
  }
  if (hallucinationTrap) {
    // Keep stated area/rooms; omit inventing extra money fields beyond budget already set.
    parts.push('سایر جزئیات مالی را بعداً می‌گویم');
  }

  let text = parts.join('، ').replace(/، ،/g, '، ') + '.';
  if (tone === 'casual') text = text.replace(/می‌خواهم/g, 'میخوام').replace(/هستم/g, 'هستم');

  const hard: EstateParagraphOracle['hard'] = ['category', 'deal'];
  if (!hallucinationTrap && leaf.kind !== 'land') hard.push('area');
  if (rooms != null && !hallucinationTrap) hard.push('rooms');

  // Hallucination trap should not include budget in oracle money expectations if we want to test invention —
  // keep budget when explicitly stated in text.
  const weighted: EstateParagraphOracle['weighted'] = [];
  if (!ambiguous) weighted.push('location');
  if ((budgetMax || rahn || rent) && !hallucinationTrap) weighted.push('budget');

  return {
    id: `estate-${String(index + 1).padStart(4, '0')}`,
    index: index + 1,
    seed: SEED,
    text,
    oracle: {
      leaf: [leaf.slug],
      deal: leaf.deal,
      city: ambiguous ? '' : city.name,
      neighborhood: ambiguous ? undefined : hood,
      area:
        leaf.kind === 'land'
          ? { exact: area * 10 }
          : hallucinationTrap
            ? undefined
            : { exact: area },
      rooms: hallucinationTrap ? undefined : rooms,
      budget: {
        max: budgetMax,
        rahn,
        rent,
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
      ambiguous ? 'ambiguity' : 'clear',
      hallucinationTrap ? 'hallucination-trap' : 'normal',
      amenityTrap ? 'amenity-trap' : 'amenity-ok',
    ],
  };
}

function main() {
  const rand = mulberry32(SEED);
  const lines: string[] = [];
  for (let i = 0; i < TOTAL; i++) {
    lines.push(JSON.stringify(buildCase(i, rand)));
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, lines.join('\n') + '\n', 'utf8');
  console.log(`Wrote ${TOTAL} cases → ${OUT}`);
}

main();
