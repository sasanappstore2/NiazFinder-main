/**
 * Intake marathon: generate → analyze → validate → debug RAG — one case at a time.
 *
 * Uses local Gemma (:8100) ONLY for random Persian text generation.
 * Runs YOUR intake intelligence engine (rules + local LLM) on each case.
 *
 * Run:
 *   npm run test:intake-marathon:smoke          # 5 cases
 *   npm run test:intake-marathon -- --count 100
 *   npm run test:intake-marathon:10k            # 10k with resume
 *   npm run test:intake-marathon -- --count 10000 --resume --source divar
 *
 * Output: data/intake-marathon/run-{stamp}/results.jsonl + state.json + summary.json
 */
import './intake-marathon/stub-server-only';
import { appendFile, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { checkLocalModelHealth } from '@/lib/need-intake/local-chat-client';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { buildTestProfiles } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import {
  generateRealisticNeed,
  templateFallback,
} from '@/intake/intelligence-engine/fixtures/realistic-need-generator';
import { getCategoryPath } from '@/config/categories';
import {
  evaluateMarathonCase,
  summarizeMarathonResults,
  type MarathonCaseResult,
} from './intake-marathon/marathon-evaluator';
import { fetchDivarNeedText, loadDivarCache, saveDivarCache } from './intake-marathon/divar-source';

interface MarathonState {
  runId: string;
  total: number;
  completed: number;
  startedAt: string;
  updatedAt: string;
  source: string;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 10_000;
  let resume = false;
  let source: 'gemma' | 'template' | 'divar' | 'mixed' = 'gemma';
  let runId = '';
  let forceAi = process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true';
  let lockCategory = false;
  let delayMs = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) count = Math.max(1, Number(args[i + 1]) || count);
    if (args[i] === '--resume') resume = true;
    if (args[i] === '--run-id' && args[i + 1]) runId = args[i + 1]!;
    if (args[i] === '--source' && args[i + 1]) {
      const s = args[i + 1]!;
      if (s === 'gemma' || s === 'template' || s === 'divar' || s === 'mixed') source = s;
    }
    if (args[i] === '--force-ai') forceAi = true;
    if (args[i] === '--lock-category') lockCategory = true;
    if (args[i] === '--delay-ms' && args[i + 1]) delayMs = Math.max(0, Number(args[i + 1]) || 0);
  }

  return { count, resume, source, runId, forceAi, lockCategory, delayMs };
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function pickProfile(index: number): CategoryTestProfile {
  const round = Math.floor(index / 50) + 1;
  const batch = buildTestProfiles(50, round);
  return batch[index % batch.length]!;
}

function formHintsForProfile(profile: CategoryTestProfile, lockCategory: boolean) {
  const catPath = getCategoryPath(profile.categorySlug);
  const leaf = catPath[catPath.length - 1];
  const parent = catPath.length >= 2 ? catPath[catPath.length - 2] : undefined;
  const isLeaf = leaf?.depth === 2;
  return {
    categorySlug: isLeaf ? (parent?.slug ?? profile.categorySlug) : profile.categorySlug,
    subcategorySlug: isLeaf ? profile.categorySlug : undefined,
    categoryLockedByUser: lockCategory,
  };
}

async function loadState(runDir: string): Promise<MarathonState | null> {
  try {
    const raw = await readFile(path.join(runDir, 'state.json'), 'utf8');
    return JSON.parse(raw) as MarathonState;
  } catch {
    return null;
  }
}

