import type { Page } from 'playwright';
import type { CrawlIssue } from './types';

const CONSOLE_NOISE = [
  /favicon\.ico/i,
  /webpack-hmr/i,
  /chrome-extension:/i,
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /sourceMappingURL/i,
  /turbopack/i,
  /hmr-client/i,
  /Failed to load chunk/i,
  /ERR_CONNECTION_REFUSED/i,
  /ERR_INCOMPLETE_CHUNKED_ENCODING/i,
  /status of 401 \(Unauthorized\)/i,
  /cannot have a negative time stamp/i,
  /Rendered more hooks than during the previous render/i,
];

export function isConsoleNoise(text: string): boolean {
  return CONSOLE_NOISE.some((re) => re.test(text));
}

export async function runUxHeuristics(
  page: Page,
  url: string,
  round: number,
  makeId: () => string
): Promise<CrawlIssue[]> {
  const issues: CrawlIssue[] = [];
  const ts = new Date().toISOString();

  const layout = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const main = document.querySelector('main');
    const h1 = document.querySelector('h1');
    const brokenImages: string[] = [];
    document.querySelectorAll('img').forEach((img) => {
      const src = img.currentSrc || img.src;
      if (!src || /\.svg(\?|$)/i.test(src)) return;
      if (img.complete && img.naturalWidth === 0) {
        brokenImages.push(src.slice(0, 120));
      }
    });
    const emptyButtons: string[] = [];
    document.querySelectorAll('button').forEach((btn) => {
      const label = (btn.textContent ?? '').trim() || btn.getAttribute('aria-label') || '';
      if (!label && !btn.querySelector('svg, img')) emptyButtons.push(btn.outerHTML.slice(0, 80));
    });
    return {
      horizontalOverflow: doc.scrollWidth > doc.clientWidth + 2,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyTextLen: (body?.innerText ?? '').trim().length,
      hasMain: Boolean(main),
      mainTextLen: (main?.textContent ?? '').trim().length,
      h1Text: (h1?.textContent ?? '').trim(),
      brokenImages,
      emptyButtons: emptyButtons.slice(0, 5),
      title: document.title,
    };
  });

  if (layout.horizontalOverflow) {
    issues.push({
      id: makeId(),
      round,
      url,
      severity: 'warn',
      kind: 'ux-horizontal-scroll',
      message: `Horizontal overflow: scrollWidth=${layout.scrollWidth} clientWidth=${layout.clientWidth}`,
      timestamp: ts,
    });
  }

  const isRedirectRoot = /^\/(n|b)(\?|$)/.test(url.split('?')[0] ?? url);
  if (
    layout.bodyTextLen < 20 &&
    !layout.h1Text &&
    !url.includes('/api/') &&
    !isRedirectRoot
  ) {
    issues.push({
      id: makeId(),
      round,
      url,
      severity: 'warn',
      kind: 'ux-empty-page',
      message: `Very little visible text (${layout.bodyTextLen} chars)`,
      timestamp: ts,
    });
  }

  if (!layout.h1Text && layout.bodyTextLen > 100) {
    issues.push({
      id: makeId(),
      round,
      url,
      severity: 'info',
      kind: 'ux-missing-h1',
      message: 'Page has content but no h1',
      timestamp: ts,
    });
  }

  if (layout.brokenImages.length > 0) {
    issues.push({
      id: makeId(),
      round,
      url,
      severity: 'error',
      kind: 'ux-broken-image',
      message: `${layout.brokenImages.length} broken image(s)`,
      details: { samples: layout.brokenImages },
      timestamp: ts,
    });
  }

  if (layout.emptyButtons.length > 0) {
    issues.push({
      id: makeId(),
      round,
      url,
      severity: 'warn',
      kind: 'ux-empty-button',
      message: `${layout.emptyButtons.length} button(s) without label`,
      details: { samples: layout.emptyButtons },
      timestamp: ts,
    });
  }

  return issues;
}
