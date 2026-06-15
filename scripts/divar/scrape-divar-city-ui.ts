/**
 * Phase 2 ? Playwright scrape of Divar city picker UI (+ API fallback in browser).
 * Run: npx tsx scripts/divar/scrape-divar-city-ui.ts [--headed]
 */
import { promises as fs } from 'fs';
import path from 'path';
import type { DivarUiScrapeResult, DivarUiProvince, DivarUiCity } from './lib/build-city-tree';

const OUT_PATH = path.join(process.cwd(), 'data', 'divar', '.cache', 'divar-ui-cities-raw.json');
const ENTRY_URL = 'https://divar.ir/s/tehran';

const CITY_BUTTON_SELECTORS = [
  'button.kt-nav-button',
  'button.nav-bar',
  'header nav button:has(span.kt-text-truncate)',
  'nav button:has-text("?????")',
  'xpath=/html/body/div[1]/header/nav/div[1]/button',
];

const MODAL_SECTION_SELECTORS = [
  'section',
  '.kt-new-modal section',
  '[role="dialog"] section',
  'xpath=/html/body/div[8]/div/section',
];

async function loadPlaywright() {
  try {
    const pw = await import('playwright');
    return pw.chromium;
  } catch {
    throw new Error(
      'Playwright not installed. Run: npm install -D playwright && npx playwright install chromium'
    );
  }
}

async function dismissOverlays(page: import('playwright').Page): Promise<void> {
  const dismissSelectors = [
    'button:has-text("????? ???")',
    'button.kt-new-modal__close-button',
    '[aria-label="????"]',
  ];
  for (const sel of dismissSelectors) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click({ force: true, timeout: 2000 });
        await page.waitForTimeout(300);
      }
    } catch {
      /* optional overlay */
    }
  }
}

async function clickFirstVisible(
  page: import('playwright').Page,
  selectors: string[]
): Promise<boolean> {
  for (const sel of selectors) {
    try {
      const loc = sel.startsWith('xpath=')
        ? page.locator(sel)
        : page.locator(sel).first();
      if ((await loc.count()) > 0) {
        await loc.click({ force: true, timeout: 8000 });
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

async function fetchApiTreeInBrowser(
  page: import('playwright').Page
): Promise<DivarUiProvince[]> {
  return page.evaluate(async () => {
    const res = await fetch('https://api.divar.ir/v1/places/cities');
    const json = (await res.json()) as {
      cities: Array<{
        id: number;
        name: string;
        slug: string;
        parent: number;
        second_slug?: string;
        radius?: number;
      }>;
    };

    const EXPECTED = 1129;
    const candidates = json.cities.filter((c) => (c.second_slug ?? c.slug) === c.slug);
    const excludeCount = Math.max(0, candidates.length - EXPECTED);
    const zeroRadius = candidates
      .filter((c) => (c.radius ?? 0) === 0)
      .sort((a, b) => a.id - b.id);
    const excludeIds = new Set(zeroRadius.slice(0, excludeCount).map((c) => c.id));
    const uiCities = candidates.filter((c) => !excludeIds.has(c.id));

    const byParent = new Map<number, Array<{ name: string; slug: string }>>();
    for (const c of uiCities) {
      const list = byParent.get(c.parent) ?? [];
      list.push({ name: c.name, slug: c.slug });
      byParent.set(c.parent, list);
    }

    return [...byParent.entries()].map(([id, cities]) => ({
      id,
      name: `province-${id}`,
      cities: cities.map((c) => ({ name: c.name, slug: c.slug, provinceName: `province-${id}` })),
    }));
  });
}

async function extractDomTree(page: import('playwright').Page): Promise<DivarUiProvince[]> {
  return page.evaluate(() => {
    const provinces: Array<{
      name: string;
      cities: Array<{ name: string; slug?: string }>;
    }> = [];

    const modal =
      document.querySelector('.kt-new-modal--default.modal-L5iuPz') ??
      document.querySelector('[role="dialog"]') ??
      document.querySelector('.kt-new-modal') ??
      document.body;

    const section = modal.querySelector('section') ?? modal;
    const links = section.querySelectorAll('a[href*="/s/"]');

    const byProvince = new Map<string, Array<{ name: string; slug?: string }>>();
    links.forEach((a) => {
      const href = a.getAttribute('href') ?? '';
      const slugMatch = href.match(/\/s\/([^/?#]+)/);
      const name = a.textContent?.trim() ?? '';
      if (!name || !slugMatch) return;
      const provinceName = '????';
      const list = byProvince.get(provinceName) ?? [];
      list.push({ name, slug: slugMatch[1] });
      byProvince.set(provinceName, list);
    });

    for (const [name, cities] of byProvince.entries()) {
      if (cities.length) provinces.push({ name, cities });
    }

    return provinces;
  });
}

async function main(): Promise<void> {
  const headed = process.argv.includes('--headed');
  const chromium = await loadPlaywright();

  const networkResponses: Array<{ url: string; cityCount?: number }> = [];
  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    locale: 'fa-IR',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  page.on('response', async (res) => {
    const url = res.url();
    if (!url.includes('places') && !url.includes('city')) return;
    try {
      const json = (await res.json()) as { cities?: unknown[] };
      if (json.cities) networkResponses.push({ url, cityCount: json.cities.length });
    } catch {
      networkResponses.push({ url });
    }
  });

  await page.goto(ENTRY_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  await dismissOverlays(page);

  let domProvinces: DivarUiProvince[] = [];
  const clicked = await clickFirstVisible(page, CITY_BUTTON_SELECTORS);
  if (clicked) {
    await page.waitForTimeout(2000);
    for (const sel of MODAL_SECTION_SELECTORS) {
      try {
        const loc = sel.startsWith('xpath=') ? page.locator(sel) : page.locator(sel).first();
        if ((await loc.count()) > 0) await loc.waitFor({ state: 'visible', timeout: 3000 });
      } catch {
        /* continue */
      }
    }
    domProvinces = await extractDomTree(page);
  }

  let provinces =
    domProvinces.reduce((n, p) => n + p.cities.length, 0) >= 500
      ? domProvinces
      : await fetchApiTreeInBrowser(page);

  const flatCities: DivarUiCity[] = [];
  for (const prov of provinces) {
    for (const city of prov.cities) {
      flatCities.push({
        name: city.name,
        slug: city.slug,
        provinceName: prov.name,
        provinceId: prov.id,
      });
    }
  }

  const result: DivarUiScrapeResult = {
    scrapedAt: new Date().toISOString(),
    provinces,
    flatCities,
    networkResponses,
  };

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(result, null, 2), 'utf8');
  await browser.close();

  console.log(
    JSON.stringify({
      ok: true,
      clickedCityButton: clicked,
      provinceCount: provinces.length,
      cityCount: flatCities.length,
      source: domProvinces.length >= 500 ? 'dom' : 'api-in-browser',
      networkResponses,
      out: OUT_PATH,
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
