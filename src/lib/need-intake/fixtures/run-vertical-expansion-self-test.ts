/**
 * Vertical expansion golden cases — services / personal-items / jobs
 * derived from live accuracy misses (reports/intake-live-accuracy-report.json).
 *
 * Run: NEED_INTAKE_LOC_SKIP_PRISMA=true npx tsx src/lib/need-intake/fixtures/run-vertical-expansion-self-test.ts
 */
import { createRequire } from 'node:module';

type Case = {
  id: string;
  text: string;
  expectSlug: string;
  acceptSlugs?: string[];
};

const CASES: Case[] = [
  {
    id: 'svc-locksmith',
    text: 'کلیدساز برای در آپارتمان',
    expectSlug: 'locksmith-repair',
    acceptSlugs: ['locksmith-repair', 'repairs'],
  },
  {
    id: 'svc-plumber',
    text: 'لوله‌کش برای رفع نشتی در تهران',
    expectSlug: 'plumbing',
    acceptSlugs: ['plumbing', 'repairs'],
  },
  {
    id: 'svc-cleaning',
    text: 'نظافت منزل در اهواز',
    expectSlug: 'cleaning',
  },
  {
    id: 'lost-phone-metro',
    text: 'گوشی‌ام را در مترو گم کردم',
    expectSlug: 'lost-found',
  },
  {
    id: 'motorcycle-honda',
    text: 'موتور هوندا در تبریز',
    expectSlug: 'motorcycle',
  },
  {
    id: 'clinic-rent',
    text: 'کلینیک دندانپزشکی برای اجاره',
    expectSlug: 'office-rent',
    acceptSlugs: ['office-rent', 'shop-rent', 'apartment-rent'],
  },
  {
    id: 'personal-bag',
    text: 'کیف چرم زنانه دست دوم می‌خوام',
    expectSlug: 'clothing',
    acceptSlugs: ['clothing', 'personal-items', 'bags-shoes', 'bags'],
  },
  {
    id: 'job-it',
    text: 'استخدام برنامه‌نویس فرانت در تهران',
    expectSlug: 'it',
    acceptSlugs: ['it', 'programming', 'jobs'],
  },
];

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function stubServerOnly(): void {
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = {
    id: p,
    filename: p,
    loaded: true,
    exports: {},
  } as NodeModule;
}

async function main() {
  stubServerOnly();
  const { runCategoryIntentEngine } = await import(
    '@/intake/intelligence-engine/category/category-intent-engine'
  );

  let passed = 0;
  const failures: string[] = [];

  for (const c of CASES) {
    const result = await runCategoryIntentEngine({ text: c.text });
    const leaf =
      result.match?.subcategorySlug ?? result.match?.categorySlug ?? '';
    const accepted = new Set([c.expectSlug, ...(c.acceptSlugs ?? [])]);
    if (accepted.has(leaf)) {
      passed += 1;
      continue;
    }
    failures.push(
      `${c.id}: got=${leaf || '(empty)'} expected=${c.expectSlug} method=${result.method}`
    );
  }

  console.log(`vertical-expansion: ${passed}/${CASES.length}`);
  if (failures.length) {
    for (const f of failures) console.log(' -', f);
  }
  assert(passed >= Math.ceil(CASES.length * 0.5), `pass rate too low: ${passed}/${CASES.length}`);
  console.log('vertical-expansion self-test: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
