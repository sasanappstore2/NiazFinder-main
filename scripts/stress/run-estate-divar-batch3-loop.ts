/**
 * Estate Divar→Need batch-3 intake debugger.
 *
 * - Pulls Divar real-estate listing titles (or synthetic Divar-style fallbacks)
 * - One multi-ad LLM call converts 3 ads → 3 full one-paragraph Persian NEEDS
 *   covering category, deal, location, specs, budget, amenities
 * - Runs /api/intake/analyze for all 3 in parallel
 * - Validates wizard sections 1–4 + field coverage; logs bugs/learnings
 *
 * Usage:
 *   npm run test:estate-divar-batch3
 *   npm run test:estate-divar-batch3 -- --status
 *
 * Progress continues tmp/estate-intake-500/progress.json (from index 51+)
 */
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIVAR_REAL_ESTATE_CATEGORIES } from '../divar/categories';
import {
  extractJsonFromChatContent,
  localChatCompletions,
} from '@/lib/need-intake/local-chat-client';

const ROOT = process.cwd();
const DIR = join(ROOT, 'tmp/estate-intake-500');
const PROGRESS = join(DIR, 'progress.json');
const RESULTS = join(DIR, 'results.jsonl');
const BUGS = join(DIR, 'bugs.jsonl');
const LEARNINGS = join(DIR, 'learnings.md');
const DIVAR_CACHE = join(DIR, 'divar-titles-cache.json');
const TOTAL = 500;
const BATCH = 3;
const BASE = process.env.ESTATE_INTAKE_BASE_URL ?? 'http://127.0.0.1:3000';

mkdirSync(DIR, { recursive: true });

const CITIES = [
  { name: 'تهران', slug: 'tehran', hoods: ['ونک', 'سعادت‌آباد', 'پونک', 'جردن', 'نیاوران', 'تهرانپارس'] },
  { name: 'مشهد', slug: 'mashhad', hoods: ['هاشمیه', 'احمدآباد', 'سجاد', 'طلاب', 'قاسم‌آباد'] },
  { name: 'اصفهان', slug: 'isfahan', hoods: ['جلفا', 'ملک‌شهر', 'خانه اصفهان', 'خوراسگان'] },
  { name: 'شیراز', slug: 'shiraz', hoods: ['معالی‌آباد', 'زندیه', 'گلدشت', 'صدرا'] },
  { name: 'کرج', slug: 'karaj', hoods: ['گوهردشت', 'مهرشهر', 'عظیمیه', 'فردیس'] },
] as const;

interface Progress {
  nextIndex: number;
  completed: number;
  passed: number;
  failed: number;
  lastId: string | null;
  lastOk: boolean | null;
  updatedAt: string;
  mode?: string;
}

interface DivarAd {
  title: string;
  nfSlug: string;
  city: string;
  source: 'divar' | 'synthetic';
}

interface NeedSpec {
  index: number;
  id: string;
  text: string;
  expectLeaf: string[];
  cityHint: string;
  neighborhoodHint?: string;
  divarTitle: string;
}

interface SectionCheck {
  key: string;
  ok: boolean;
  notes: string[];
}

interface BatchItemResult {
  index: number;
  id: string;
  ok: boolean;
  text: string;
  divarTitle: string;
  sections: SectionCheck[];
  got: Record<string, unknown>;
  issues: string[];
  latencyMs: number;
  at: string;
}

function loadProgress(): Progress {
  if (!existsSync(PROGRESS)) {
    return {
      nextIndex: 51,
      completed: 0,
      passed: 0,
      failed: 0,
      lastId: null,
      lastOk: null,
      updatedAt: new Date().toISOString(),
      mode: 'divar-batch3',
    };
  }
  return JSON.parse(readFileSync(PROGRESS, 'utf8')) as Progress;
}

function saveProgress(p: Progress): void {
  p.updatedAt = new Date().toISOString();
  p.mode = 'divar-batch3';
  writeFileSync(PROGRESS, JSON.stringify(p, null, 2));
}

function decodeTitle(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
  } catch {
    return raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
  }
}

