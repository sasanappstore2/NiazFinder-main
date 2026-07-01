/**
 * Filing visual QA — screenshot local /f browse + detail surfaces.
 * Run: npm run test:filing-visual-qa  (requires Next on :3000)
 */
import { chromium, type Page } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const REF_FILING_ID =
  process.env.FILING_QA_REF_ID || 'cmqw3dd5m0012s54wls83bgoe';

type ViewportName = 'mobile' | 'desktop' | 'tablet';

type Scenario = {
  id: string;
  label: string;
  path: string;
  viewports: ViewportName[];
  setup?: (page: Page) => Promise<void>;
};

const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 900 },
};

const SCENARIOS: Scenario[] = [
  {
    id: 'browse-default',
    label: 'فایلینگ — مرور پیش‌فرض',
    path: '/f',
    viewports: ['mobile', 'desktop'],
  },
  {
    id: 'browse-filtered',
    label: 'فایلینگ — با فیلتر',
    path: '/f',
    viewports: ['mobile', 'desktop'],
    setup: async (page) => {
      await page.waitForSelector('.filing-browse-page, .filing-browse-filter-rail', { timeout: 30_000 });
      const search = page.locator('input[aria-label="جستجو در فایلینگ"]');
      if (await search.isVisible()) {
        await search.fill('آپارتمان');
      }
      await page.waitForTimeout(800);
    },
  },
  {
    id: 'browse-sheet-open',
    label: 'فایلینگ — شیت فیلتر باز',
    path: '/f',
    viewports: ['mobile'],
    setup: async (page) => {
      await page.waitForSelector('.filing-browse-filter-rail', { timeout: 30_000 });
      const trigger = page.getByRole('button', { name: /فیلترها/i }).first();
      if (await trigger.isVisible()) {
        await trigger.click();
        await page.waitForTimeout(600);
      }
    },
  },
  {
    id: 'detail-ref',
    label: 'جزئیات فایل مرجع',
    path: `/f/${REF_FILING_ID}`,
    viewports: ['mobile', 'tablet', 'desktop'],
  },
  {
    id: 'detail-mobile',
    label: 'جزئیات — موبایل کامل',
    path: `/f/${REF_FILING_ID}`,
    viewports: ['mobile'],
    setup: async (page) => {
      await page.waitForSelector('.filing-detail-page', { timeout: 30_000 });
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(400);
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
];

async function dismissOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('needfinder-onboarding-seen', '1');
  });
}

async function resolveDetailPath(): Promise<string> {
  try {
    const res = await fetch(`${BASE}/api/filings/${REF_FILING_ID}`);
    if (res.ok) return `/f/${REF_FILING_ID}`;
  } catch {
    /* dev server may be down during import */
  }
  return `/f/${REF_FILING_ID}`;
}

export async function runFilingVisualQa(opts?: {
  outDir?: string;
  iterLabel?: string;
}): Promise<{ passed: number; failed: number; outDir: string }> {
  const OUT_DIR =
    opts?.outDir ||
    process.env.FILING_QA_OUT_DIR ||
    path.join(
      process.cwd(),
      'reports',
      'filing-benchmark',
      opts?.iterLabel || `local-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`
    );

  const shotsDir = path.join(OUT_DIR, 'local');
  await mkdir(shotsDir, { recursive: true });

  const detailPath = await resolveDetailPath();
  const scenarios = SCENARIOS.map((s) =>
    s.path.includes(REF_FILING_ID) ? { ...s, path: detailPath } : s
  );

  const browser = await chromium.launch({ headless: true });
  const results: Array<Record<string, unknown>> = [];

  for (const scenario of scenarios) {
    for (const viewport of scenario.viewports) {
      const page = await browser.newPage({ viewport: VIEWPORTS[viewport] });
      const issues: string[] = [];
      const loadStart = Date.now();

      await dismissOnboarding(page);

      try {
        const response = await page.goto(`${BASE}${scenario.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });

        if (!response?.ok()) {
          issues.push(`HTTP ${response?.status() ?? 'unknown'}`);
        }

        if (scenario.setup) {
          await scenario.setup(page);
        } else {
          await page.waitForTimeout(1200);
        }

        if (scenario.id.startsWith('detail')) {
          const hasCard = (await page.locator('.filing-detail-page .box.file').count()) > 0;
          if (!hasCard) issues.push('detail card missing');
        }

        if (scenario.id.startsWith('browse')) {
          const hasList = (await page.locator('.filing-list-card.box-list, .filing-browse-empty').count()) > 0;
          if (!hasList) issues.push('browse results missing');
        }

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > doc.clientWidth + 2;
        });
        if (overflow) issues.push('horizontal overflow');

        const shotName = `${scenario.id}__${viewport}.png`;
        await page.screenshot({ path: path.join(shotsDir, shotName), fullPage: false });

        results.push({
          id: scenario.id,
          label: scenario.label,
          viewport,
          url: scenario.path,
          pass: issues.length === 0,
          issues,
          loadMs: Date.now() - loadStart,
          screenshot: path.relative(process.cwd(), path.join(shotsDir, shotName)),
        });
      } catch (err) {
        results.push({
          id: scenario.id,
          label: scenario.label,
          viewport,
          url: scenario.path,
          pass: false,
          issues: [err instanceof Error ? err.message : String(err)],
          loadMs: Date.now() - loadStart,
        });
      }

      await page.close();
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;

  await writeFile(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl: BASE,
        refFilingId: REF_FILING_ID,
        outDir: OUT_DIR,
        summary: { total: results.length, passed, failed },
        results,
      },
      null,
      2
    ) + '\n'
  );

  console.log(`\n[filing-visual-qa] ${passed}/${results.length} passed → ${OUT_DIR}`);
  return { passed, failed, outDir: OUT_DIR };
}

async function main() {
  const iter = process.argv.find((a) => a.startsWith('--iter='))?.split('=')[1];
  const { failed } = await runFilingVisualQa({ iterLabel: iter });
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
