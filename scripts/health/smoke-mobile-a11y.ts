/**
 * Mobile UX + basic a11y smoke — viewport overflow and touch/label checks.
 * Run: npm run smoke:mobile-a11y
 * Requires app at SMOKE_BASE_URL (default http://localhost:3000).
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';

const MOBILE_VIEWPORT = { width: 375, height: 812 } as const;

const PATHS = ['/', '/post', '/browse', '/chat', '/n', '/dashboard'] as const;

type PageAudit = {
  path: string;
  overflow: boolean;
  emptyIconButtons: number;
  smallTouchTargets: number;
  missingH1: boolean;
};

async function auditPath(path: string): Promise<PageAudit & { error?: string }> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(900);

    const result = await page.evaluate(() => {
      const main = document.getElementById('main-content');
      const el = main ?? document.documentElement;
      const overflow = el.scrollWidth > el.clientWidth + 1;

      let emptyIconButtons = 0;
      let smallTouchTargets = 0;

      document.querySelectorAll('button').forEach((btn) => {
        const label = (btn.textContent ?? '').trim() || btn.getAttribute('aria-label') || '';
        const hasIcon = Boolean(btn.querySelector('svg, img'));
        if (!label && hasIcon) emptyIconButtons += 1;

        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && (rect.width < 40 || rect.height < 40)) {
          smallTouchTargets += 1;
        }
      });

      const h1 = document.querySelector('h1');
      const missingH1 = !((h1?.textContent ?? '').trim());

      return { overflow, emptyIconButtons, smallTouchTargets, missingH1 };
    });

    return { path, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path,
      overflow: true,
      emptyIconButtons: 0,
      smallTouchTargets: 0,
      missingH1: false,
      error: message,
    };
  } finally {
    await page.close();
    await browser.close();
  }
}

async function main() {
  console.log('=== smoke:mobile-a11y ===');
  console.log(`Base: ${BASE}  Viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}`);

  const failures: string[] = [];
  let passed = 0;

  for (const path of PATHS) {
    const audit = await auditPath(path);
    if (audit.error) {
      failures.push(`${path}: ${audit.error}`);
      console.log(`FAIL ${path} — ${audit.error}`);
      continue;
    }

    const issues: string[] = [];
    if (audit.overflow) issues.push('horizontal overflow');
    if (audit.emptyIconButtons > 0) {
      issues.push(`${audit.emptyIconButtons} icon button(s) without aria-label`);
    }

    if (issues.length > 0) {
      failures.push(`${path}: ${issues.join('; ')}`);
      console.log(`FAIL ${path} — ${issues.join('; ')}`);
    } else {
      passed += 1;
      console.log(
        `OK   ${path} (small targets info: ${audit.smallTouchTargets}, h1: ${audit.missingH1 ? 'hidden only' : 'ok'})`
      );
    }
  }

  console.log(`\nPassed: ${passed}/${PATHS.length}`);
  if (failures.length > 0) {
    console.error('\nFailures:');
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