function isJunkDivarTitle(title: string): boolean {
  if (/تأیید|تایید|ورود|ثبت[\s-]?نام|دانلود|دارای عکس از ملک|لینک|مشاور املاک|^با\s/u.test(title)) {
    return true;
  }
  // Too generic / not a listing title
  if (/^(بازسازی شده|فوری|فروشی|اجاره‌?ای|سند دار|سنددار|خونه ویلایی|خانه ویلایی)$/u.test(title.trim())) {
    return true;
  }
  return false;
}

function extractTitlesFromHtml(html: string): string[] {
  const re = /"title":"((?:[^"\\]|\\.)*)"/g;
  const seen = new Set<string>();
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const title = decodeTitle(m[1]!).trim();
    if (title.length < 10 || title.length > 220) continue;
    if (title.includes('بروزرسانی') || title.includes('دانلود')) continue;
    if (isJunkDivarTitle(title)) continue;
    if (seen.has(title)) continue;
    seen.add(title);
    out.push(title);
  }
  return out;
}

async function fetchDivarTitles(citySlug: string, divarSlug: string): Promise<string[]> {
  const url = `https://divar.ir/s/${citySlug}/${divarSlug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'fa-IR,fa;q=0.9',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Divar HTTP ${res.status} ${url}`);
  return extractTitlesFromHtml(await res.text());
}

function syntheticDivarTitle(nfSlug: string, city: string, hood: string, i: number): string {
  const area = 70 + ((i * 19) % 250);
  const rooms = 1 + (i % 4);
  const rahn = 80 + ((i * 11) % 500);
  const rent = 8 + ((i * 5) % 45);
  const price = 3 + ((i * 7) % 40);
  switch (nfSlug) {
    case 'apartment-rent':
      return `اجاره آپارتمان ${rooms} خواب ${area} متری ${hood} ${city} رهن ${rahn} اجاره ${rent}`;
    case 'apartment-sale':
      return `فروش آپارتمان ${rooms} خواب ${area} متری ${hood} ${city} ${price} میلیارد`;
    case 'villa-rent':
      return `اجاره ویلا ${area} متری ${hood} ${city} رهن ${rahn} اجاره ${rent}`;
    case 'villa-sale':
      return `فروش ویلا و باغ ${area} متری ${hood} ${city} ${price} میلیارد`;
    case 'shop-rent':
      return `اجاره مغازه ${area} متری ${hood} ${city} رهن ${rahn} اجاره ${rent}`;
    case 'office-rent':
      return `اجاره دفتر کار ${area} متری ${hood} ${city} رهن ${rahn}`;
    case 'land-sale':
      return `فروش زمین ${area} متری ${hood} ${city} ${price} میلیارد`;
    case 'suite-apartment-rent':
      return `اجاره روزانه سوئیت ${area} متری ${hood} ${city} ${rent} میلیون شب`;
    case 'construction-partnership':
      return `مشارکت در ساخت زمین ${area} متری ${hood} ${city}`;
    default:
      return `آپارتمان ${area} متری ${hood} ${city}`;
  }
}

function loadDivarCache(): Record<string, string[]> {
  if (!existsSync(DIVAR_CACHE)) return {};
  try {
    return JSON.parse(readFileSync(DIVAR_CACHE, 'utf8')) as Record<string, string[]>;
  } catch {
    return {};
  }
}

function saveDivarCache(cache: Record<string, string[]>): void {
  writeFileSync(DIVAR_CACHE, JSON.stringify(cache, null, 2));
}

