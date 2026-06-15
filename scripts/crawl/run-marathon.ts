/**
 * 6-hour autonomous site crawl marathon.
 * Run: npm run crawl:marathon
 */
import { execSync } from 'node:child_process';
import { db } from '@/lib/db';
import { buildCatalogUrlsForRound, buildDynamicListingUrls, catalogStats } from './lib/url-catalog';
import { runCrawlRound } from './lib/site-crawler';
import {
  createRunDir,
  writeMarkdownSummary,
  writeMarathonState,
} from './lib/report';
import { runAutoFixer } from './lib/auto-fixer';
import type { CrawlIssue, MarathonState } from './lib/types';

const BASE_URL = (process.env.CRAWL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const OUTPUT_ROOT = process.env.CRAWL_OUTPUT_DIR ?? 'data/crawl-marathon';
const DURATION_HOURS = Number(process.env.CRAWL_DURATION_HOURS ?? 6);
const DURATION_MS = DURATION_HOURS * 60 * 60 * 1000;
const SEED_EVERY_ROUNDS = Number(process.env.CRAWL_SEED_EVERY ?? 3);

const runId = `marathon-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const runDir = createRunDir(OUTPUT_ROOT, runId);
const marathonStart = Date.now();

async function waitForServer(): Promise<void> {
  for (let i = 0; i < 120; i++) {
    try {
      const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
      if (res.ok || res.status < 500) return;
    } catch {
      /* retry */
    }
    await sleep(2000);
  }
  throw new Error(`Server not reachable at ${BASE_URL}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function seedFixtures(): Promise<void> {
  console.log('[marathon] Seeding crawl fixtures...');
  const out = execSync('npm run crawl:seed', {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });
  if (out.trim()) console.log(out.trim());
}

async function fetchDynamicUrls(): Promise<string[]> {
  const [requests, profiles] = await Promise.all([
    db.serviceRequest.findMany({
      where: { status: 'OPEN', moderationStatus: 'APPROVED' },
      select: { id: true, title: true },
      take: 1000,
      orderBy: { updatedAt: 'desc' },
    }),
    db.businessProfile.findMany({
      select: { slug: true },
      take: 1000,
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  return buildDynamicListingUrls(requests, profiles);
}

async function main() {
  console.log('=== NiazFinder 6h Crawl Marathon ===');
  console.log(`Duration: ${DURATION_HOURS}h`);
  console.log('Catalog:', catalogStats());
  console.log('Output:', runDir);

  await waitForServer();
  if (process.env.CRAWL_SKIP_SEED !== '1') {
    await seedFixtures();
  }

  const discovered = new Set<string>();
  let round = 0;
  let totalPages = 0;
  let totalIssues = 0;
  const allIssues: CrawlIssue[] = [];

  while (Date.now() - marathonStart < DURATION_MS) {
    round += 1;
    const elapsedMin = Math.round((Date.now() - marathonStart) / 60000);
    console.log(`\n[marathon] Round ${round} — elapsed ${elapsedMin}m`);

    if (round > 1 && round % SEED_EVERY_ROUNDS === 0) {
      await seedFixtures();
    }

    const catalog = buildCatalogUrlsForRound(round);
    const dynamic = await fetchDynamicUrls();
    const urls = [...new Set([...catalog, ...dynamic, ...discovered])];

    const { report, issues, discovered: newLinks } = await runCrawlRound({
      baseUrl: BASE_URL,
      urls,
      round,
      runDir,
      onProgress: (done, total, lastUrl) => {
        if (done % 50 === 0) console.log(`  progress ${done}/${total} — ${lastUrl}`);
      },
    });

    for (const link of newLinks) discovered.add(link);
    totalPages += report.pagesVisited;
    totalIssues += report.issuesFound;
    allIssues.push(...issues);

    const fixer = await runAutoFixer(runDir);
    console.log('[marathon] Auto-fixer:', fixer.actions.join('; '));

    const state: MarathonState = {
      runId,
      startedAt: new Date(marathonStart).toISOString(),
      durationHours: DURATION_HOURS,
      baseUrl: BASE_URL,
      roundsCompleted: round,
      totalPagesVisited: totalPages,
      totalIssues: totalIssues,
      lastRoundAt: report.finishedAt,
    };
    writeMarathonState(runDir, state);
    writeMarkdownSummary(runDir, state, allIssues);

    const remainingMs = DURATION_MS - (Date.now() - marathonStart);
    if (remainingMs <= 0) break;
    console.log(`[marathon] Round ${round} done. ${report.pagesVisited} pages, ${report.issuesFound} issues.`);
    console.log(`[marathon] Remaining ~${Math.round(remainingMs / 60000)}m. Pause 10s...`);
    await sleep(10_000);
  }

  console.log('\n=== Marathon finished ===');
  console.log(`Rounds: ${round}, Pages: ${totalPages}, Issues: ${totalIssues}`);
  console.log(`Full report: ${runDir}/REPORT.md`);
  console.log(`Issues log: ${runDir}/issues.jsonl`);
}

main()
  .catch((e) => {
    console.error('[marathon] FATAL:', e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
