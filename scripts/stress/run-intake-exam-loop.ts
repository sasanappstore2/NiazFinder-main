/**
 * Intake exam loop: run batches of 50, stop when error rate < threshold, report top failures.
 *
 *   npm run test:intake-exam-loop
 *   npm run test:intake-exam-loop -- --rounds 5 --batch 50 --max-errors 9
 */
import './intake-marathon/stub-server-only';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { checkLocalModelHealth } from '@/lib/need-intake/local-chat-client';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { buildTestProfiles } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import { getCategoryPath } from '@/config/categories';
import {
  generateRealisticNeed,
  templateFallback,
} from '@/intake/intelligence-engine/fixtures/realistic-need-generator';
import {
  evaluateMarathonCase,
  summarizeMarathonResults,
  type MarathonCaseResult,
} from './intake-marathon/marathon-evaluator';

function parseArgs() {
  const args = process.argv.slice(2);
  let batch = 50;
  let rounds = 3;
  let maxErrors = 9;
  let source: 'gemma' | 'template' | 'mixed' = 'gemma';
  let startRound = 1;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) batch = Math.max(1, Number(args[i + 1]) || batch);
    if (args[i] === '--rounds' && args[i + 1]) rounds = Math.max(1, Number(args[i + 1]) || rounds);
    if (args[i] === '--max-errors' && args[i + 1]) {
      maxErrors = Math.max(0, Number(args[i + 1]) || maxErrors);
    }
    if (args[i] === '--round' && args[i + 1]) startRound = Math.max(1, Number(args[i + 1]) || 1);
    if (args[i] === '--source' && args[i + 1]) {
      const s = args[i + 1]!;
      if (s === 'gemma' || s === 'template' || s === 'mixed') source = s;
    }
  }

  return { batch, rounds, maxErrors, source, startRound };
}

function pickProfile(index: number): CategoryTestProfile {
  const round = Math.floor(index / 50) + 1;
  const batch = buildTestProfiles(50, round);
  return batch[index % batch.length]!;
}

function formHints(profile: CategoryTestProfile) {
  const catPath = getCategoryPath(profile.categorySlug);
  const leaf = catPath[catPath.length - 1];
  const parent = catPath.length >= 2 ? catPath[catPath.length - 2] : undefined;
  const isLeaf = leaf?.depth === 2;
  return {
    categorySlug: isLeaf ? (parent?.slug ?? profile.categorySlug) : profile.categorySlug,
    subcategorySlug: isLeaf ? profile.categorySlug : undefined,
    categoryLockedByUser: false,
  };
}

async function generateText(
  index: number,
  profile: CategoryTestProfile,
  source: 'gemma' | 'template' | 'mixed'
): Promise<{ text: string; source: 'gemma' | 'template' }> {
  const mode =
    source === 'mixed'
      ? (['gemma', 'template'] as const)[index % 2]!
      : source;

  if (mode === 'template') {
    return { text: templateFallback(profile), source: 'template' };
  }

  try {
    const gen = await generateRealisticNeed(profile);
    return {
      text: gen.text,
      source: gen.source === 'gemma' ? 'gemma' : 'template',
    };
  } catch {
    return { text: templateFallback(profile), source: 'template' };
  }
}

function topErrorCodes(results: MarathonCaseResult[]): string[] {
  const counts = new Map<string, number>();
  for (const r of results) {
    if (r.ok) continue;
    for (const issue of r.issues) {
      if (issue.severity !== 'error') continue;
      const key = `${issue.code}: ${issue.message}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([k, v]) => `${v}x ${k}`);
}

async function runBatch(
  round: number,
  batch: number,
  source: 'gemma' | 'template' | 'mixed'
): Promise<MarathonCaseResult[]> {
  const results: MarathonCaseResult[] = [];
  const baseIndex = (round - 1) * batch;

  for (let i = 0; i < batch; i++) {
    const globalIndex = baseIndex + i;
    const profile = pickProfile(globalIndex);
    process.stdout.write(`\r  round ${round} case ${i + 1}/${batch} (${profile.categorySlug})...`);

    const { text, source: textSource } = await generateText(globalIndex, profile, source);
    clearIntelligenceCache();
    const t0 = Date.now();
    const result = await runIntakeIntelligence(
      { text, forceAi: true, formHints: formHints(profile) },
      { skipCache: true }
    );
    const latencyMs = result.meta.latencyMs ?? Date.now() - t0;
    results.push(
      evaluateMarathonCase(
        { index: globalIndex, profile, text, source: textSource },
        result,
        latencyMs
      )
    );
  }
  console.log('');
  return results;
}

async function main(): Promise<void> {
  const { batch, rounds, maxErrors, source, startRound } = parseArgs();

  process.env.NEED_INTAKE_LLM_ENABLED = 'true';
  process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
  process.env.AI_PROVIDER = 'local-llm';
  process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_LLM_TIMEOUT_MS = '45000';

  const health = await checkLocalModelHealth();
  const effectiveSource = health.ok ? source : 'template';
  if (!health.ok && source === 'gemma') {
    console.warn('WARN: :8100 down — using template text for generation');
  }

  const outDir = path.join(process.cwd(), 'data/intake-marathon/exam-loops');
  await mkdir(outDir, { recursive: true });

  console.log(
    `Intake exam loop | batch=${batch} | rounds=${rounds} | maxErrors=${maxErrors} | source=${effectiveSource} | llm=${health.ok ? 'up' : 'down'}`
  );

  for (let r = startRound; r < startRound + rounds; r++) {
    const results = await runBatch(r, batch, effectiveSource);
    const summary = summarizeMarathonResults(results);
    const reportPath = path.join(outDir, `exam-round-${r}-${Date.now()}.json`);
    await writeFile(
      reportPath,
      JSON.stringify({ round: r, summary, topErrors: topErrorCodes(results), results }, null, 2),
      'utf8'
    );

    console.log(
      `Round ${r}: ${summary.passed}/${summary.total} pass (${(summary.passRate * 100).toFixed(1)}%) | fails=${summary.failed} | report=${reportPath}`
    );
    if (summary.failed > 0) {
      console.log('Top errors:');
      for (const line of topErrorCodes(results)) console.log(`  - ${line}`);
    }

    if (summary.failed <= maxErrors) {
      console.log(`\nExam OK — ${summary.failed} errors <= ${maxErrors} threshold`);
      process.exit(0);
    }

    console.log(`\nRound ${r} exceeded threshold (${summary.failed} > ${maxErrors}) — fix rules and re-run`);
    process.exit(2);
  }

  console.error('FAIL: max rounds without passing threshold');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