async function collectThreeAds(startIndex: number): Promise<DivarAd[]> {
  const cache = loadDivarCache();
  const ads: DivarAd[] = [];
  const cats = DIVAR_REAL_ESTATE_CATEGORIES.filter((c) =>
    [
      'apartment-rent',
      'apartment-sale',
      'villa-rent',
      'villa-sale',
      'shop-rent',
      'office-rent',
      'land-sale',
      'suite-apartment-rent',
    ].includes(c.nfSlug)
  );

  for (let k = 0; k < BATCH; k++) {
    const idx = startIndex + k;
    const city = CITIES[idx % CITIES.length]!;
    const cat = cats[idx % cats.length]!;
    const cacheKey = `${city.slug}:${cat.divarSlug}`;
    let titles = (cache[cacheKey] ?? []).filter((t) => !isJunkDivarTitle(t));

    if (titles.length < 3) {
      try {
        const fresh = await fetchDivarTitles(city.slug, cat.divarSlug);
        titles = [...new Set([...titles, ...fresh])].filter((t) => !isJunkDivarTitle(t));
        cache[cacheKey] = titles;
        saveDivarCache(cache);
        await new Promise((r) => setTimeout(r, 400));
      } catch {
        // keep synthetic
      }
    }

    const hood = city.hoods[idx % city.hoods.length]!;
    const usable = titles.filter((t) => !isJunkDivarTitle(t));
    if (usable.length > 0) {
      const title = usable[idx % usable.length]!;
      ads.push({ title, nfSlug: cat.nfSlug, city: city.name, source: 'divar' });
    } else {
      ads.push({
        title: syntheticDivarTitle(cat.nfSlug, city.name, hood, idx),
        nfSlug: cat.nfSlug,
        city: city.name,
        source: 'synthetic',
      });
    }
  }
  return ads;
}

async function convertThreeAdsToNeeds(
  ads: DivarAd[],
  startIndex: number
): Promise<NeedSpec[]> {
  const prompt = `تو تبدیل‌کننده آگهی دیوار به «نیاز» نیازفایندر هستی.
سه آگهی املاک زیر را بخوان و برای هر کدام دقیقاً یک پاراگراف فارسی محاوره‌ای بنویس که کاربر به‌عنوان نیاز می‌نویسد (دنبال ملک می‌گردد، نه فروشنده).

قوانین سخت معامله (بر اساس targetLeaf — نقض نکن):
- اگر targetLeaf شامل sale است (مثل villa-sale، apartment-sale، land-sale): حتماً «برای خرید» یا «می‌خرم» بنویس و بودجه را به میلیارد بگو. هرگز رهن/اجاره/ودیعه ننویس.
- اگر targetLeaf شامل rent است (مثل villa-rent، apartment-rent، shop-rent، office-rent): حتماً رهن و اجاره با عدد بنویس. هرگز خرید/فروش/می‌خرم/برای خرید ننویس.
- اگر suite-apartment-rent است: اجاره روزانه با عدد بنویس.

هر پاراگراف باید همه این بخش‌ها را پوشش دهد (حتی اگر عنوان دیوار ناقص بود، مقادیر معقول اختراع کن):
- نوع ملک و معامله مطابق targetLeaf (بالا)
- متراژ عددی مشخص (مثلاً ۱۲۰ متری) و تعداد خواب اگر مرتبط است
- شهر و محله واقعی کوتاه (۱–۳ کلمه؛ نه جمله مثل «شمال هستم»)
- بودجه رهن/اجاره یا قیمت خرید با عدد
- حداقل ۲ امکانات مناسب همان نوع ملک (آپارتمان: آسانسور/پارکینگ/انباری/بالکن؛ مغازه: ویترین؛ دفتر: لابی) — ویترین را فقط برای مغازه بنویس
- یک قید زمانی یا فوریت کوتاه

اگر عنوان دیوار بی‌معنی یا UI بود، از targetLeaf و city یک نیاز کامل بساز.

آگهی‌ها:
${ads
  .map(
    (a, i) =>
      `${i + 1}) title="${a.title}" | targetLeaf=${a.nfSlug} | city=${a.city} | source=${a.source}`
  )
  .join('\n')}

فقط JSON برگردان:
{"needs":[{"text":"...","expectLeaf":"${ads[0]?.nfSlug}","city":"...","neighborhood":"..."},{"text":"...","expectLeaf":"...","city":"...","neighborhood":"..."},{"text":"...","expectLeaf":"...","city":"...","neighborhood":"..."}]}`;

  const chat = await localChatCompletions(
    [
      {
        role: 'system',
        content:
          'تو متخصص املاک ایران هستی. فقط JSON معتبر فارسی برگردان؛ بدون markdown.',
      },
      { role: 'user', content: prompt },
    ],
    { maxTokens: 900, temperature: 0.55, maxRetries: 1 }
  );

  const parsed = chat
    ? (extractJsonFromChatContent(chat.content) as {
        needs?: Array<{
          text?: string;
          expectLeaf?: string;
          city?: string;
          neighborhood?: string;
        }>;
      } | null)
    : null;

  const needs: NeedSpec[] = [];
  for (let i = 0; i < BATCH; i++) {
    const ad = ads[i]!;
    const row = parsed?.needs?.[i];
    let text =
      row?.text?.trim() && row.text.trim().length >= 40
        ? row.text.trim()
        : fallbackParagraph(ad, startIndex + i);
    if (!textDealMatchesLeaf(text, ad.nfSlug)) {
      text = fallbackParagraph(ad, startIndex + i);
    }
    needs.push({
      index: startIndex + i,
      id: `divar-${String(startIndex + i).padStart(3, '0')}-${ad.nfSlug}`,
      text,
      expectLeaf: [ad.nfSlug, row?.expectLeaf ?? ad.nfSlug].filter(Boolean),
      cityHint: row?.city?.trim() || ad.city,
      neighborhoodHint: row?.neighborhood?.trim() || undefined,
      divarTitle: ad.title,
    });
  }
  return needs;
}

