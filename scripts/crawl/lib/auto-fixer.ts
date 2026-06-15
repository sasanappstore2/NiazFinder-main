import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import type { CrawlIssue } from './types';

export type FixerResult = {
  actions: string[];
  skipped: string[];
};

function loadIssues(runDir: string): CrawlIssue[] {
  const file = join(runDir, 'issues.jsonl');
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CrawlIssue);
}

export async function runAutoFixer(runDir: string): Promise<FixerResult> {
  const actions: string[] = [];
  const skipped: string[] = [];
  const issues = loadIssues(runDir);

  const byKind = new Map<string, number>();
  for (const issue of issues) {
    byKind.set(issue.kind, (byKind.get(issue.kind) ?? 0) + 1);
  }

  writeFileSync(
    join(runDir, 'issue-summary.json'),
    JSON.stringify(Object.fromEntries(byKind), null, 2),
    'utf8'
  );
  actions.push(`issue-summary.json written (${issues.length} issues)`);

  try {
    execSync('npx --yes tsx scripts/dev/approve-all-pending-requests.ts', {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf8',
    });
    actions.push('approved pending service requests');
  } catch (e) {
    skipped.push(`approve pending: ${e instanceof Error ? e.message : String(e)}`);
  }

  const http404 = issues.filter((i) => i.kind === 'http-status' && i.message.includes('404'));
  if (http404.length > 0) {
    writeFileSync(
      join(runDir, 'fix-queue-404.json'),
      JSON.stringify(
        http404.map((i) => ({ url: i.url, message: i.message })),
        null,
        2
      ),
      'utf8'
    );
    actions.push(`logged ${http404.length} HTTP 404 URLs to fix-queue-404.json`);
  }

  const pageErrors = issues.filter((i) => i.kind === 'page-error');
  if (pageErrors.length > 0) {
    writeFileSync(
      join(runDir, 'fix-queue-runtime.json'),
      JSON.stringify(
        pageErrors.slice(0, 200).map((i) => ({
          url: i.url,
          message: i.message,
          screenshot: i.screenshot,
        })),
        null,
        2
      ),
      'utf8'
    );
    actions.push(`logged ${Math.min(pageErrors.length, 200)} runtime errors to fix-queue-runtime.json`);
  }

  return { actions, skipped };
}
