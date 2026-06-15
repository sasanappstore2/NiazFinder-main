/**
 * Dedupe and classify crawl marathon issues.
 * Run: npm run crawl:triage [path-to-marathon-dir]
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Issue = {
  kind: string;
  url: string;
  severity: string;
  message: string;
};

const PRIORITY: Record<string, 'P0' | 'P1' | 'P2'> = {
  'page-error': 'P0',
  'console-error': 'P0',
  'navigation-error': 'P0',
  'ux-broken-image': 'P0',
  'http-status': 'P0',
  'request-failed': 'P1',
  'ux-horizontal-scroll': 'P1',
  'ux-empty-page': 'P1',
  'ux-empty-button': 'P1',
  'ux-missing-h1': 'P2',
  'console-warn': 'P2',
};

function messageKey(msg: string, len = 120): string {
  return msg.slice(0, len).replace(/\s+/g, ' ').trim();
}

function main() {
  const runDir =
    process.argv[2] ??
    (() => {
      const root = join(process.cwd(), 'data/crawl-marathon');
      const dirs = readdirSync(root)
        .filter((d) => d.startsWith('marathon-'))
        .map((d) => ({ d, m: statSync(join(root, d)).mtimeMs }))
        .sort((a, b) => b.m - a.m);
      if (dirs.length === 0) throw new Error('No marathon run found in data/crawl-marathon');
      return join(root, dirs[0].d);
    })();

  const issuesFile = join(runDir, 'issues.jsonl');
  if (!existsSync(issuesFile)) {
    console.error('Missing issues.jsonl in', runDir);
    process.exit(1);
  }

  const lines = readFileSync(issuesFile, 'utf8').split('\n').filter(Boolean);
  const issues: Issue[] = lines.map((l) => JSON.parse(l) as Issue);

  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const uniqueKeys = new Set<string>();
  const uniqueUrlsByKind = new Map<string, Set<string>>();
  const patterns = new Map<string, { kind: string; count: number; sampleUrl: string; message: string }>();

  for (const issue of issues) {
    byKind[issue.kind] = (byKind[issue.kind] ?? 0) + 1;
    bySeverity[issue.severity] = (bySeverity[issue.severity] ?? 0) + 1;
    uniqueKeys.add(`${issue.kind}|${issue.url}|${messageKey(issue.message)}`);

    if (!uniqueUrlsByKind.has(issue.kind)) uniqueUrlsByKind.set(issue.kind, new Set());
    uniqueUrlsByKind.get(issue.kind)!.add(issue.url);

    const patKey = `${issue.kind}|${messageKey(issue.message, 80)}`;
    const existing = patterns.get(patKey);
    if (existing) existing.count += 1;
    else
      patterns.set(patKey, {
        kind: issue.kind,
        count: 1,
        sampleUrl: issue.url,
        message: messageKey(issue.message, 200),
      });
  }

  const priorityBuckets: Record<string, number> = { P0: 0, P1: 0, P2: 0 };
  for (const [kind, count] of Object.entries(byKind)) {
    const p = PRIORITY[kind] ?? 'P2';
    priorityBuckets[p] += count;
  }

  const topPatterns = [...patterns.values()].sort((a, b) => b.count - a.count).slice(0, 50);

  const uniqueUrlsPerKind: Record<string, number> = {};
  for (const [kind, urls] of uniqueUrlsByKind) {
    uniqueUrlsPerKind[kind] = urls.size;
  }

  const summary = {
    runDir,
    totalIssues: issues.length,
    uniqueIssues: uniqueKeys.size,
    byKind,
    bySeverity,
    uniqueUrlsPerKind,
    priorityBuckets,
    topPatterns,
    generatedAt: new Date().toISOString(),
  };

  const outPath = join(runDir, 'triage-summary.json');
  writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Crawl triage ===');
  console.log('Run:', runDir);
  console.log('Total:', summary.totalIssues, '| Unique:', summary.uniqueIssues);
  console.log('By kind:', JSON.stringify(byKind, null, 2));
  console.log('Priority:', priorityBuckets);
  console.log('Written:', outPath);
}

main();