/** Reject LLM paragraphs that contradict targetLeaf deal type (e.g. رهن for villa-sale). */
function textDealMatchesLeaf(text: string, leaf: string): boolean {
  const rentish = /اجاره|اجاره‌ای|رهن|ودیعه|روزانه/u.test(text);
  const buyish = /برای خرید|می\s*خرم|میخرم|می‌خرم|خرید/u.test(text);
  const strongBuy = /برای خرید|دنبال خرید|می\s*خرم|میخرم|می‌خرم/u.test(text);
  if (leaf.includes('sale') || leaf.includes('partnership')) {
    if (rentish && !buyish) return false;
    return buyish || /میلیارد/u.test(text);
  }
  if (leaf.includes('rent')) {
    // Mixed "برای اجاره … می‌خرم" slips past rentish-only checks and flips intake to *-sale.
    if (!rentish || strongBuy) return false;
    return true;
  }
  return true;
}

function fallbackParagraph(ad: DivarAd, index: number): string {
  const city = CITIES[index % CITIES.length]!;
  const hood = city.hoods[index % city.hoods.length]!;
  const area = 85 + ((index * 17) % 200);
  const rooms = 1 + (index % 3);
  const rahn = 100 + ((index * 13) % 350);
  const rent = 10 + ((index * 7) % 35);
  const price = 5 + ((index * 9) % 30);
  const amen = ['آسانسور', 'پارکینگ', 'انباری', 'بالکن'][index % 4]!;
  const amen2 = ['طبقات بالا', 'لابی', 'نورگیر', 'نگهبانی'][index % 4]!;

  if (ad.nfSlug.includes('rent') && ad.nfSlug.includes('suite')) {
    return `دنبال سوئیت ${area} متری اجاره روزانه نزدیک ${hood} ${ad.city} هستم برای چند شب؛ حدود ${rent} میلیون هر شب؛ ${amen} و ${amen2} مهمه و زود لازم دارم.`;
  }
  if (ad.nfSlug.includes('shop')) {
    return `مغازه ${area} متری اجاره‌ای در ${hood} ${ad.city} می‌خوام؛ رهن حدود ${rahn} میلیون و اجاره ${rent} میلیون؛ ${amen} و ${amen2} داشته باشد؛ برای راه‌اندازی کسب‌وکار فوریه.`;
  }
  if (ad.nfSlug.includes('office')) {
    return `دفتر کار ${area} متری در ${hood} ${ad.city} اجاره می‌کنم؛ رهن ${rahn} میلیون اجاره ${rent} میلیون؛ ${amen} و ${amen2} لازم است؛ تا آخر ماه باید جمع شود.`;
  }
  if (ad.nfSlug.includes('villa') && ad.nfSlug.includes('sale')) {
    return `ویلا یا خانه ویلایی حدود ${area} متری در ${hood} ${ad.city} برای خرید تا ${price} میلیارد می‌خوام؛ ${amen} و ${amen2} و سند تک‌برگ؛ سریع تصمیم می‌گیرم.`;
  }
  if (ad.nfSlug.includes('villa')) {
    return `ویلای ${area} متری برای اجاره در ${hood} ${ad.city} می‌خوام؛ رهن ${rahn} میلیون اجاره ${rent} میلیون؛ ${amen} و ${amen2}؛ خانوادگی و فوری.`;
  }
  if (ad.nfSlug.includes('land') || ad.nfSlug.includes('partnership')) {
    return `زمین حدود ${area} متری در ${hood} ${ad.city} برای خرید یا مشارکت در ساخت تا ${price} میلیارد؛ کاربری مسکونی؛ ${amen2}؛ برای سرمایه‌گذاری.`;
  }
  if (ad.nfSlug.includes('sale')) {
    return `دنبال خرید آپارتمان ${rooms} خوابه حدود ${area} متری در ${hood} ${ad.city} هستم تا ${price} میلیارد؛ ${amen} و ${amen2}؛ بازدید این هفته.`;
  }
  return `من یک آپارتمان ${area} متری ${rooms} خوابه در ${hood} ${ad.city} می‌خوام؛ ${rahn} میلیون رهن و ${rent} میلیون اجاره دارم؛ ${amen} داشته باشد و ${amen2}؛ هرچه زودتر.`;
}

