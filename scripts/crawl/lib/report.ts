import { mkdirSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CrawlIssue, CrawlRoundReport, MarathonState, PageProbeResult } from './types';

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function createRunDir(root: string, runId: string): string {
  const dir = join(root, runId);
  ensureDir(dir);
  ensureDir(join(dir, 'screenshots'));
  ensureDir(join(dir, 'rounds'));
  return dir;
}

export function roundDir(runDir: string, round: number): string {
  const dir = join(runDir, 'rounds', `round-${String(round).padStart(3, '0')}`);
  ensureDir(dir);
  ensureDir(join(dir, 'screenshots'));
  return dir;
}

export function appendIssue(runDir: string, issue: CrawlIssue): void {
  appendFileSync(join(runDir, 'issues.jsonl'), `${JSON.stringify(issue)}\n`, 'utf8');
}

export function writeRoundReport(runDir: string, report: CrawlRoundReport): void {
  const dir = roundDir(runDir, report.round);
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(join(runDir, 'latest-round.json'), JSON.stringify(report, null, 2), 'utf8');
}

export function writeMarathonState(runDir: string, state: MarathonState): void {
  writeFileSync(join(runDir, 'marathon-state.json'), JSON.stringify(state, null, 2), 'utf8');
}

export function writePageLog(runDir: string, round: number, result: PageProbeResult): void {
  const dir = roundDir(runDir, round);
  appendFileSync(join(dir, 'pages.jsonl'), `${JSON.stringify(result)}\n`, 'utf8');
}

export function writeMarkdownSummary(
  runDir: string,
  state: MarathonState,
  topIssues: CrawlIssue[]
): void {
  const lines = [
    `# Site Crawl Marathon — ${state.runId}`,
    '',
    `- Started: ${state.startedAt}`,
    `- Base URL: ${state.baseUrl}`,
    `- Duration target: ${state.durationHours}h`,
    `- Rounds completed: ${state.roundsCompleted}`,
    `- Pages visited: ${state.totalPagesVisited}`,
    `- Total issues: ${state.totalIssues}`,
    '',
    '## Top issues (latest)',
    '',
  ];

  if (topIssues.length === 0) {
    lines.push('_No issues recorded yet._');
  } else {
    for (const issue of topIssues.slice(0, 100)) {
      lines.push(
        `- **[${issue.severity}]** \`${issue.kind}\` — ${issue.url}`,
        `  - ${issue.message}`,
        issue.screenshot ? `  - screenshot: \`${issue.screenshot}\`` : ''
      );
    }
  }

  writeFileSync(join(runDir, 'REPORT.md'), lines.filter(Boolean).join('\n'), 'utf8');
}
