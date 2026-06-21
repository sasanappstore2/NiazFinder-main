/**
 * Viewport overflow guard — assert #main-content has no horizontal overflow.
 * Run: npm run smoke:viewport-overflow
 * Requires app at SMOKE_BASE_URL (default http://localhost:3000).
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 640, height: 900 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
] as const;

const PATHS = [
  '/',
  '/b/iran?type=business',
  '/post',
  '/post-need',
  '/browse',
  '/chat',
  '/search',
  '/dashboard',
] as const;

type OverflowResult = {
  target: string;
  overflow: boolean;
  scrollWidth: number;
  clientWidth: number;
};

async function measureOverflow(
  path: string,
  width: number,
  height: number
): Promise<OverflowResult & { error?: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setViewportSize({ width, height });
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      const el = main ?? document.documentElement;
      const target = main ? '#main-content' : 'documentElement';
      const scrollWidth = el.scrollWidth;
      const clientWidth = el.clientWidth;
      return {
        target,
        overflow: scrollWidth > clientWidth + 1,
        scrollWidth,
        clientWidth,
      };
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      target: '#main-content',
      overflow: true,
      scrollWidth: 0,
      clientWidth: 0,
      error: message,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  const failures: string[] = [];
  let passed = 0;

  console.log('=== smoke:viewport-overflow ===');
  console.log(`base: ${BASE}`);

  for (const path of PATHS) {
    for (const vp of VIEWPORTS) {
      const label = `${path} @ ${vp.width}×${vp.height}`;
      const result = await measureOverflow(path, vp.width, vp.height);

      if (result.error) {
        failures.push(`${label}: navigation error — ${result.error}`);
        console.log(`✗ ${label} (error)`);
        continue;
      }

      if (result.overflow) {
        failures.push(
          `${label} (${result.target}): scrollWidth=${result.scrollWidth} > clientWidth=${result.clientWidth}`
        );
        console.log(`✗ ${label}`);
      } else {
        passed += 1;
        console.log(`✓ ${label}`);
      }
    }
  }

  console.log(`\nPassed: ${passed}/${PATHS.length * VIEWPORTS.length}`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log('All viewport overflow checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