async function analyze(text: string): Promise<{ status: number; body: Record<string, unknown>; ms: number }> {
  const started = Date.now();
  const res = await fetch(`${BASE}/api/intake/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, forceAi: true }),
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body, ms: Date.now() - started };
}

function dig(obj: Record<string, unknown>, ...keys: string[]): unknown {
  let cur: unknown = obj;
  for (const k of keys) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

function evaluateFull(need: NeedSpec, status: number, body: Record<string, unknown>): BatchItemResult {
  const entities = (dig(body, 'entities') ?? {}) as Record<string, unknown>;
  const draft = (dig(body, 'draft') ?? {}) as Record<string, unknown>;
  const draftParsed = (dig(draft, 'parsedIntent') ?? {}) as Record<string, unknown>;
  const listing = (dig(draft, 'listingPreview') ?? {}) as Record<string, unknown>;
  const sectionsMeta = (dig(body, 'sections') ?? []) as Array<{ key?: string; label?: string }>;

  const categorySlug = String(
    dig(entities, 'categorySlug') ?? dig(draftParsed, 'categorySlug') ?? ''
  );
  const subcategorySlug = String(
    dig(entities, 'subcategorySlug') ?? dig(draftParsed, 'subcategorySlug') ?? ''
  );
  const leaf = subcategorySlug || categorySlug;
  const vertical = String(dig(entities, 'vertical') ?? dig(draftParsed, 'vertical') ?? '');
  const city = String(dig(entities, 'city') ?? dig(draftParsed, 'city') ?? '');
  const neighborhood = String(
    dig(entities, 'neighborhood') ?? dig(draftParsed, 'neighborhood') ?? ''
  );
  const area = dig(entities, 'area');
  const rooms = dig(entities, 'rooms');
  const title = String(dig(listing, 'title') ?? '');
  const description = String(dig(listing, 'description') ?? '');
  const candidates = (dig(body, 'categoryCandidates') ??
    dig(draftParsed, 'categoryCandidates') ??
    []) as unknown[];
  const fieldMeta = (dig(body, 'fieldMeta') ?? {}) as Record<string, unknown>;
  const missing = (dig(body, 'missingFields') ?? []) as unknown[];

  const got = {
    status,
    vertical,
    leaf,
    categorySlug,
    subcategorySlug,
    city,
    neighborhood,
    area,
    rooms,
    title: title.slice(0, 90),
    descLen: description.length,
    candidates: Array.isArray(candidates) ? candidates.length : 0,
    sectionKeys: sectionsMeta.map((s) => s.key).filter(Boolean),
    missingCount: Array.isArray(missing) ? missing.length : 0,
    fieldMetaKeys: Object.keys(fieldMeta).slice(0, 12),
  };

  const issues: string[] = [];
  const sections: SectionCheck[] = [];

  // 1 need
  const s1ok = status === 200 && need.text.length >= 40;
  sections.push({
    key: 'need',
    ok: s1ok,
    notes: [`len=${need.text.length}`, `divar=${need.divarTitle.slice(0, 40)}`],
  });
  if (!s1ok) issues.push('section:need');

  // 2 details / specs
  const s2notes: string[] = [];
  let s2ok = true;
  if (area == null || area === '') {
    // Require numeric area only when text states e.g. "120 متری" / "120 متر" (not bare "متراژ")
    if (/\d[\d۰-۹]*\s*متر/u.test(need.text) || /متری/u.test(need.text)) {
      s2ok = false;
      issues.push('section:details:area_missing');
      s2notes.push('area_missing');
    } else s2notes.push('area_optional');
  } else s2notes.push(`area=${area}`);
  if (/خواب/u.test(need.text) && rooms == null) s2notes.push('rooms_soft_missing');
  sections.push({ key: 'details', ok: s2ok, notes: s2notes });

  // 3 category + location
  const s3notes: string[] = [];
  let s3ok = true;
  const hintHit = need.expectLeaf.some(
    (h) => leaf === h || leaf.includes(h) || h.includes(leaf)
  );
  const estateish =
    /rent|sale|apartment|villa|shop|office|land|suite|partnership|residential|commercial|real-estate/u.test(
      leaf
    );
  if (!leaf) {
    s3ok = false;
    issues.push('section:location:no_leaf');
    s3notes.push('no_leaf');
  } else if (!hintHit && !estateish) {
    s3ok = false;
    issues.push(`section:location:wrong_leaf:${leaf}`);
    s3notes.push(`leaf=${leaf}`);
  } else if (!hintHit && estateish) {
    // rent/sale family check
    const wantRent = need.expectLeaf.some((h) => h.includes('rent'));
    const wantSale = need.expectLeaf.some((h) => h.includes('sale') || h.includes('land'));
    const wantApt = need.expectLeaf.some((h) => h.includes('apartment') || h.includes('suite'));
    const wantShop = need.expectLeaf.some((h) => h.includes('shop'));
    const wantOffice = need.expectLeaf.some((h) => h.includes('office'));
    const wantVilla = need.expectLeaf.some((h) => h.includes('villa'));
    if (wantRent && leaf.includes('sale') && !leaf.includes('rent')) {
      s3ok = false;
      issues.push(`section:location:rent_as_sale:${leaf}`);
    } else if (wantSale && leaf.includes('rent') && !leaf.includes('sale')) {
      s3ok = false;
      issues.push(`section:location:sale_as_rent:${leaf}`);
    } else if (wantApt && (leaf.includes('shop') || leaf.includes('office'))) {
      s3ok = false;
      issues.push(`section:location:apt_as_commercial:${leaf}`);
    } else if (wantShop && (leaf.includes('apartment') || leaf.includes('villa'))) {
      s3ok = false;
      issues.push(`section:location:shop_as_residential:${leaf}`);
    } else if (wantOffice && leaf.includes('apartment')) {
      s3ok = false;
      issues.push(`section:location:office_as_apt:${leaf}`);
    } else if (wantVilla && leaf.includes('apartment')) {
      s3ok = false;
      issues.push(`section:location:villa_as_apt:${leaf}`);
    } else s3notes.push(`leaf=${leaf} soft`);
  } else s3notes.push(`leaf=${leaf}`);

  if (need.cityHint && city && !city.includes(need.cityHint) && !need.cityHint.includes(city)) {
    issues.push(`section:location:city_mismatch_soft:${city}`);
    s3notes.push(`city=${city}`);
  } else if (need.cityHint && !city) {
    issues.push('section:location:city_missing_soft');
    s3notes.push('city_missing');
  } else if (city) s3notes.push(`city=${city}`);

  if (need.neighborhoodHint && neighborhood) {
    const amenityNb = /^(پارکینگ|آسانسور|انباری|بالکن|لابی|استخر)$/u.test(neighborhood);
    if (amenityNb) {
      issues.push(`section:location:amenity_as_neighborhood:${neighborhood}`);
      s3notes.push(`nb_amenity=${neighborhood}`);
    } else s3notes.push(`nb=${neighborhood}`);
  }
  sections.push({ key: 'location', ok: s3ok, notes: s3notes });

  // 4 preview
  const s4ok = Boolean(leaf || (Array.isArray(candidates) && candidates.length >= 2));
  sections.push({
    key: 'preview',
    ok: s4ok,
    notes: [title ? `title=${title.slice(0, 36)}` : 'no_title', `descLen=${description.length}`],
  });
  if (!s4ok) issues.push('section:preview');

  // 5 deal/budget section presence in response schema
  const hasDealSection = sectionsMeta.some(
    (s) => s.key === 'deal' || s.key === 'budget' || s.key === 'property-specs'
  );
  sections.push({
    key: 'schema_sections',
    ok: hasDealSection || sectionsMeta.length > 0,
    notes: [`keys=${got.sectionKeys.join(',') || 'none'}`, `missing=${got.missingCount}`],
  });

  const hard = issues.filter((i) => !i.includes('_soft'));
  const ok = sections.filter((s) => ['need', 'details', 'location', 'preview'].includes(s.key)).every((s) => s.ok) && hard.length === 0;

  return {
    index: need.index,
    id: need.id,
    ok,
    text: need.text,
    divarTitle: need.divarTitle,
    sections,
    got,
    issues,
    latencyMs: 0,
    at: new Date().toISOString(),
  };
}

async function runBatch(startIndex: number): Promise<BatchItemResult[]> {
  console.log(`\n=== Divar batch3 starting at index ${startIndex} ===`);
  const ads = await collectThreeAds(startIndex);
  for (const a of ads) {
    console.log(`  ad[${a.source}] ${a.nfSlug} @ ${a.city}: ${a.title.slice(0, 70)}`);
  }

  const needs = await convertThreeAdsToNeeds(ads, startIndex);
  for (const n of needs) {
    console.log(`  need#${n.index} len=${n.text.length}: ${n.text.slice(0, 80)}…`);
  }

  const analyzed = await Promise.all(needs.map((n) => analyze(n.text)));
  const results: BatchItemResult[] = [];
  const progress = loadProgress();

  for (let i = 0; i < needs.length; i++) {
    const need = needs[i]!;
    const { status, body, ms } = analyzed[i]!;
    const result = evaluateFull(need, status, body);
    result.latencyMs = ms;
    results.push(result);

    appendFileSync(RESULTS, `${JSON.stringify(result)}\n`);
    if (!result.ok || result.issues.length) {
      appendFileSync(BUGS, `${JSON.stringify(result)}\n`);
    }

    progress.completed += 1;
    if (result.ok) progress.passed += 1;
    else progress.failed += 1;
    progress.lastId = result.id;
    progress.lastOk = result.ok;
    progress.nextIndex = Math.max(progress.nextIndex, need.index + 1);

    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(
      `\n${mark} #${result.index} ${result.id} ${ms}ms leaf=${result.got.leaf} city=${result.got.city}`
    );
    for (const s of result.sections) {
      console.log(`  [${s.ok ? 'OK' : 'FAIL'}] ${s.key}: ${s.notes.join('; ')}`);
    }
    if (result.issues.length) console.log(`  issues: ${result.issues.join(' | ')}`);

    appendFileSync(
      LEARNINGS,
      `- #${result.index} ${result.id}: ${mark} leaf=${result.got.leaf} src="${result.divarTitle.slice(0, 50)}" issues=${result.issues.join(',') || '—'}\n`
    );
  }

  saveProgress(progress);
  console.log(
    `\nprogress: ${progress.completed}/~${TOTAL} next=${progress.nextIndex} pass=${progress.passed} fail=${progress.failed}`
  );
  return results;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--status')) {
    console.log(JSON.stringify(loadProgress(), null, 2));
    return;
  }

  try {
    const h = await fetch(`${BASE}/`);
    if (!h.ok && h.status >= 500) throw new Error(`base ${h.status}`);
  } catch (e) {
    console.error(`Server not reachable at ${BASE}`, e);
    process.exit(2);
  }

  let start = loadProgress().nextIndex;
  if (args.includes('--index') && args[args.indexOf('--index') + 1]) {
    start = Math.max(0, Number(args[args.indexOf('--index') + 1]) || start);
  }

  if (start >= TOTAL) {
    console.log(`DONE ${TOTAL}.`);
    process.exit(0);
  }

  const results = await runBatch(start);
  const allOk = results.every((r) => r.ok);
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
