import { chromium, type Browser } from 'playwright';
import { join } from 'node:path';
import type { CrawlIssue, CrawlRoundReport } from './types';
import { probePage } from './page-probe';
import {
  appendIssue,
  roundDir,
  writePageLog,
  writeRoundReport,
} from './report';

export type CrawlOptions = {
  baseUrl: string;
  urls: string[];
  round: number;
  runDir: string;
  concurrency?: number;
  maxPages?: number;
  discoverLinks?: boolean;
  onProgress?: (done: number, total: number, lastUrl: string) => void;
};

export async function runCrawlRound(options: CrawlOptions): Promise<{
  report: CrawlRoundReport;
  issues: CrawlIssue[];
  discovered: string[];
}> {
  const {
    baseUrl,
    round,
    runDir,
    concurrency = Number(process.env.CRAWL_CONCURRENCY ?? 3),
    maxPages = Number(process.env.CRAWL_MAX_PAGES ?? 0) || Infinity,
    discoverLinks = true,
    onProgress,
  } = options;

  const queue = [...new Set(options.urls)];
  const visited = new Set<string>();
  const allIssues: CrawlIssue[] = [];
  const discoveredGlobal = new Set<string>();
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage', '--no-sandbox'],
  });

  const mobile = round % 2 === 1;
  const context = await browser.newContext({
    locale: 'fa-IR',
    viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    userAgent: mobile
      ? 'NiazFinderCrawler/1.0 Mobile (Playwright internal QA)'
      : 'NiazFinderCrawler/1.0 Desktop (Playwright internal QA)',
  });

  const screenshotDir = join(roundDir(runDir, round), 'screenshots');
  let done = 0;

  async function worker(): Promise<void> {
    while (queue.length > 0 && visited.size < maxPages) {
      const path = queue.shift();
      if (!path || visited.has(path)) continue;
      visited.add(path);

      const result = await probePage(context, baseUrl, path, round, screenshotDir);
      writePageLog(runDir, round, result);

      for (const issue of result.issues) {
        appendIssue(runDir, issue);
        allIssues.push(issue);
      }

      if (discoverLinks) {
        for (const link of result.discoveredLinks) {
          if (!visited.has(link) && !queue.includes(link)) {
            discoveredGlobal.add(link);
            queue.push(link);
          }
        }
      }

      done += 1;
      onProgress?.(done, Math.min(queue.length + done, maxPages), path);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);

  await context.close();
  await browser.close();

  const finishedAt = new Date().toISOString();
  const report: CrawlRoundReport = {
    round,
    startedAt,
    finishedAt,
    durationMs: Date.now() - t0,
    pagesVisited: visited.size,
    issuesFound: allIssues.length,
    errors: allIssues.filter((i) => i.severity === 'error').length,
    warnings: allIssues.filter((i) => i.severity === 'warn').length,
    uniqueUrls: visited.size,
    outputDir: roundDir(runDir, round),
  };

  writeRoundReport(runDir, report);

  return {
    report,
    issues: allIssues,
    discovered: [...discoveredGlobal],
  };
}
