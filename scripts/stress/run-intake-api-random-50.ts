/**
 * End-to-end intake smoke test with realistic, randomly composed Persian needs.
 * It calls the same /api/intake/analyze endpoint used by the browser and
 * prints the canonical fields returned for every case.
 *
 * Run:
 *   npx --yes tsx scripts/stress/run-intake-api-random-50.ts
 *   npx --yes tsx scripts/stress/run-intake-api-random-50.ts --force-ai
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.INTAKE_TEST_BASE_URL?.trim() || 'http://localhost:3000';
const DEFAULT_COUNT = 50;
const CONCURRENCY = 4;
const REQUEST_TIMEOUT_MS = 90_000;

type Scenario = 'sale' | 'rent' | 'service' | 'vehicle' | 'job' | 'electronics';

interface NeedCase {
  id: number;
  scenario: Scenario;
  text: string;
  city: string;
  citySlug: string;
  categoryHint: string;
}

interface AnalyzeResponse {
  schemaVersion?: number;
  requestId?: string;
  entities?: Record<string, unknown>;
  fields?: Array<{ key?: string; value?: unknown; source?: string }>;
  meta?: { aiInvoked?: boolean; analysisMode?: string; latencyMs?: number };
  error?: string;
}

interface CaseResult {
  id: number;
  scenario: Scenario;
  text: string;
  cityHint: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  aiInvoked: boolean;
  fields: Record<string, unknown>;
  fieldKeys: string[];
  issues: string[];
  error?: string;
}

const cities = [
  { name: 'تهران', slug: 'tehran', neighborhoods: ['ونک', 'نیاوران', 'سعادت آباد', 'جردن', 'تهرانپارس'] },
  { name: 'مشهد', slug: 'mashhad', neighborhoods: ['سجاد', 'احمدآباد', 'وکیل آباد', 'الهیه', 'قاسم آباد'] },
  { name: 'اصفهان', slug: 'isfahan', neighborhoods: ['مرداویج', 'چهارباغ', 'سپاهان شهر', 'ملک شهر', 'خانه اصفهان'] },
  { name: 'شیراز', slug: 'shiraz', neighborhoods: ['معالی آباد', 'فرهنگ شهر', 'قصردشت', 'عفیف آباد', 'صدرا'] },
  { name: 'تبریز', slug: 'tabriz', neighborhoods: ['ولیعصر', 'ائل گلی', 'آبرسان', 'رشدیه', 'منظریه'] },
  { name: 'کرج', slug: 'karaj', neighborhoods: ['عظیمیه', 'جهانشهر', 'مهرشهر', 'گوهردشت', 'گلشهر'] },
] as const;

const properties = ['آپارتمان', 'دفتر کار', 'مغازه', 'ویلا', 'ملک اداری'];
const uses = ['سکونت', 'راه‌اندازی دفتر وکالت', 'مزون', 'دفتر معماری', 'فروشگاه'];
const conditions = ['نورگیر باشد', 'پارکینگ داشته باشد', 'بر خیابان اصلی باشد', 'سند تک‌برگ داشته باشد'];
const services = ['تعمیر کولر گازی', 'لوله‌کشی آشپزخانه', 'نقاشی کامل خانه', 'اسباب‌کشی', 'نصب دوربین مداربسته'];
const cars = ['سمند سورن', 'پژو ۲۰۷', 'دنا پلاس', 'تارا اتوماتیک', 'هیوندای اکسنت'];
const jobs = ['حسابدار', 'طراح گرافیک', 'منشی مطب', 'برنامه‌نویس فرانت‌اند', 'کارشناس فروش'];
const devices = ['آیفون ۱۳', 'لپ‌تاپ لنوو', 'دوربین کانن', 'تلویزیون ۵۵ اینچ', 'تبلت سامسونگ'];

function parseArgs(): { count: number; forceAi: boolean } {
  let count = DEFAULT_COUNT;
  let forceAi = false;
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--force-ai') forceAi = true;
    if (args[i] === '--count' && args[i + 1]) {
      count = Math.max(1, Number(args[i + 1]) || DEFAULT_COUNT);
      i += 1;
    }
  }
  return { count, forceAi };
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function faDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]!);
}

function createNeed(id: number): NeedCase {
  const city = pick(cities);
  const neighborhood = pick(city.neighborhoods);
  const scenario = pick<Scenario>(['sale', 'rent', 'service', 'vehicle', 'job', 'electronics']);
  const area = randomInt(55, 310);
  const categoryHint = scenario === 'sale' || scenario === 'rent' ? 'services' : scenario === 'vehicle' ? 'vehicles' : scenario === 'job' ? 'jobs' : scenario === 'electronics' ? 'electronics' : 'services';

  let text: string;
  if (scenario === 'sale') {
    const budget = randomInt(4, 85);
    text = `یک ${pick(properties)} ${faDigits(area)} متری برای ${pick(uses)} در ${neighborhood} ${city.name} می‌خواهم؛ بودجه‌ام حدود ${faDigits(budget)} میلیارد تومان است و ${pick(conditions)}.`;
  } else if (scenario === 'rent') {
    const deposit = randomInt(1, 18);
    const monthly = randomInt(15, 140);
    text = `برای ${pick(uses)} یک ${pick(properties)} ${faDigits(area)} متری در ${neighborhood} ${city.name} لازم دارم؛ ${faDigits(deposit)} میلیارد تومان رهن و ماهی ${faDigits(monthly)} میلیون اجاره می‌پردازم.`;
  } else if (scenario === 'service') {
    const urgency = pick(['امروز', 'این هفته', 'تا آخر ماه']);
    text = `برای ${pick(services)} در ${neighborhood} ${city.name} یک متخصص مطمئن می‌خواهم؛ کار باید ${urgency} انجام شود و قیمت منصفانه باشد.`;
  } else if (scenario === 'vehicle') {
    const budget = randomInt(350, 2200);
    text = `برای خرید ${pick(cars)} کم‌کارکرد در ${city.name} دنبال گزینه تمیز هستم؛ تا ${faDigits(budget)} میلیون تومان بودجه دارم و کارشناسی فنی می‌خواهم.`;
  } else if (scenario === 'job') {
    text = `در ${city.name} دنبال ${pick(jobs)} برای یک مجموعه کوچک هستم؛ همکاری ${pick(['تمام‌وقت', 'پاره‌وقت', 'حضوری'])} و شروع کار از ${pick(['هفته آینده', 'اول ماه بعد', 'همین ماه'])}.`;
  } else {
    const budget = randomInt(15, 180);
    text = `یک ${pick(devices)} ${pick(['تمیز و کم‌کارکرد', 'نو با گارانتی', 'دست‌دوم سالم'])} در ${city.name} می‌خواهم؛ بودجه تا ${faDigits(budget)} میلیون تومان دارم.`;
  }

  return { id, scenario, text, city: city.name, citySlug: city.slug, categoryHint };
}

function readFields(body: AnalyzeResponse): Record<string, unknown> {
  const entities = body.entities ?? {};
  const fields: Record<string, unknown> = {};
  for (const key of [
    'categorySlug',
    'subcategorySlug',
    'city',
    'citySlug',
    'neighborhood',
    'area',
    'budgetMin',
    'budgetMax',
    'rahnAmount',
    'monthlyRent',
    'deposit',
    'transactionType',
  ]) {
    if (entities[key] != null) fields[key] = entities[key];
  }
  return fields;
}

function validateCase(testCase: NeedCase, body: AnalyzeResponse, status: number, latencyMs: number): CaseResult {
  const entities = body.entities ?? {};
  const issues: string[] = [];
  const fields = readFields(body);
  const hasRentPayment = ['rahnAmount', 'monthlyRent', 'deposit'].some((key) => entities[key] != null);
  const neighborhood = entities.neighborhood;
  const categorySlug = typeof entities.categorySlug === 'string' ? entities.categorySlug : '';
  const transactionType = String(entities.transactionType ?? '');

  if (status !== 200) issues.push(`http_${status}`);
  if (body.schemaVersion !== 2) issues.push('schemaVersion!=2');
  if (entities.city !== testCase.city) issues.push('city_not_preserved');
  if (entities.citySlug !== testCase.citySlug) issues.push('citySlug_not_preserved');
  if (typeof entities.area === 'string') issues.push('area_is_string');
  if (entities.area != null && (!Number.isFinite(entities.area) || Number(entities.area) <= 0)) issues.push('area_invalid');
  if (typeof neighborhood === 'string' && /^[\d\s.,۰-۹]+$/u.test(neighborhood)) issues.push('neighborhood_contains_only_number');
  if (typeof neighborhood === 'string' && /متخصص|تعمیرکار|آینده|همین\s+ماه|اول\s+ماه/u.test(neighborhood)) issues.push('neighborhood_contains_non_location_tail');
  if (hasRentPayment && (entities.budgetMin != null || entities.budgetMax != null)) issues.push('rent_mapped_to_budget');
  if ((testCase.scenario === 'sale' || testCase.scenario === 'rent') && (!categorySlug || categorySlug === 'services')) issues.push('property_category_missing_or_root');
  if (testCase.scenario === 'sale') {
    if (transactionType !== 'BUY') issues.push('sale_transaction_not_buy');
    if (!categorySlug || /rent/u.test(categorySlug)) issues.push('sale_category_not_sale');
    if (entities.budgetMax == null) issues.push('sale_budget_missing');
  }
  if (testCase.scenario === 'rent') {
    if (!['RENT', 'DEPOSIT_AND_RENT'].includes(transactionType)) issues.push('rent_transaction_invalid');
    if (!hasRentPayment) issues.push('rent_payment_missing');
    if (!/rent/u.test(categorySlug)) issues.push('rent_category_invalid');
  }
  if ((testCase.scenario === 'job' || testCase.scenario === 'service') && entities.transactionType != null) {
    issues.push('non_asset_transaction_present');
  }
  if (testCase.scenario === 'electronics') {
    if (!categorySlug) issues.push('electronics_category_missing');
    if (/تلویزیون|ال[‌\s-]*ای[‌\s-]*دی|صوتی\s*و\s*تصویری/u.test(testCase.text) && categorySlug !== 'audio-video') {
      issues.push('tv_category_invalid');
    }
    if (/تبلت/u.test(testCase.text) && !/tablet|mobile-tablet/u.test(categorySlug)) {
      issues.push('tablet_category_invalid');
    }
    if (/آیفون|موبایل|گوشی/u.test(testCase.text) && !/mobile-phone|mobile-tablet/u.test(categorySlug)) {
      issues.push('phone_category_invalid');
    }
    if (/لپ[\u200c\s-]*تاپ/u.test(testCase.text) && !/laptop|computer/u.test(categorySlug)) {
      issues.push('laptop_category_invalid');
    }
    if (/دوربین/u.test(testCase.text) && categorySlug !== 'camera') {
      issues.push('camera_category_invalid');
    }
  }
  if ((testCase.scenario === 'sale' || testCase.scenario === 'rent') && entities.area == null) issues.push('property_area_missing');

  return {
    id: testCase.id,
    scenario: testCase.scenario,
    text: testCase.text,
    cityHint: testCase.city,
    ok: issues.length === 0,
    status,
    latencyMs,
    aiInvoked: Boolean(body.meta?.aiInvoked),
    fields,
    fieldKeys: (body.fields ?? []).map((field) => String(field.key ?? '')).filter(Boolean),
    issues,
    ...(body.error ? { error: body.error } : {}),
  };
}

async function analyze(testCase: NeedCase, forceAi: boolean): Promise<CaseResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}/api/intake/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        text: testCase.text,
        draftRevision: testCase.id,
        citySlug: testCase.citySlug,
        cityName: testCase.city,
        formHints: {
          categorySlug: testCase.categoryHint,
          city: testCase.city,
          cityLockedByUser: true,
        },
        ...(forceAi ? { forceAi: true } : {}),
      }),
    });
    const body = (await response.json().catch(() => ({}))) as AnalyzeResponse;
    return validateCase(testCase, body, response.status, Date.now() - startedAt);
  } catch (error) {
    return {
      id: testCase.id,
      scenario: testCase.scenario,
      text: testCase.text,
      cityHint: testCase.city,
      ok: false,
      status: 0,
      latencyMs: Date.now() - startedAt,
      aiInvoked: false,
      fields: {},
      fieldKeys: [],
      issues: ['request_failed'],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function main(): Promise<void> {
  const { count, forceAi } = parseArgs();
  const cases = Array.from({ length: count }, (_, index) => createNeed(index + 1));
  const results: CaseResult[] = [];

  console.log(`intake API random smoke | base=${BASE_URL} | cases=${count} | forceAi=${forceAi}`);
  for (let offset = 0; offset < cases.length; offset += CONCURRENCY) {
    const batch = cases.slice(offset, offset + CONCURRENCY);
    const batchResults = await Promise.all(batch.map((testCase) => analyze(testCase, forceAi)));
    results.push(...batchResults);
    for (const result of batchResults) {
      console.log(
        `${String(result.id).padStart(2, '0')} ${result.ok ? 'OK ' : 'ERR'} ${result.scenario.padEnd(11)} | ${JSON.stringify(result.fields)} | fields=${result.fieldKeys.join(',')} | ${result.issues.join(',') || '-'} | ${result.latencyMs}ms`,
      );
    }
  }

  const passed = results.filter((result) => result.ok).length;
  const aiInvoked = results.filter((result) => result.aiInvoked).length;
  const issueCounts: Record<string, number> = {};
  for (const result of results) {
    for (const issue of result.issues) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
  }
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    forceAi,
    total: results.length,
    passed,
    failed: results.length - passed,
    aiInvoked,
    issueCounts,
    results,
  };
  const reportDir = path.join(process.cwd(), 'reports');
  await mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `intake-api-random-${count}-${Date.now()}.json`);
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`summary: ${passed}/${results.length} passed; aiInvoked=${aiInvoked}; issues=${JSON.stringify(issueCounts)}`);
  console.log(`report: ${reportPath}`);
  if (passed !== results.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
