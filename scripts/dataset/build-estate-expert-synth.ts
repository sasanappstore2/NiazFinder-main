#!/usr/bin/env npx tsx
/**
 * Synthetic Persian estate expert dataset (Q&A + multi-turn clarification).
 * No scrape dependency — template + variation based generation.
 *
 * Run: npm run dataset:estate-expert-synth
 *      npm run dataset:estate-expert-synth -- --target=5000
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CANONICAL_CITIES } from '@/config/locations';
import { REAL_ESTATE_LEAF_SLUGS } from '@/lib/need-intake/dataset/real-estate-leaf-slugs';
import { labelsToAssistantJson } from '@/lib/need-intake/dataset/build-training-row';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';

const OUT_DIR = join(process.cwd(), 'data', 'need-intake-training');
const JSONL_PATH = join(OUT_DIR, 'estate-expert-synth.jsonl');
const HOLDOUT_PATH = join(OUT_DIR, 'estate-expert-synth-holdout.jsonl');
const MANIFEST_PATH = join(OUT_DIR, 'estate-expert-synth-manifest.json');

const ESTATE_AGENT_SYSTEM =
  'تو یک مشاور املاک خبره و باتجربه در بازار ایران هستی. به فارسی روان، دقیق و کاربردی پاسخ می‌دهی. از اصطلاحات رایج املاک ایران (رهن، اجاره، پیش‌فروش، سند تک‌برگ، بنچاق و ...) درست استفاده می‌کنی. اگر سوال خارج از حوزه املاک بود، مودبانه محدودیت خود را بگو.';

type Row = { messages: Array<{ role: string; content: string }> };

const EXPERT_QA: Array<{ q: string; a: string; tags: string[] }> = [
  {
    q: 'فرق رهن کامل و رهن و اجاره چیست؟',
    a: 'در رهن کامل (رهنِ سرقفلی) مبلغ رهن جایگزین اجاره ماهانه می‌شود و مستأجر معمولاً فقط همان مبلغ را می‌پردازد. در رهن و اجاره، بخشی از ارزش ملک به‌صورت رهن (ودیعه) و مابه‌صورت اجاره ماهانه پرداخت می‌شود. برای مستأجر، رهن کامل جریان نقدی ساده‌تر دارد؛ برای مالک، رهن و اجاره انعطاف بیشتری در تنظیم درآمد ماهانه می‌دهد.',
    tags: ['رهن', 'اجاره'],
  },
  {
    q: 'سند تک‌برگ و بنچاق چه تفاوتی دارند؟',
    a: 'سند تک‌برگ (سند رسمی ۶ دانگ) در دفترخانه ثبت می‌شود و مالکیت را شفاف ثبت می‌کند. بنچاق (قولنامه محضری یا عادی) سند رسمی نیست و تا انتقال در دفترخانه ریسک حقوقی دارد. برای خرید امن، اولویت با سند تک‌برگ و استعلام ثبتی، حدود و کاربری است.',
    tags: ['سند', 'حقوقی'],
  },
  {
    q: 'پیش‌فروش آپارتمان چه ریسک‌هایی دارد؟',
    a: 'ریسک‌های رایج: تأخیر تحویل، تغییر مشخصات واحد، مشکلات صدور سند، و ضعف ضمانت‌های قرارداد. قبل از پرداخت، سابقه سازنده، پروانه ساخت، پیشرفت فیزیکی، و بندهای جریمه تأخیر را بررسی کنید. پرداخت‌ها را مرحله‌ای و منوط به پیشرفت کار تنظیم کنید.',
    tags: ['پیش‌فروش'],
  },
  {
    q: 'مشارکت در ساخت برای مالک زمین چه مزایا و معایبی دارد؟',
    a: 'مزیت: بدون نیاز به سرمایه ساخت، دریافت سهم از واحدهای ساخته‌شده. معایب: ریسک انتخاب سازنده ضعیف، قرارداد مبهم، و اختلاف بر سر کیفیت و زمان. قرارداد مشارکت باید سهم‌بندی، زمان‌بندی، استاندارد مصالح، و ضمانت‌ها را دقیق مشخص کند.',
    tags: ['مشارکت'],
  },
  {
    q: 'برای خرید اولین خانه در ایران از کجا شروع کنم؟',
    a: 'اول بودجه واقعی (نقد + وام) را مشخص کنید. شهر و محله را بر اساس محل کار، مدارس و حمل‌ونقل انتخاب کنید. سپس نوع ملک (آپارتمان، ویلا، کلنگی) و اولویت‌ها (متراژ، پارکینگ، سن بنا) را لیست کنید. بازدید، استعلام سند، و مقایسه حداقل ۵ گزینه قبل از پیشنهاد قیمت ضروری است.',
    tags: ['خرید', 'راهنما'],
  },
  {
    q: 'سرقفلی مغازه چیست و چرا مهم است؟',
    a: 'سرقفلی حق کسب و پیشی تجاری مستأجر است و ارزش انتقال مغازه را بالا می‌برد. در انتقال مغازه باید وضعیت سرقفلی، حق کسب و پیشی، و رضایت طرفین در قرارداد اجاره بررسی شود. خرید مغازه بدون بررسی سرقفلی می‌تواند منجر به اختلاف با مستأجر قبلی شود.',
    tags: ['تجاری', 'سرقفلی'],
  },
  {
    q: 'چک‌لیست بازدید ملک قبل از خرید چیست؟',
    a: 'سند و مالکیت، تراکم و کاربری، رطوبت و نشت، سیم‌کشی و لوله‌کشی، نور و تهویه، همسایگی و سروصدای محله، پارکینگ و انباری، شارژ ماهانه و بدهی ساختمان، و قیمت منطقه با آگهی‌های مشابه را بررسی کنید.',
    tags: ['بازدید', 'خرید'],
  },
  {
    q: 'اجاره کوتاه‌مدت در ایران از نظر قانونی چه نکاتی دارد؟',
    a: 'اجاره کوتاه‌مدت باید با مالک یا مجوز قانونی او باشد. قرارداد مدت، مبلغ، تحویل کلید، و مسئولیت خسارت باید شفاف باشد. در برخی مجتمع‌ها یا محلات، محدودیت برای اجاره کوتاه‌مدت وجود دارد؛ قبل از آگهی، مقررات ساختمان و محله را بپرسید.',
    tags: ['اجاره کوتاه'],
  },
];

const CITY_DISTRICTS: Record<string, string[]> = {
  tehran: ['سعادت‌آباد', 'پونک', 'نیاوران', 'تهرانپارس', 'ونک', 'جردن', 'پیروزی'],
  mashhad: ['احمدآباد', 'سجاد', 'هاشمیه', 'طلاب'],
  isfahan: ['مرداویج', 'چهارباغ', 'سیچان'],
  shiraz: ['معالی‌آباد', 'صدرا', 'قصردشت'],
  tabriz: ['ائل‌گلی', 'ولیعصر', 'رشدیه'],
  karaj: ['مهرشهر', 'گوهردشت', 'عظیمیه'],
};

function parseArgs(): { target: number; holdout: number } {
  let target = 8_000;
  let holdout = 400;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--target=')) target = Math.max(100, Number(arg.slice(9)) || 8_000);
    if (arg.startsWith('--holdout=')) holdout = Math.max(50, Number(arg.slice(10)) || 400);
  }
  return { target, holdout };
}

function expertRow(q: string, a: string): Row {
  return {
    messages: [
      { role: 'system', content: ESTATE_AGENT_SYSTEM },
      { role: 'user', content: q },
      { role: 'assistant', content: a },
    ],
  };
}

function buildMultiTurnClarify(
  citySlug: string,
  cityTitle: string,
  district: string,
  slug: string,
  variant: number
): Row {
  const budgets = ['۵', '۸', '۱۲', '۱۵', '۲۰'];
  const budget = budgets[variant % budgets.length];
  const rooms = ['۱', '۲', '۳'][variant % 3];
  const labels: DatasetLabels = {
    intentType: 'property_search',
    categorySlug: slug,
    entities: { dealType: slug.includes('rent') ? 'rent' : 'buy', rooms },
    city: citySlug,
    budgetMax: Number(budget) * 1_000_000_000,
    urgency: 'NORMAL',
    neighborhoodSlug: district,
  };

  return {
    messages: [
      { role: 'system', content: ESTATE_AGENT_SYSTEM },
      { role: 'user', content: `دنبال ${slug.includes('villa') ? 'ویلا' : 'آپارتمان'} ${rooms} خواب هستم` },
      {
        role: 'assistant',
        content: `حتماً کمکت می‌کنم. در کدام شهر و محله دنبالش هستید؟ بودجه تقریبی‌تان چقدر است؟`,
      },
      { role: 'user', content: `${district} ${cityTitle}، تا ${budget} میلیارد` },
      { role: 'assistant', content: labelsToAssistantJson(labels) },
    ],
  };
}

function slugToKind(slug: string): string {
  if (slug.includes('villa')) return 'ویلا';
  if (slug.includes('land')) return 'زمین';
  if (slug.includes('office')) return 'دفتر';
  if (slug.includes('shop')) return 'مغازه';
  return 'آپارتمان';
}

function generatePool(target: number): Row[] {
  const rows: Row[] = [];
  const seen = new Set<string>();

  function add(row: Row): void {
    const key = JSON.stringify(row.messages);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push(row);
  }

  for (const item of EXPERT_QA) {
    add(expertRow(item.q, item.a));
    for (const city of CANONICAL_CITIES.slice(0, 15)) {
      add(
        expertRow(
          `${item.q.replace('؟', '')} در ${city.title}؟`,
          `${item.a} در بازار ${city.title} همیشه جزئیات محلی (قیمت، تقاضا، و مقررات شهرداری) را جداگانه بررسی کنید.`
        )
      );
    }
  }

  let variant = 0;
  while (rows.length < target) {
    for (const city of CANONICAL_CITIES) {
      const districts = CITY_DISTRICTS[city.slug] ?? [city.title];
      const district = districts[variant % districts.length]!;
      for (const slug of REAL_ESTATE_LEAF_SLUGS) {
        if (rows.length >= target) break;
        const kind = slugToKind(slug);
        const deal = slug.includes('rent') ? 'اجاره' : slug.includes('sale') ? 'خرید' : 'خدمات';
        add(
          expertRow(
            `برای ${deal} ${kind} در ${district} ${city.title} چه نکاتی را بررسی کنم؟`,
            `برای ${deal} ${kind} در ${district} ${city.title}: اول استعلام سند و بدهی ساختمان، بعد مقایسه قیمت با ۳–۵ آگهی مشابه در همان محله، و در نهایت بازدید حضوری برای رطوبت، نور، و دسترسی. بودجه را منطقه‌ای تنظیم کنید؛ ${city.title} با شهرهای دیگر متفاوت است.`
          )
        );
        add(buildMultiTurnClarify(city.slug, city.title, district, slug, variant));
        variant += 1;
      }
    }
    variant += 1;
    if (variant > 50_000) break;
  }

  return rows.slice(0, target);
}

function toJsonl(rows: Row[]): string {
  return rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
}

function main(): void {
  const { target, holdout } = parseArgs();
  console.log(`Estate expert synth: target=${target} holdout=${holdout}`);

  const pool = generatePool(target + holdout);
  const holdoutRows = pool.slice(0, holdout);
  const trainRows = pool.slice(holdout, holdout + target);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(JSONL_PATH, toJsonl(trainRows), 'utf8');
  writeFileSync(HOLDOUT_PATH, toJsonl(holdoutRows), 'utf8');

  const manifest = {
    generatedAt: new Date().toISOString(),
    target,
    holdout,
    trainSize: trainRows.length,
    holdoutSize: holdoutRows.length,
    trainPath: JSONL_PATH,
    holdoutPath: HOLDOUT_PATH,
    expertQaTemplates: EXPERT_QA.length,
    cities: CANONICAL_CITIES.length,
  };
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(JSON.stringify(manifest, null, 2));
}

main();
