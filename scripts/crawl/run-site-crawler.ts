/**
 * Single crawl round. Requires dev server + Playwright chromium.
 * Run: npm run crawl:run
 */
import { db } from '@/lib/db';
import { buildCatalogUrls, buildDynamicListingUrls, catalogStats } from './lib/url-catalog';
import { runCrawlRound } from './lib/site-crawler';
import { createRunDir, writeMarkdownSummary } from './lib/report';
import type { MarathonState } from './lib/types';

const BASE_URL = (process.env.CRAWL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const OUTPUT_ROOT = process.env.CRAWL_OUTPUT_DIR ?? 'data/crawl-marathon';

async function fetchDynamicUrls(): Promise<string[]> {
  const [requests, profiles] = await Promise.all([
    db.serviceRequest.findMany({
      where: { status: 'OPEN', moderationStatus: 'APPROVED' },
      select: { id: true, title: true },
      take: 800,
      orderBy: { updatedAt: 'desc' },
    }),
    db.businessProfile.findMany({
      select: { slug: true },
      take: 800,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  return buildDynamicListingUrls(requests, profiles);
}

async function main() {
  const runId = process.env.CRAWL_RUN_ID ?? `crawl-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const runDir = createRunDir(OUTPUT_ROOT, runId);
  const round = Number(process.env.CRAWL_ROUND ?? 1);

  console.log('=== NiazFinder site crawler ===');
  console.log('Stats:', catalogStats());
  console.log('Base:', BASE_URL);
  console.log('Output:', runDir);

  const catalog = buildCatalogUrls({
    includeFilters: process.env.CRAWL_SKIP_FILTERS !== '1',
    includeCityCategories: true,
    includeIranCategories: true,
  });
  const dynamic = await fetchDynamicUrls();
  const urls = [...new Set([...catalog, ...dynamic])];

  console.log(`URL queue: ${urls.length} (${catalog.length} catalog + ${dynamic.length} dynamic)`);

  let lastLog = 0;
  const { report, issues } = await runCrawlRound({
    baseUrl: BASE_URL,
    urls,
    round,
    runDir,
    onProgress: (done, total, lastUrl) => {
      const now = Date.now();
      if (now - lastLog > 5000) {
        lastLog = now;
        console.log(`  [${done}/${total}] ${lastUrl}`);
      }
    },
  });

  const state: MarathonState = {
    runId,
    startedAt: new Date().toISOString(),
    durationHours: 0,
    baseUrl: BASE_URL,
    roundsCompleted: 1,
    totalPagesVisited: report.pagesVisited,
    totalIssues: report.issuesFound,
    lastRoundAt: report.finishedAt,
  };

  writeMarkdownSummary(runDir, state, issues);
  console.log('\n=== Round complete ===');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report: ${runDir}/REPORT.md`);

  if (report.errors > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
