/**
 * Human-like intake marathon: batches of 10 → diagnose → patch rules → next 10 → until 10k.
 *
 * Run:
 *   npm run test:intake-human-marathon:smoke     # 1 batch (10 cases)
 *   npm run test:intake-human-marathon -- --count 1000 --resume
 *   npm run test:intake-human-marathon:10k       # full 10k with auto-resume
 *
 * Output: data/intake-human-marathon/run-{id}/
 *   results.jsonl, failures.jsonl, state.json, batch-reports/, next-needs.jsonl
 */
import './intake-marathon/stub-server-only';
import { appendFile, mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { checkLocalModelHealth } from '@/lib/need-intake/local-chat-client';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { getCategoryPath } from '@/config/categories';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import {
  evaluateMarathonCase,
  summarizeMarathonResults,
  type MarathonCaseResult,
} from './intake-marathon/marathon-evaluator';
import { diagnoseBatch } from './intake-marathon/batch-diagnostics';
import { patchRulesFromFailures } from './intake-marathon/marathon-rule-patcher';
import {
  composeHumanNeedBatch,
  type HumanNeedCase,
} from './intake-marathon/human-need-composer';

const BATCH_SIZE = 10;

interface HumanMarathonState {
  runId: string;
  total: number;
  completed: number;
  batchIndex: number;
  startedAt: string;
  updatedAt: string;
  rulesPatched: number;
  prioritySlugs: string[];
  useLlmCompose: boolean;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let count = 10_000;
  let resume = false;
  let runId = '';
  let forceAi = process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true';
  let lockCategory = false;
  let templateOnly = false;
  let batchSize = BATCH_SIZE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) count = Math.max(1, Number(args[i + 1]) || count);
    if (args[i] === '--resume') resume = true;
    if (args[i] === '--run-id' && args[i + 1]) runId = args[i + 1]!;
    if (args[i] === '--force-ai') forceAi = true;
    if (args[i] === '--lock-category') lockCategory = true;
    if (args[i] === '--template-only') templateOnly = true;
    if (args[i] === '--batch-size' && args[i + 1]) {
      batchSize = Math.max(1, Number(args[i + 1]) || BATCH_SIZE);
    }
  }

  return { count, resume, runId, forceAi, lockCategory, templateOnly, batchSize };
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
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

async function loadState(runDir: string): Promise<HumanMarathonState | null> {
  try {
    const raw = await readFile(path.join(runDir, 'state.json'), 'utf8');
    return JSON.parse(raw) as HumanMarathonState;
  } catch {
    return null;
  }
}

async function saveState(runDir: string, state: HumanMarathonState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await writeFile(path.join(runDir, 'state.json'), JSON.stringify(state, null, 2), 'utf8');
}

async function appendResult(runDir: string, result: MarathonCaseResult): Promise<void> {
  await appendFile(path.join(runDir, 'results.jsonl'), `${JSON.stringify(result)}\n`, 'utf8');
  if (!result.ok) {
    await appendFile(path.join(runDir, 'failures.jsonl'), `${JSON.stringify(result)}\n`, 'utf8');
  }
}

