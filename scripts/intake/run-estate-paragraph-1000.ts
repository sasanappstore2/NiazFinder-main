/**
 * Dual-mode estate paragraph-1000 runner (rules + hybrid).
 *
 * Usage:
 *   npm run test:estate-paragraph-1000
 *   npm run test:estate-paragraph-1000 -- --mode=rules --limit=50
 *   npm run test:estate-paragraph-1000 -- --resume
 *   npm run test:estate-paragraph-1000 -- --status
 */
import '../stress/intake-marathon/stub-server-only';
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { join } from 'node:path';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';
import type {
  AnalyzeProjection,
  OracleCaseResult,
} from '@/lib/need-intake/estate/estate-paragraph-oracle';

const ROOT = process.cwd();
const CORPUS = join(ROOT, 'fixtures/estate-paragraph-1000.jsonl');
const BASE_OUT = join(ROOT, 'tmp/estate-paragraph-1000');

interface Progress {
  nextIndex: number;
  completed: number;
  hardPassRules: number;
  hardPassHybrid: number;
  hardFailRules: number;
  hardFailHybrid: number;
  updatedAt: string;
}

function parseArgs(argv: string[]) {
  const modeArg = argv.find((a) => a.startsWith('--mode='))?.split('=')[1];
  const limitArg = argv.find((a) => a.startsWith('--limit='))?.split('=')[1];
  const concurrencyArg = argv.find((a) => a.startsWith('--concurrency='))?.split('=')[1];
  const outArg = argv.find((a) => a.startsWith('--out='))?.split('=')[1];
  return {
    mode: (modeArg === 'rules' || modeArg === 'hybrid' || modeArg === 'both'
      ? modeArg
      : 'both') as 'rules' | 'hybrid' | 'both',
    limit: limitArg ? Number(limitArg) : undefined,
    concurrency: Math.max(1, Number(concurrencyArg ?? 4)),
    resume: argv.includes('--resume'),
    status: argv.includes('--status'),
    out: outArg,
  };
}

function resolveOutDir(args: ReturnType<typeof parseArgs>): string {
  if (args.out) return join(ROOT, args.out);
  // Limit/smoke runs write to an isolated subdir so they cannot clobber a full gate.
  if (args.limit != null) {
    return join(BASE_OUT, `smoke-${args.mode}-n${args.limit}`);
  }
  return BASE_OUT;
}

function logLine(msg: string) {
  // Sync write so progress is visible under `tee` / non-TTY pipes.
  writeSync(1, msg + '\n');
}

function loadCorpus(): EstateParagraphCase[] {
  if (!existsSync(CORPUS)) {
    throw new Error(`Missing corpus at ${CORPUS}. Run: npm run generate:estate-paragraph-1000`);
  }
  return readFileSync(CORPUS, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EstateParagraphCase);
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return out;
}

