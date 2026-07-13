/**
 * Sequential one-by-one estate corpus tick for /post analyze loop.
 *
 * Reads fixtures/estate-needs-colloquial-1000.jsonl (fallback: estate-paragraph-1000.jsonl),
 * runs the next untested case against runIntakeIntelligence (same engine as /post),
 * scores with estate-paragraph oracle, appends result, prints AGENT tick summary.
 *
 * Usage:
 *   npx tsx scripts/intake/run-estate-colloquial-one.ts
 *   npx tsx scripts/intake/run-estate-colloquial-one.ts --index=3
 *   npx tsx scripts/intake/run-estate-colloquial-one.ts --mode=rules
 *   npx tsx scripts/intake/run-estate-colloquial-one.ts --status
 */
import '../stress/intake-marathon/stub-server-only';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EstateParagraphCase } from '@/lib/need-intake/estate/estate-paragraph-types';
import type { AnalyzeProjection, OracleCaseResult } from '@/lib/need-intake/estate/estate-paragraph-oracle';

const ROOT = process.cwd();
const CORPUS_A = join(ROOT, 'fixtures/estate-needs-colloquial-1000.jsonl');
const CORPUS_B = join(ROOT, 'fixtures/estate-paragraph-1000.jsonl');
const OUT_DIR = join(ROOT, 'tmp/estate-colloquial-loop');
const STATE = join(OUT_DIR, 'loop-state.json');
const RESULTS = join(OUT_DIR, 'results.jsonl');
const FAILURES = join(OUT_DIR, 'failures.jsonl');
const LAST = join(OUT_DIR, 'last-tick.json');

interface LoopState {
  nextIndex: number;
  passed: number;
  failed: number;
  lastId: string | null;
  updatedAt: string;
}

function parseArgs(argv: string[]) {
  const indexArg = argv.find((a) => a.startsWith('--index='))?.split('=')[1];
  const modeArg = argv.find((a) => a.startsWith('--mode='))?.split('=')[1];
  return {
    index: indexArg ? Number(indexArg) : undefined,
    mode: (modeArg === 'hybrid' ? 'hybrid' : 'rules') as 'rules' | 'hybrid',
    status: argv.includes('--status'),
    retest: argv.includes('--retest'),
  };
}

function loadCorpus(): EstateParagraphCase[] {
  const path = existsSync(CORPUS_A) ? CORPUS_A : CORPUS_B;
  if (!existsSync(path)) throw new Error(`Missing corpus at ${CORPUS_A} or ${CORPUS_B}`);
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l) as EstateParagraphCase);
}

function loadState(): LoopState {
  if (!existsSync(STATE)) {
    return {
      nextIndex: 1,
      passed: 0,
      failed: 0,
      lastId: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return JSON.parse(readFileSync(STATE, 'utf8')) as LoopState;
}

function saveState(s: LoopState) {
  s.updatedAt = new Date().toISOString();
  writeFileSync(STATE, JSON.stringify(s, null, 2));
}

function asNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function applyModeEnv(mode: 'rules' | 'hybrid') {
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
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
    process.env.AI_SEMANTIC_RESOLVER_ENABLED =
      process.env.ESTATE_1000_SEMANTIC_ENABLED ?? (llmOn ? 'true' : 'false');
    process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = llmOn ? 'true' : 'false';
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });
  const state = loadState();
  const corpus = loadCorpus();

  if (args.status) {
    console.log(JSON.stringify({ state, corpusSize: corpus.length, outDir: OUT_DIR }, null, 2));
    return;
  }

  const targetIndex = args.index ?? state.nextIndex;
  const cse = corpus.find((c) => c.index === targetIndex) ?? corpus[targetIndex - 1];
  if (!cse) {
    console.log(
      JSON.stringify({
        done: true,
        message: `No case at index ${targetIndex}; corpus size ${corpus.length}`,
        state,
      })
    );
    return;
  }

  applyModeEnv(args.mode);
  const { runIntakeIntelligence } = await import('@/intake/intelligence-engine/orchestrator');
  const { formatIntakeAnalyzeResponse } = await import('@/lib/need-intake/intake-analyze-response');
  const { scoreEstateParagraphCase } = await import('@/lib/need-intake/estate/estate-paragraph-oracle');

  const started = Date.now();
  let scored: OracleCaseResult;
  let projection: AnalyzeProjection | null = null;
  try {
    const result = await runIntakeIntelligence({ text: cse.text }, { skipCache: true });
    const raw = formatIntakeAnalyzeResponse(result);
    const draft = raw.draft;
    const answers = (draft?.answers ?? {}) as Record<string, unknown>;
    projection = {
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
    scored = scoreEstateParagraphCase(cse, projection, args.mode);
  } catch (err) {
    scored = {
      id: cse.id,
      mode: args.mode,
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
    index: cse.index,
    textPreview: cse.text.slice(0, 180),
    wordCount: cse.text.trim().split(/\s+/).length,
    oracle: cse.oracle,
    tags: cse.tags,
    projection,
    latencyMs: Date.now() - started,
    at: new Date().toISOString(),
  };

  appendFileSync(RESULTS, JSON.stringify(row) + '\n');
  if (!scored.passedHard) appendFileSync(FAILURES, JSON.stringify(row) + '\n');

  if (!args.retest) {
    if (scored.passedHard) state.passed += 1;
    else state.failed += 1;
    state.lastId = cse.id;
    if (targetIndex >= state.nextIndex) state.nextIndex = targetIndex + 1;
    saveState(state);
  }

  writeFileSync(LAST, JSON.stringify(row, null, 2));

  const failedFields = scored.fields.filter((f) => !f.passed);
  console.log(
    JSON.stringify(
      {
        tick: true,
        id: cse.id,
        index: cse.index,
        mode: args.mode,
        passedHard: scored.passedHard,
        taxonomy: scored.taxonomy,
        failedFields,
        projection: projection
          ? {
              categorySlug: projection.categorySlug,
              subcategorySlug: projection.subcategorySlug,
              city: projection.city,
              neighborhood: projection.neighborhood,
              area: projection.area,
              rooms: projection.rooms,
              transactionType: projection.transactionType,
              dealType: projection.dealType,
              budgetMax: projection.budgetMax,
              rahnAmount: projection.rahnAmount,
              monthlyRent: projection.monthlyRent,
            }
          : null,
        oracle: {
          leaf: cse.oracle.leaf,
          deal: cse.oracle.deal,
          city: cse.oracle.city,
          neighborhood: cse.oracle.neighborhood,
          area: cse.oracle.area,
          rooms: cse.oracle.rooms,
        },
        state,
        nextAction: scored.passedHard
          ? 'advance'
          : 'root_cause_and_fix_then_retest',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
