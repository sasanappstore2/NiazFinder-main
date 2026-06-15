import type { BrowserContext, Page, Response } from 'playwright';
import type { CrawlIssue, PageProbeResult } from './types';
import { isConsoleNoise, runUxHeuristics } from './ux-heuristics';

let issueCounter = 0;

function nextIssueId(): string {
  issueCounter += 1;
  return `issue-${Date.now()}-${issueCounter}`;
}

function isRequestNoise(url: string, failure: string): boolean {
  if (/favicon|analytics|hot-update|hmr-client|turbopack/i.test(url)) return true;
  if (/ERR_ABORTED|ERR_CONNECTION_REFUSED|ERR_INCOMPLETE_CHUNKED_ENCODING/i.test(failure)) {
    return true;
  }
  if (/\/api\/(referral\/me|business\/me|auth\/)/i.test(url) && /401|403/i.test(failure)) {
    return true;
  }
  return isConsoleNoise(url) || isConsoleNoise(failure);
}

function isPageErrorNoise(message: string): boolean {
  if (isConsoleNoise(message)) return true;
  return (
    /Failed to load chunk/i.test(message) &&
    /turbopack|hmr-client|_next\/static/i.test(message)
  );
}

function normalizeLink(href: string, baseUrl: string): string | null {
  try {
    const u = new URL(href, baseUrl);
    if (u.origin !== new URL(baseUrl).origin) return null;
    if (u.pathname.startsWith('/api/')) return null;
    if (/\.(png|jpe?g|gif|webp|svg|ico|woff2?|css|js|map)(\?|$)/i.test(u.pathname)) return null;
    const path = `${u.pathname}${u.search}`;
    if (path.startsWith('/_next/')) return null;
    return path;
  } catch {
    return null;
  }
}

function attachPageListeners(
  page: Page,
  path: string,
  round: number,
  issues: CrawlIssue[],
  consoleLogs: { type: string; text: string }[]
): void {
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    consoleLogs.push({ type, text: text.slice(0, 2000) });
    if (type === 'error' && !isConsoleNoise(text)) {
      issues.push({
        id: nextIssueId(),
        round,
        url: path,
        severity: 'error',
        kind: 'console-error',
        message: text.slice(0, 500),
        timestamp: new Date().toISOString(),
      });
    }
    if (type === 'warning' && !isConsoleNoise(text)) {
      issues.push({
        id: nextIssueId(),
        round,
        url: path,
        severity: 'warn',
        kind: 'console-warn',
        message: text.slice(0, 500),
        timestamp: new Date().toISOString(),
      });
    }
  });

  page.on('pageerror', (err) => {
    const message = err instanceof Error ? err.message : String(err);
    if (isConsoleNoise(message) || isPageErrorNoise(message)) return;
    issues.push({
      id: nextIssueId(),
      round,
      url: path,
      severity: 'error',
      kind: 'page-error',
      message: message.slice(0, 800),
      timestamp: new Date().toISOString(),
    });
  });

  page.on('requestfailed', (req) => {
    const failure = req.failure()?.errorText ?? 'unknown';
    const reqUrl = req.url();
    if (isRequestNoise(reqUrl, failure)) return;
    issues.push({
      id: nextIssueId(),
      round,
      url: path,
      severity: 'warn',
      kind: 'request-failed',
      message: `${req.method()} ${reqUrl.slice(0, 200)} ? ${failure}`,
      timestamp: new Date().toISOString(),
    });
  });
}

function isNavigationRetryable(message: string): boolean {
  return (
    /Execution context was destroyed/i.test(message) ||
    /interrupted by another navigation/i.test(message)
  );
}

async function waitForPageSettled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() =>
    page.waitForLoadState('domcontentloaded', { timeout: 15_000 })
  );
}

/** Wait until redirect chain finishes (listing slug canonicalization). */
async function waitForStableNavigation(page: Page): Promise<void> {
  let lastUrl = '';
  for (let i = 0; i < 5; i += 1) {
    await page.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined);
    const current = page.url();
    if (current === lastUrl && current !== 'about:blank') {
      await page.waitForTimeout(200);
      if (page.url() === current) return;
    }
    lastUrl = current;
    await page.waitForTimeout(150);
  }
}