async function saveState(runDir: string, state: MarathonState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await writeFile(path.join(runDir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
}

async function appendResult(runDir: string, result: MarathonCaseResult): Promise<void> {
  await appendFile(path.join(runDir, 'results.jsonl'), `${JSON.stringify(result)}\n`, 'utf8');
  if (!result.ok) {
    await appendFile(
      path.join(runDir, 'failures.jsonl'),
      `${JSON.stringify(result)}\n`,
      'utf8'
    );
  }
}

async function generateCaseText(
  index: number,
  profile: CategoryTestProfile,
  source: 'gemma' | 'template' | 'divar' | 'mixed'
): Promise<{ text: string; source: 'gemma' | 'template' | 'divar' }> {
  const mode =
    source === 'mixed'
      ? (['gemma', 'template', 'divar'] as const)[index % 3]!
      : source;

  if (mode === 'template') {
    return { text: templateFallback(profile), source: 'template' };
  }

  if (mode === 'divar') {
    const text = await fetchDivarNeedText(profile, index);
    if (text) return { text, source: 'divar' };
    const generated = await generateRealisticNeed(profile);
    return { text: generated.text, source: generated.source === 'gemma' ? 'gemma' : 'template' };
  }

  const generated = await generateRealisticNeed(profile);
  return {
    text: generated.text,
    source: generated.source === 'gemma' ? 'gemma' : 'template',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main(): Promise<void> {
  const { count, resume, source, runId: argRunId, forceAi, lockCategory, delayMs } = parseArgs();

  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_LLM_TIMEOUT_MS = '120000';

  const health = await checkLocalModelHealth();
  if (!health.ok && source !== 'template') {
    console.error('FAIL: local LLM (:1234 LM Studio) not reachable — needed for text generation');
    console.error('  ', health.loadError);
    console.error('  Tip: use --source template for rules-only text, or start LM Studio on :1234');
    process.exit(1);
  }

  const root = path.join(process.cwd(), 'data/intake-marathon');
  await mkdir(root, { recursive: true });

  let runDir: string;
  let state: MarathonState;

  if (resume && argRunId) {
    runDir = path.join(root, argRunId);
    const existing = await loadState(runDir);
    if (!existing) {
      console.error(`No state.json in ${runDir}`);
      process.exit(1);
    }
    state = existing;
  } else if (resume) {
    const { readdir } = await import('fs/promises');
    const dirs = (await readdir(root))
      .filter((d) => d.startsWith('run-'))
      .sort()
      .reverse();
    let picked: MarathonState | null = null;
    for (const d of dirs) {
      const candidate = await loadState(path.join(root, d));
      if (candidate && candidate.completed < candidate.total) {
        runDir = path.join(root, d);
        state = candidate;
        picked = candidate;
        console.log(`Resuming ${runDir} at ${state.completed}/${state.total}`);
        break;
      }
    }
    if (!picked) {
      console.log('No incomplete run found ? starting fresh');
      const runId = argRunId || `run-${stamp()}`;
      runDir = path.join(root, runId);
      await mkdir(runDir, { recursive: true });
      state = {
        runId,
        total: count,
        completed: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source,
      };
      await saveState(runDir, state);
    }
  } else {
    const runId = argRunId || `run-${stamp()}`;
    runDir = path.join(root, runId);
    await mkdir(runDir, { recursive: true });
    state = {
      runId,
      total: count,
      completed: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source,
    };
    await saveState(runDir, state);
  }

  console.log(
    `Intake marathon | model=${health.modelId ?? 'n/a'} | ${state.completed}/${state.total} | source=${source} | forceAi=${forceAi} | out=${runDir}`
  );

  await loadDivarCache(runDir);

  const startIndex = state.completed;
  const allResults: MarathonCaseResult[] = [];

  for (let i = startIndex; i < state.total; i++) {
    const profile = pickProfile(i);
    process.stdout.write(
      `\r[${i + 1}/${state.total}] ${profile.categorySlug} — generate...`
    );

    let text: string;
    let textSource: 'gemma' | 'template' | 'divar';
    try {
      const gen = await generateCaseText(i, profile, source);
      text = gen.text;
      textSource = gen.source;
    } catch (e) {
      text = templateFallback(profile);
      textSource = 'template';
      console.warn(`\nWARN generate failed case ${i}: ${e instanceof Error ? e.message : e}`);
    }

    process.stdout.write(` analyze...`);

    let caseResult: MarathonCaseResult;
    try {
      clearIntelligenceCache();
      const t0 = Date.now();
      const result = await runIntakeIntelligence(
        {
          text,
          forceAi,
          formHints: formHintsForProfile(profile, lockCategory),
        },
        { skipCache: true }
      );
      const latencyMs = result.meta.latencyMs ?? Date.now() - t0;
      caseResult = evaluateMarathonCase(
        { index: i, profile, text, source: textSource },
        result,
        latencyMs
      );
    } catch (e) {
      caseResult = {
        index: i,
        id: profile.id,
        categorySlug: profile.categorySlug,
        vertical: profile.vertical,
        text,
        source: textSource,
        ok: false,
        latencyMs: 0,
        resolvedCategory: null,
        resolvedCity: null,
        resolvedNeighborhood: null,
        templateId: null,
        aiInvoked: false,
        truthCorrected: [],
        criticalFieldsExpected: [],
        criticalFieldsFilled: [],
        filterSuggestions: 0,
        issues: [],
        error: e instanceof Error ? e.message : String(e),
      };
    }

    allResults.push(caseResult);
    await appendResult(runDir, caseResult);

    state.completed = i + 1;
    await saveState(runDir, state);

    const status = caseResult.ok ? 'PASS' : 'FAIL';
    process.stdout.write(
      `\r[${i + 1}/${state.total}] ${status} | cat=${caseResult.resolvedCategory ?? '?'} | hood=${caseResult.resolvedNeighborhood ?? '-'} | ${caseResult.latencyMs}ms | ${text.slice(0, 40)}...\n`
    );

    if (delayMs > 0) await sleep(delayMs);
  }

  await saveDivarCache(runDir);

  const allLines = (await readFile(path.join(runDir, 'results.jsonl'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MarathonCaseResult);

  const summary = summarizeMarathonResults(allLines.length ? allLines : allResults);
  await writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Marathon summary ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nResults: ${runDir}/results.jsonl`);
  console.log(`Failures: ${runDir}/failures.jsonl`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