async function stubServerOnly(): Promise<void> {
  const { createRequire } = await import('node:module');
  const require = createRequire(import.meta.url);
  const p = require.resolve('server-only');
  require.cache[p] = { id: p, filename: p, loaded: true, exports: {} } as NodeModule;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const OUT_DIR = resolveOutDir(args);
  const RESULTS = join(OUT_DIR, 'results.jsonl');
  const FAILURES = join(OUT_DIR, 'failures.jsonl');
  const PROGRESS = join(OUT_DIR, 'progress.json');
  const REPORT = join(OUT_DIR, 'report.json');
  const LOCK = join(BASE_OUT, '.full-gate.lock');
  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(BASE_OUT, { recursive: true });

  function loadProgressLocal(): Progress {
    if (!existsSync(PROGRESS)) {
      return {
        nextIndex: 0,
        completed: 0,
        hardPassRules: 0,
        hardPassHybrid: 0,
        hardFailRules: 0,
        hardFailHybrid: 0,
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(readFileSync(PROGRESS, 'utf8')) as Progress;
  }

  function saveProgressLocal(p: Progress) {
    p.updatedAt = new Date().toISOString();
    writeFileSync(PROGRESS, JSON.stringify(p, null, 2));
  }

  const progress = loadProgressLocal();
  if (args.status) {
    logLine(JSON.stringify(progress, null, 2));
    if (existsSync(REPORT)) logLine(readFileSync(REPORT, 'utf8'));
    return;
  }

  // Full dual/rules/hybrid gates take the lock so smoke/limit runs cannot wipe artifacts.
  const isFullGate = args.limit == null;
  if (isFullGate) {
    if (existsSync(LOCK) && !args.resume) {
      const stale = readFileSync(LOCK, 'utf8').trim();
      const lockPid = Number(stale);
      if (Number.isFinite(lockPid)) {
        try {
          process.kill(lockPid, 0);
          throw new Error(
            `Another full estate-1000 gate is running (pid=${lockPid}). Kill it or pass --resume.`
          );
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ESRCH' && !(err instanceof Error && err.message.includes('Another'))) {
            // ESRCH = dead lock holder; replace lock below.
          } else if (err instanceof Error && err.message.includes('Another')) {
            throw err;
          }
        }
      }
    }
    writeFileSync(LOCK, String(process.pid));
    const clearLock = () => {
      try {
        if (existsSync(LOCK) && readFileSync(LOCK, 'utf8').trim() === String(process.pid)) {
          writeFileSync(LOCK, '');
        }
      } catch {
        /* ignore */
      }
    };
    process.on('exit', clearLock);
    process.on('SIGINT', () => {
      clearLock();
      process.exit(130);
    });
    process.on('SIGTERM', () => {
      clearLock();
      process.exit(143);
    });
  }

  await stubServerOnly();
  const { runIntakeIntelligence } = await import('@/intake/intelligence-engine/orchestrator');
  const { formatIntakeAnalyzeResponse } = await import('@/lib/need-intake/intake-analyze-response');
  const { scoreEstateParagraphCase } = await import('@/lib/need-intake/estate/estate-paragraph-oracle');

  function toProjection(raw: ReturnType<typeof formatIntakeAnalyzeResponse>): AnalyzeProjection {
    const draft = raw.draft;
    const answers = (draft?.answers ?? {}) as Record<string, unknown>;
    return {
      categorySlug: (raw.entities.categorySlug as string | null) ?? null,
      subcategorySlug: (raw.entities.subcategorySlug as string | null) ?? null,
      city: (raw.entities.city as string | null) ?? null,
      neighborhood: (raw.entities.neighborhood as string | null) ?? null,
      area: asNum(raw.entities.area) ?? asNum(answers.areaMin) ?? asNum(answers.area),
      rooms: asNum(raw.entities.rooms) ?? asNum(answers.rooms),
      transactionType: (raw.entities.transactionType as string | null) ?? null,
      dealType: typeof answers.dealType === 'string' ? answers.dealType : null,
      budgetMax: asNum(raw.entities.budgetMax) ?? asNum(answers.budget) ?? asNum(answers.budgetMax),
      rahnAmount: asNum(raw.entities.rahnAmount) ?? asNum(answers.rahnAmount),
      monthlyRent: asNum(raw.entities.monthlyRent) ?? asNum(answers.monthlyRent),
      deposit: asNum(raw.entities.deposit) ?? asNum(answers.deposit),
      recommendedQuestions: raw.recommendedQuestions ?? [],
      gaps: (raw.parseGaps as AnalyzeProjection['gaps']) ?? [],
      answers,
    };
  }

  function applyModeEnv(mode: 'rules' | 'hybrid'): void {
    process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
    // Keep gate latency bounded even if .env.local enables long LLM/embed waits.
    process.env.NEED_INTAKE_LLM_TIMEOUT_MS = process.env.ESTATE_1000_LLM_TIMEOUT_MS ?? '8000';
    process.env.EMBED_TIMEOUT_MS = process.env.ESTATE_1000_EMBED_TIMEOUT_MS ?? '3000';
    if (mode === 'rules') {
      process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
      process.env.NEED_INTAKE_RULES_ONLY = 'true';
      process.env.NEED_INTAKE_LLM_ENABLED = 'false';
      process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
      process.env.NEED_INTAKE_INTENT_GIST_ENABLED = 'false';
      process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
      process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
    } else {
      process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
      process.env.NEED_INTAKE_RULES_ONLY = 'false';
      const llmOn = (process.env.ESTATE_1000_LLM_ENABLED ?? 'true') === 'true';
      process.env.NEED_INTAKE_LLM_ENABLED = llmOn ? 'true' : 'false';
      // Semantic resolver can hang on a down embed sidecar (~30s); keep off unless explicitly enabled.
      process.env.AI_SEMANTIC_RESOLVER_ENABLED =
        process.env.ESTATE_1000_SEMANTIC_ENABLED ?? (llmOn ? 'true' : 'false');
      process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = llmOn ? 'true' : 'false';
    }
  }

  async function analyzeOne(text: string): Promise<AnalyzeProjection> {
    const result = await runIntakeIntelligence({ text }, { skipCache: true });
    return toProjection(formatIntakeAnalyzeResponse(result));
  }

  const corpus = loadCorpus();
  const start = args.resume ? progress.nextIndex : 0;
  if (!args.resume) {
    writeFileSync(RESULTS, '');
    writeFileSync(FAILURES, '');
    Object.assign(progress, {
      nextIndex: 0,
      completed: 0,
      hardPassRules: 0,
      hardPassHybrid: 0,
      hardFailRules: 0,
      hardFailHybrid: 0,
    });
  }

  const slice = corpus.slice(start, args.limit != null ? start + args.limit : undefined);
  const modes: Array<'rules' | 'hybrid'> =
    args.mode === 'both' ? ['rules', 'hybrid'] : [args.mode];

  const taxonomyCount: Record<string, number> = {};

  for (const mode of modes) {
    applyModeEnv(mode);
    let modeCompleted = 0;
    await mapPool(slice, args.concurrency, async (cse) => {
      const started = Date.now();
      let scored: OracleCaseResult;
      try {
        const proj = await analyzeOne(cse.text);
        scored = scoreEstateParagraphCase(cse, proj, mode);
      } catch (err) {
        scored = {
          id: cse.id,
          mode,
          passedHard: false,
          hardScore: 0,
          hardMax: 1,
          weightedScore: 0,
          weightedMax: 0,
          fields: [
            {
              field: 'runtime',
              tier: 'hard',
              passed: false,
              detail: err instanceof Error ? err.message : String(err),
            },
          ],
          taxonomy: ['soft_other'],
        };
      }

      const row = {
        ...scored,
        text: cse.text,
        tags: cse.tags,
        latencyMs: Date.now() - started,
        at: new Date().toISOString(),
      };
      appendFileSync(RESULTS, JSON.stringify(row) + '\n');
      if (!scored.passedHard) {
        appendFileSync(FAILURES, JSON.stringify(row) + '\n');
      }
      for (const t of scored.taxonomy) {
        taxonomyCount[t] = (taxonomyCount[t] ?? 0) + 1;
      }
      if (mode === 'rules') {
        if (scored.passedHard) progress.hardPassRules += 1;
        else progress.hardFailRules += 1;
      } else {
        if (scored.passedHard) progress.hardPassHybrid += 1;
        else progress.hardFailHybrid += 1;
      }
      modeCompleted += 1;
      progress.nextIndex = Math.max(progress.nextIndex, cse.index);
      if (modeCompleted % 25 === 0) {
        saveProgressLocal(progress);
        logLine(
          `progress mode=${mode} ${modeCompleted}/${slice.length} rulesPass=${progress.hardPassRules} hybridPass=${progress.hardPassHybrid}`
        );
      }
    });
  }
  progress.completed = slice.length;

  // Recompute hard pass/fail from results to avoid concurrent counter races.
  if (existsSync(RESULTS)) {
    let hardPassRules = 0;
    let hardFailRules = 0;
    let hardPassHybrid = 0;
    let hardFailHybrid = 0;
    const tax: Record<string, number> = {};
    for (const line of readFileSync(RESULTS, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line) as OracleCaseResult;
      if (row.mode === 'rules') {
        if (row.passedHard) hardPassRules += 1;
        else hardFailRules += 1;
      } else {
        if (row.passedHard) hardPassHybrid += 1;
        else hardFailHybrid += 1;
      }
      for (const t of row.taxonomy) tax[t] = (tax[t] ?? 0) + 1;
    }
    progress.hardPassRules = hardPassRules;
    progress.hardFailRules = hardFailRules;
    progress.hardPassHybrid = hardPassHybrid;
    progress.hardFailHybrid = hardFailHybrid;
    Object.keys(taxonomyCount).forEach((k) => delete taxonomyCount[k]);
    Object.assign(taxonomyCount, tax);
  }

  saveProgressLocal(progress);

  const report = {
    corpus: CORPUS,
    modes,
    completed: progress.completed,
    hardPassRules: progress.hardPassRules,
    hardFailRules: progress.hardFailRules,
    hardPassHybrid: progress.hardPassHybrid,
    hardFailHybrid: progress.hardFailHybrid,
    rulesHardRate:
      progress.hardPassRules + progress.hardFailRules > 0
        ? progress.hardPassRules / (progress.hardPassRules + progress.hardFailRules)
        : 0,
    hybridHardRate:
      progress.hardPassHybrid + progress.hardFailHybrid > 0
        ? progress.hardPassHybrid / (progress.hardPassHybrid + progress.hardFailHybrid)
        : 0,
    taxonomyCount,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(REPORT, JSON.stringify(report, null, 2));
  logLine(JSON.stringify(report, null, 2));

  if (args.mode === 'both' && args.limit == null && start === 0) {
    if (progress.hardFailRules > 0 || progress.hardFailHybrid > 0) {
      console.error(
        `HARD FAIL: rules=${progress.hardFailRules} hybrid=${progress.hardFailHybrid}`
      );
      process.exitCode = 1;
    }
  } else if (args.limit == null) {
    if (args.mode === 'rules' && progress.hardFailRules > 0) {
      console.error(`HARD FAIL: rules hard failures=${progress.hardFailRules}`);
      process.exitCode = 1;
    }
    if (args.mode === 'hybrid' && progress.hardFailHybrid > 0) {
      console.error(`HARD FAIL: hybrid hard failures=${progress.hardFailHybrid}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