async function loadPage(page: Page, url: string): Promise<Response | null> {
  try {
    return await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 20_000,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isNavigationRetryable(message)) {
      await waitForStableNavigation(page);
      return null;
    }
    try {
      return await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 45_000,
      });
    } catch (err2) {
      const message2 = err2 instanceof Error ? err2.message : String(err2);
      if (isNavigationRetryable(message2)) {
        await waitForStableNavigation(page);
        return null;
      }
      throw err2;
    }
  }
}

async function runUxHeuristicsSafe(
  page: Page,
  path: string,
  round: number
): Promise<CrawlIssue[]> {
  const h1Timeout = path.startsWith('/v/') ? 10_000 : 3_000;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (attempt > 0) await waitForStableNavigation(page);
      await page.waitForSelector('h1', { timeout: h1Timeout }).catch(() => undefined);
      return await runUxHeuristics(page, path, round, nextIssueId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!/Execution context was destroyed/i.test(message) || attempt === 2) {
        throw err;
      }
      await page.waitForTimeout(400);
    }
  }
  return [];
}

async function settlePageAfterNavigation(
  page: Page,
  path: string,
  round: number,
  issues: CrawlIssue[],
  status: number
): Promise<number> {
  await page.waitForSelector('h1', { timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(300);

  const nextStatus = status;
  if (nextStatus >= 400) {
    issues.push({
      id: nextIssueId(),
      round,
      url: path,
      severity: nextStatus >= 500 ? 'error' : 'warn',
      kind: 'http-status',
      message: `HTTP ${nextStatus}`,
      timestamp: new Date().toISOString(),
    });
  }

  issues.push(...(await runUxHeuristicsSafe(page, path, round)));
  return nextStatus;
}

export async function probePage(
  context: BrowserContext,
  baseUrl: string,
  path: string,
  round: number,
  screenshotDir: string
): Promise<PageProbeResult> {
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  const page = await context.newPage();
  const started = Date.now();
  const issues: CrawlIssue[] = [];
  const consoleLogs: { type: string; text: string }[] = [];
  let status = 0;

  attachPageListeners(page, path, round, issues, consoleLogs);

  try {
    const response = await loadPage(page, url);
    status = response?.status() ?? 0;
    status = await settlePageAfterNavigation(page, path, round, issues, status);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (isNavigationRetryable(message)) {
      try {
        await waitForStableNavigation(page);
        status = await settlePageAfterNavigation(page, path, round, issues, status);
      } catch (retryErr) {
        const retryMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
        if (!isNavigationRetryable(retryMsg) && !/Execution context was destroyed/i.test(retryMsg)) {
          issues.push({
            id: nextIssueId(),
            round,
            url: path,
            severity: 'error',
            kind: 'navigation-error',
            message: retryMsg.slice(0, 500),
            timestamp: new Date().toISOString(),
          });
        } else {
          await waitForStableNavigation(page).catch(() => undefined);
          status = await settlePageAfterNavigation(page, path, round, issues, status);
        }
      }
    } else {
      issues.push({
        id: nextIssueId(),
        round,
        url: path,
        severity: 'error',
        kind: 'navigation-error',
        message: message.slice(0, 500),
        timestamp: new Date().toISOString(),
      });
    }
  }

  const discoveredLinks = new Set<string>();
  try {
    const hrefs = await page.$$eval('a[href]', (els) =>
      els.map((a) => (a as HTMLAnchorElement).href)
    );
    for (const href of hrefs) {
      const normalized = normalizeLink(href, baseUrl);
      if (normalized) discoveredLinks.add(normalized);
    }
  } catch {
    /* page may be closed */
  }

  const title = await page.title().catch(() => '');
  const finalUrl = page.url();

  if (issues.length > 0) {
    const safeName = path.replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 80) || 'root';
    const shotPath = `${screenshotDir}/${safeName}-${Date.now()}.png`;
    try {
      await page.screenshot({ path: shotPath, fullPage: true });
      for (const issue of issues) {
        issue.screenshot = shotPath;
      }
    } catch {
      /* ignore */
    }
  }

  await page.close().catch(() => undefined);

  return {
    url: path,
    finalUrl,
    status,
    durationMs: Date.now() - started,
    title,
    issues,
    discoveredLinks: [...discoveredLinks],
    consoleLogs: consoleLogs.slice(-30),
  };
}
