/**
 * Filing benchmark capture — screenshot external real-estate listing pages.
 * Run: npm run test:filing-benchmark-capture [-- --batch=1] [-- --only=zillow-detail] [-- --resume]
 */
import { chromium, type BrowserContext, type Page } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

type ViewportName = 'mobile' | 'desktop';

type BenchmarkSite = {
  id: string;
  market: 'global' | 'iran';
  label: string;
  url: string;
  viewports: ViewportName[];
  selectors?: { hero?: string; price?: string; gallery?: string };
  cookieDismiss?: string;
  rateLimitMs?: number;
  batch?: number;
};

type Manifest = {
  version: number;
  referenceFilingId?: string;
  sites: BenchmarkSite[];
};

type CaptureResult = {
  id: string;
  label: string;
  market: string;
  url: string;
  viewport: ViewportName;
  status: 'ok' | 'skipped' | 'error';
  error?: string;
  httpStatus?: number;
  screenshot?: string;
  heroScreenshot?: string;
  capturedAt: string;
};

const VIEWPORTS: Record<ViewportName, { width: number; height: number }> = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 900 },
};

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (key: string) => {
    const hit = args.find((a) => a.startsWith(`--${key}=`));
    return hit?.split('=').slice(1).join('=');
  };
  return {
    batch: get('batch') ? Number(get('batch')) : undefined,
    only: get('only')?.split(',').filter(Boolean),
    resume: args.includes('--resume'),
    outDir: get('out-dir'),
  };
}

async function loadManifest(): Promise<Manifest> {
  const raw = await readFile(path.join(process.cwd(), 'scripts/filing/benchmark-manifest.json'), 'utf8');
  return JSON.parse(raw) as Manifest;
}

async function loadExistingResults(outDir: string): Promise<CaptureResult[]> {
  const runPath = path.join(outDir, 'manifest-run.json');
  try {
    const raw = await readFile(runPath, 'utf8');
    const parsed = JSON.parse(raw) as { results?: CaptureResult[] };
    return parsed.results ?? [];
  } catch {
    return [];
  }
}

function alreadyCaptured(existing: CaptureResult[], id: string, viewport: ViewportName): boolean {
  return existing.some((r) => r.id === id && r.viewport === viewport && r.status === 'ok');
}

async function dismissCookies(page: Page, selector?: string) {
  if (!selector) return;
  try {
    const btn = page.locator(selector).first();
    if (await btn.isVisible({ timeout: 2500 })) {
      await btn.click({ timeout: 2000 });
      await page.waitForTimeout(500);
    }
  } catch {
    /* optional */
  }
}

async function captureSite(
  context: BrowserContext,
  site: BenchmarkSite,
  viewport: ViewportName,
  shotsDir: string
): Promise<CaptureResult> {
  const page = await context.newPage();
  const vp = VIEWPORTS[viewport];
  await page.setViewportSize(vp);

  const base: CaptureResult = {
    id: site.id,
    label: site.label,
    market: site.market,
    url: site.url,
    viewport,
    status: 'error',
    capturedAt: new Date().toISOString(),
  };

  try {
    const response = await page.goto(site.url, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });
    base.httpStatus = response?.status();

    if (response && (response.status() === 403 || response.status() === 429)) {
      base.status = 'skipped';
      base.error = `HTTP ${response.status()}`;
      return base;
    }

    await dismissCookies(page, site.cookieDismiss);
    await page.waitForTimeout(1500);

    const title = await page.title();
    if (/captcha|robot|blocked|access denied/i.test(title)) {
      base.status = 'skipped';
      base.error = 'captcha_or_block';
      return base;
    }

    const fullName = `${site.id}-${viewport}.png`;
    const fullPath = path.join(shotsDir, fullName);
    await page.screenshot({ path: fullPath, fullPage: false });
    base.screenshot = path.relative(process.cwd(), fullPath);

    const heroSel = site.selectors?.hero ?? site.selectors?.gallery;
    if (heroSel) {
      try {
        const hero = page.locator(heroSel).first();
        if (await hero.isVisible({ timeout: 3000 })) {
          const heroName = `${site.id}-${viewport}-hero.png`;
          const heroPath = path.join(shotsDir, heroName);
          await hero.screenshot({ path: heroPath });
          base.heroScreenshot = path.relative(process.cwd(), heroPath);
        }
      } catch {
        /* hero crop optional */
      }
    }

    base.status = 'ok';
    return base;
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err);
    return base;
  } finally {
    await page.close();
  }
}

export async function runFilingBenchmarkCapture(opts?: {
  batch?: number;
  only?: string[];
  resume?: boolean;
  outDir?: string;
}): Promise<{ outDir: string; ok: number; skipped: number; failed: number }> {
  const manifest = await loadManifest();
  const OUT_DIR =
    opts?.outDir ||
    process.env.FILING_BENCHMARK_OUT_DIR ||
    path.join(process.cwd(), 'reports', 'filing-benchmark', new Date().toISOString().slice(0, 19).replace(/:/g, ''));

  const shotsDir = path.join(OUT_DIR, 'external');
  await mkdir(shotsDir, { recursive: true });

  let sites = manifest.sites;
  if (opts?.batch != null) {
    sites = sites.filter((s) => (s.batch ?? 1) === opts.batch);
  }
  if (opts?.only?.length) {
    sites = sites.filter((s) => opts.only!.includes(s.id));
  }

  const existing = opts?.resume ? await loadExistingResults(OUT_DIR) : [];
  const results: CaptureResult[] = [...existing];

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: USER_AGENT,
    locale: 'en-US',
    extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8' },
  });

  for (const site of sites) {
    for (const viewport of site.viewports) {
      if (opts?.resume && alreadyCaptured(existing, site.id, viewport)) {
        console.log(`[skip] ${site.id} ${viewport} (resume)`);
        continue;
      }

      console.log(`[capture] ${site.label} (${site.id}) — ${viewport}`);
      const result = await captureSite(context, site, viewport, shotsDir);

      const idx = results.findIndex((r) => r.id === site.id && r.viewport === viewport);
      if (idx >= 0) results[idx] = result;
      else results.push(result);

      await writeFile(
        path.join(OUT_DIR, 'manifest-run.json'),
        JSON.stringify(
          {
            generatedAt: new Date().toISOString(),
            manifestVersion: manifest.version,
            summary: {
              ok: results.filter((r) => r.status === 'ok').length,
              skipped: results.filter((r) => r.status === 'skipped').length,
              failed: results.filter((r) => r.status === 'error').length,
            },
            results,
          },
          null,
          2
        ) + '\n'
      );

      await new Promise((r) => setTimeout(r, site.rateLimitMs ?? 3000));
    }
  }

  await context.close();
  await browser.close();

  const ok = results.filter((r) => r.status === 'ok').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'error').length;

  console.log(`\n[filing-benchmark-capture] ${ok} ok, ${skipped} skipped, ${failed} failed → ${OUT_DIR}`);
  return { outDir: OUT_DIR, ok, skipped, failed };
}

async function main() {
  const args = parseArgs();
  const { outDir, ok, failed } = await runFilingBenchmarkCapture(args);
  if (failed > 0) {
    console.warn(`[filing-benchmark-capture] ${failed} failures logged in ${outDir}/manifest-run.json (${ok} ok)`);
  }
  if (ok === 0 && failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
