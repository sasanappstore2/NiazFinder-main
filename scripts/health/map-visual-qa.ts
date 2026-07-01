/**
 * Map visual QA — browse surfaces, themes, zoom levels, screenshots.
 * Run: npm run test:map-visual-qa  (requires Next on :3000)
 */
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const OUT_DIR =
  process.env.MAP_QA_OUT_DIR ||
  path.join(process.cwd(), 'reports', `map-qa-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}`);

type Theme = 'light' | 'dark';

type Scenario = {
  id: string;
  label: string;
  url: string;
  mapSelector?: string;
};

const SCENARIOS: Scenario[] = [
  { id: 'biz-national', label: 'کسب‌وکار — ایران (ملی)', url: '/b/iran?type=business&view=map' },
  { id: 'biz-mashhad', label: 'کسب‌وکار — مشهد', url: '/b/mashhad?type=business&view=map' },
  { id: 'need-national', label: 'نیاز — ایران (ملی)', url: '/n/iran?view=map' },
  { id: 'need-tehran', label: 'نیاز — تهران', url: '/n/tehran?view=map' },
  { id: 'post-picker', label: 'ثبت نیاز — انتخاب موقعیت', url: '/post' },
];

const ZOOM_LEVELS: Array<number | 'auto'> = ['auto', 5, 7, 10, 13];

async function setTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.addInitScript((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
  }, theme);
}

async function dismissOnboarding(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('needfinder-onboarding-seen', '1');
  });
}

async function waitForMap(page: Page, timeoutMs = 90_000): Promise<{ ok: boolean; reason?: string }> {
  try {
    await page.waitForSelector('.iran-divar-map .maplibregl-canvas, .business-browse-map .maplibregl-canvas', {
      timeout: timeoutMs,
    });
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-map-ready="true"]');
        return Boolean(el);
      },
      { timeout: timeoutMs }
    );
    return { ok: true };
  } catch {
    const hasCanvas = (await page.locator('.maplibregl-canvas').count()) > 0;
    return { ok: false, reason: hasCanvas ? 'map_not_ready' : 'no_canvas' };
  }
}

async function zoomTo(page: Page, level: number): Promise<boolean> {
  return page.evaluate((z) => {
    const canvas = document.querySelector('.maplibregl-canvas') as HTMLElement & { _map?: { setZoom: (z: number) => void; getZoom: () => number } };
    const map = (canvas as unknown as { _map?: { setZoom: (z: number) => void; getZoom: () => number } })?._map;
    if (!map?.setZoom) return false;
    map.setZoom(z);
    return true;
  }, level);
}

export async function runMapVisualQa(): Promise<{ passed: number; failed: number; outDir: string }> {
  const shotsDir = path.join(OUT_DIR, 'screenshots');
  await mkdir(shotsDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results: Array<Record<string, unknown>> = [];

  for (const scenario of SCENARIOS) {
    for (const theme of ['light', 'dark'] as Theme[]) {
      for (const zoomLevel of ZOOM_LEVELS) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const tileStats = { vector200: 0, vectorFail: 0, glyph200: 0, glyphFail: 0, firstTileMs: null as number | null };
        const tileStart = Date.now();
        let firstTile = false;

        page.on('response', (res) => {
          const u = res.url();
          if (u.includes('/api/map/vector/iran/')) {
            if (res.ok()) tileStats.vector200 += 1;
            else tileStats.vectorFail += 1;
            if (!firstTile) {
              firstTile = true;
              tileStats.firstTileMs = Date.now() - tileStart;
            }
          }
          if (u.includes('/api/map/glyphs/')) {
            if (res.ok()) tileStats.glyph200 += 1;
            else tileStats.glyphFail += 1;
          }
        });

        await dismissOnboarding(page);
        await setTheme(page, theme);

        const issues: string[] = [];
        const loadStart = Date.now();
        await page.goto(`${BASE}${scenario.url}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });

        let mapWait: { ok: boolean; reason?: string } = { ok: false, reason: 'skipped' };

        if (scenario.id === 'post-picker') {
          await page.waitForTimeout(1500);
          issues.push('نقشه intake نیاز به تکمیل مراحل قبلی دارد');
        } else {
          mapWait = await waitForMap(page, 90_000);
          if (!mapWait.ok) {
            issues.push('نقشه لود نشد (timeout)');
            issues.push(`نقشه آماده نیست: ${mapWait.reason}`);
          }

          if (zoomLevel !== 'auto') {
            const zoomed = await zoomTo(page, zoomLevel);
            if (!zoomed) issues.push(`zoomTo(${zoomLevel}) ناموفق`);
            await page.waitForTimeout(1500);
          }

          if (tileStats.vector200 === 0) {
            issues.push('هیچ vector tile 200 دریافت نشد');
          }
        }

        const mapZoom = await page.evaluate(() => {
          const el = document.querySelector('[data-map-zoom]');
          if (el instanceof HTMLElement && el.dataset.mapZoom) {
            return Number.parseFloat(el.dataset.mapZoom);
          }
          const canvas = document.querySelector('.maplibregl-canvas') as HTMLElement & {
            _map?: { getZoom: () => number };
          };
          return canvas?._map?.getZoom() ?? null;
        });

        const shotName = `${scenario.id}__${theme}${zoomLevel === 'auto' ? '' : `__z${zoomLevel}`}.png`;
        await page.screenshot({ path: path.join(shotsDir, shotName), fullPage: false });

        const pass = scenario.id === 'post-picker' ? true : issues.length === 0;
        results.push({
          id: scenario.id,
          theme,
          zoomLevel,
          label: scenario.label,
          url: scenario.url,
          pass,
          issues,
          loadMs: Date.now() - loadStart,
          mapZoom,
          canvas: { ok: mapWait.ok, mapReady: mapWait.ok, reason: mapWait.reason },
          tiles: tileStats,
          screenshot: path.relative(process.cwd(), path.join(shotsDir, shotName)),
        });

        await page.close();
      }
    }
  }

  await browser.close();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const summary = { total: results.length, passed, failed };

  await writeFile(
    path.join(OUT_DIR, 'report.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE, outDir: OUT_DIR, summary, results }, null, 2) + '\n'
  );

  const md = [
    `# Map Visual QA`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    ``,
    `**${passed}/${results.length} passed**`,
    ``,
    `| Scenario | Theme | Zoom | Pass | Issues |`,
    `|----------|-------|------|------|--------|`,
    ...results.map((r) => {
      const issues = (r.issues as string[]).join('<br>') || '—';
      return `| ${r.label} | ${r.theme} | ${r.zoomLevel} | ${r.pass ? '✅' : '❌'} | ${issues} |`;
    }),
  ].join('\n');
  await writeFile(path.join(OUT_DIR, 'REPORT.md'), md + '\n');

  console.log(`\n[map-visual-qa] ${passed}/${results.length} passed → ${OUT_DIR}`);
  return { passed, failed, outDir: OUT_DIR };
}

async function main(): Promise<void> {
  const { failed } = await runMapVisualQa();
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
