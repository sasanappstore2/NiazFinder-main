export type IssueSeverity = 'error' | 'warn' | 'info';

export type CrawlIssue = {
  id: string;
  round: number;
  url: string;
  severity: IssueSeverity;
  kind: string;
  message: string;
  details?: Record<string, unknown>;
  screenshot?: string;
  timestamp: string;
};

export type PageProbeResult = {
  url: string;
  finalUrl: string;
  status: number;
  durationMs: number;
  title: string;
  issues: CrawlIssue[];
  discoveredLinks: string[];
  consoleLogs: { type: string; text: string }[];
};

export type CrawlRoundReport = {
  round: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  pagesVisited: number;
  issuesFound: number;
  errors: number;
  warnings: number;
  uniqueUrls: number;
  outputDir: string;
};

export type MarathonState = {
  runId: string;
  startedAt: string;
  durationHours: number;
  baseUrl: string;
  roundsCompleted: number;
  totalPagesVisited: number;
  totalIssues: number;
  lastRoundAt?: string;
};