async function analyzeCase(
  humanCase: HumanNeedCase,
  globalIndex: number,
  forceAi: boolean,
  lockCategory: boolean
): Promise<MarathonCaseResult> {
  try {
    clearIntelligenceCache();
    const t0 = Date.now();
    const result = await runIntakeIntelligence(
      {
        text: humanCase.text,
        forceAi,
        formHints: formHintsForProfile(humanCase.profile, lockCategory),
      },
      { skipCache: true }
    );
    const latencyMs = result.meta.latencyMs ?? Date.now() - t0;
    const evaluated = evaluateMarathonCase(
      {
        index: globalIndex,
        profile: humanCase.profile,
        text: humanCase.text,
        source: humanCase.source,
      },
      result,
      latencyMs
    );
    return { ...evaluated, source: `${humanCase.source}+${humanCase.tone}` };
  } catch (e) {
    return {
      index: globalIndex,
      id: humanCase.profile.id,
      categorySlug: humanCase.profile.categorySlug,
      vertical: humanCase.profile.vertical,
      text: humanCase.text,
      source: `${humanCase.source}+${humanCase.tone}`,
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
}

async function runBatch(
  runDir: string,
  state: HumanMarathonState,
  batchSize: number,
  forceAi: boolean,
  lockCategory: boolean
): Promise<MarathonCaseResult[]> {
  const globalStart = state.completed;
  const batchIndex = state.batchIndex;

  console.log(`\n=== Batch ${batchIndex + 1} | cases ${globalStart + 1}-${Math.min(globalStart + batchSize, state.total)} ===`);

  const humanCases = await composeHumanNeedBatch(
    batchIndex,
    batchSize,
    globalStart,
    state.prioritySlugs,
    state.useLlmCompose
  );

  await appendFile(
    path.join(runDir, 'next-needs.jsonl'),
    humanCases.map((c) => JSON.stringify({ batchIndex, tone: c.tone, text: c.text, category: c.profile.categorySlug })).join('\n') + '\n',
    'utf8'
  );

  const results: MarathonCaseResult[] = [];
  for (let i = 0; i < humanCases.length; i++) {
    const hc = humanCases[i]!;
    process.stdout.write(`\r  analyze ${i + 1}/${humanCases.length} (${hc.profile.categorySlug})...`);
    const r = await analyzeCase(hc, globalStart + i, forceAi, lockCategory);
    results.push(r);
    await appendResult(runDir, r);
    state.completed = globalStart + i + 1;
    await saveState(runDir, state);
  }
  console.log('');

  const diagnostic = diagnoseBatch(batchIndex, results);
  const reportsDir = path.join(runDir, 'batch-reports');
  await mkdir(reportsDir, { recursive: true });
  await writeFile(
    path.join(reportsDir, `batch-${String(batchIndex).padStart(5, '0')}.json`),
    JSON.stringify(diagnostic, null, 2),
    'utf8'
  );

  console.log(
    `  batch result: ${diagnostic.passed}/${diagnostic.size} pass (${Math.round(diagnostic.passRate * 100)}%)`
  );
  if (Object.keys(diagnostic.issueCounts).length) {
    console.log('  issues:', JSON.stringify(diagnostic.issueCounts));
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length > 0) {
    const patch = patchRulesFromFailures(failures);
    state.rulesPatched += patch.added;
    if (patch.added > 0) {
      console.log(`  rules patched: +${patch.added} keywords (total patched: ${state.rulesPatched})`);
    }

    const priority = new Set(state.prioritySlugs);
    for (const f of failures.slice(0, 5)) {
      priority.add(f.categorySlug);
    }
    state.prioritySlugs = [...priority].slice(-30);
  } else {
    state.prioritySlugs = [];
  }

  state.batchIndex++;
  await saveState(runDir, state);

  if (diagnostic.recommendations.length) {
    console.log('  recommendations:', diagnostic.recommendations.join(' | '));
  }

  return results;
}

async function main(): Promise<void> {
  const { count, resume, runId: argRunId, forceAi, lockCategory, templateOnly, batchSize } = parseArgs();

  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_LLM_TIMEOUT_MS = process.env.NEED_INTAKE_LLM_TIMEOUT_MS ?? '120000';
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';

  const health = await checkLocalModelHealth();
  const useLlmCompose = !templateOnly && health.ok;

  if (!health.ok && !templateOnly) {
    console.warn('WARN: LM Studio unreachable — composing needs from templates only');
    console.warn('  ', health.loadError);
  }

  const root = path.join(process.cwd(), 'data/intake-human-marathon');
  await mkdir(root, { recursive: true });

  let runDir: string;
  let state: HumanMarathonState;

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
    const dirs = (await readdir(root)).filter((d) => d.startsWith('run-')).sort().reverse();
    let picked: HumanMarathonState | null = null;
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
      const runId = argRunId || `run-${stamp()}`;
      runDir = path.join(root, runId);
      await mkdir(runDir, { recursive: true });
      state = {
        runId,
        total: count,
        completed: 0,
        batchIndex: 0,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rulesPatched: 0,
        prioritySlugs: [],
        useLlmCompose,
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
      batchIndex: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rulesPatched: 0,
      prioritySlugs: [],
      useLlmCompose,
    };
    await saveState(runDir, state);
  }

  console.log(
    `Human intake marathon | model=${health.modelId ?? 'template'} | ${state.completed}/${state.total} | batch=${batchSize} | compose=${useLlmCompose ? 'llm' : 'template'} | out=${runDir}`
  );

  while (state.completed < state.total) {
    const remaining = state.total - state.completed;
    const thisBatch = Math.min(batchSize, remaining);

    try {
      await runBatch(runDir, state, thisBatch, forceAi, lockCategory);
    } catch (e) {
      console.error(`\nBATCH CRASH at ${state.completed}/${state.total}:`, e);
      await saveState(runDir, state);
      process.exitCode = 2;
      throw e;
    }

    if (state.completed % 100 === 0 || state.completed === state.total) {
      const lines = (await readFile(path.join(runDir, 'results.jsonl'), 'utf8').catch(() => ''))
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as MarathonCaseResult);
      const summary = summarizeMarathonResults(lines);
      await writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
      console.log(`\n--- checkpoint ${state.completed}/${state.total} | pass rate ${Math.round(summary.passRate * 100)}% ---`);
    }
  }

  const allLines = (await readFile(path.join(runDir, 'results.jsonl'), 'utf8').catch(() => ''))
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as MarathonCaseResult);

  const summary = summarizeMarathonResults(allLines);
  await writeFile(path.join(runDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('\n=== Human marathon complete ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nResults: ${runDir}/results.jsonl`);
  console.log(`Rules patched total: ${state.rulesPatched}`);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
