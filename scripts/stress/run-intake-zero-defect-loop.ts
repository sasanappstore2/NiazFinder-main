/**
 * Zero-defect intake loop: 50 category-diverse realistic needs via Gemma,
 * validate AI+intake sync (category, money, area, next questions, listing).
 *
 * Run:
 *   npm run test:intake-zero-defect-loop
 *   npm run test:intake-zero-defect-loop -- --count 10 --round 2
 *
 * Exits 0 only when every case passes strict quality (errors + warns).
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { checkLocalModelHealth } from '@/lib/need-intake/local-chat-client';
import { runIntakeIntelligence } from '@/intake/intelligence-engine';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { buildTestProfiles } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import type { CategoryTestProfile } from '@/intake/intelligence-engine/fixtures/category-test-matrix';
import { getCategoryPath } from '@/config/categories';
import {
  formatIssues,
  hasBlockingIssues,
  validateIntakeQuality,
} from '@/intake/intelligence-engine/fixtures/intake-quality-validator';
import {
  generateNeedBatch,
  templateFallback,
  type GeneratedNeedCase,
} from '@/intake/intelligence-engine/fixtures/realistic-need-generator';

const DEFAULT_COUNT = 50;

interface CaseResult {
  id: string;
  categorySlug: string;
  vertical: string;
  text: string;
  source: string;
  ok: boolean;
  latencyMs: number;
  resolvedCategory: string | null;
  templateId: string | null;
  aiInvoked: boolean;
  truthCorrected: string[];
  issues: ReturnType<typeof validateIntakeQuality>;
  error?: string;
}

function parseArgs(): {
  count: number;
  round: number;
  maxRounds: number;
  skipGenerate: boolean;
  forceAi: boolean;
  lockCategory: boolean;
  noAi: boolean;
} {
  const args = process.argv.slice(2);
  let count = DEFAULT_COUNT;
  let round = 1;
  let maxRounds = 1;
  let skipGenerate = false;
  let forceAi = process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS === 'true';
  let lockCategory = true;
  let noAi = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) count = Math.max(1, Number(args[i + 1]) || DEFAULT_COUNT);
    if (args[i] === '--round' && args[i + 1]) round = Math.max(1, Number(args[i + 1]) || 1);
    if (args[i] === '--max-rounds' && args[i + 1]) {
      maxRounds = Math.max(1, Number(args[i + 1]) || 1);
    }
    if (args[i] === '--skip-generate') skipGenerate = true;
    if (args[i] === '--force-ai') forceAi = true;
    if (args[i] === '--no-ai') noAi = true;
    if (args[i] === '--free-classify') lockCategory = false;
    if (args[i] === '--lock-category') lockCategory = true;
  }

  if (noAi) forceAi = false;

  return { count, round, maxRounds, skipGenerate, forceAi, lockCategory, noAi };
}

function formHintsForProfile(profile: CategoryTestProfile, lockCategory: boolean) {
  const path = getCategoryPath(profile.categorySlug);
  const leaf = path[path.length - 1];
  const parent = path.length >= 2 ? path[path.length - 2] : undefined;
  const isLeaf = leaf?.depth === 2;

  return {
    categorySlug: isLeaf ? (parent?.slug ?? profile.categorySlug) : profile.categorySlug,
    subcategorySlug: isLeaf ? profile.categorySlug : undefined,
    categoryLockedByUser: lockCategory,
  };
}

async function runBatch(
  cases: GeneratedNeedCase[],
  forceAi: boolean,
  lockCategory: boolean
): Promise<CaseResult[]> {
  const results: CaseResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i]!;
    process.stdout.write(`\r  intake ${i + 1}/${cases.length} (${c.profile.categorySlug})...`);

    try {
      const t0 = Date.now();
      const result = await runIntakeIntelligence(
        {
          text: c.text,
          forceAi,
          formHints: formHintsForProfile(c.profile, lockCategory),
        },
        { skipCache: true }
      );
      const latencyMs = result.meta.latencyMs ?? Date.now() - t0;

      const issues = validateIntakeQuality(result, {
        text: c.text,
        profile: c.profile,
        latencyMs,
      });

      const resolved =
        result.fields.subcategorySlug?.value ??
        result.fields.categorySlug?.value ??
        result.draft.parsedIntent.subcategorySlug ??
        result.draft.parsedIntent.categorySlug ??
        null;

      results.push({
        id: c.profile.id,
        categorySlug: c.profile.categorySlug,
        vertical: c.profile.vertical,
        text: c.text,
        source: c.source,
        ok: !hasBlockingIssues(issues, true),
        latencyMs,
        resolvedCategory: resolved ? String(resolved) : null,
        templateId: result.draft.templateId ?? null,
        aiInvoked: Boolean(result.meta.aiInvoked),
        truthCorrected: result.meta.truthVerifyCorrected ?? [],
        issues,
      });
    } catch (e) {
      results.push({
        id: c.profile.id,
        categorySlug: c.profile.categorySlug,
        vertical: c.profile.vertical,
        text: c.text,
        source: c.source,
        ok: false,
        latencyMs: 0,
        resolvedCategory: null,
        templateId: null,
        aiInvoked: false,
        truthCorrected: [],
        issues: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  console.log('');
  return results;
}

function summarize(results: CaseResult[]) {
  const failed = results.filter((r) => !r.ok);
  const issueCounts: Record<string, number> = {};
  for (const r of results) {
    for (const iss of r.issues) {
      issueCounts[iss.code] = (issueCounts[iss.code] ?? 0) + 1;
    }
  }
  const latencies = results.map((r) => r.latencyMs).filter((n) => n > 0);
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;

  return {
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    aiInvoked: results.filter((r) => r.aiInvoked).length,
    truthCorrected: results.filter((r) => r.truthCorrected.length > 0).length,
    latencyP50Ms: p50,
    issueCounts,
    failures: failed.map((r) => ({
      id: r.id,
      category: r.categorySlug,
      resolved: r.resolvedCategory,
      error: r.error,
      issues: formatIssues(r.issues),
      text: r.text.slice(0, 120),
    })),
  };
}

async function main(): Promise<void> {
  const { count, round: startRound, maxRounds, skipGenerate, forceAi, lockCategory, noAi } =
    parseArgs();

  if (noAi) {
    process.env.NEED_INTAKE_RULES_ONLY = 'true';
    process.env.NEED_INTAKE_LLM_ENABLED = 'false';
    process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'false';
    process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'false';
    process.env.NEED_INTAKE_TRUTH_VERIFY_ALWAYS = 'false';
  } else {
    process.env.NEED_INTAKE_LLM_ENABLED = 'true';
    process.env.AI_SEMANTIC_RESOLVER_ENABLED = 'true';
    process.env.AI_PROVIDER = 'local-llm';
    process.env.NEED_INTAKE_TRUTH_VERIFY_ENABLED = 'true';
  }
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_LLM_TIMEOUT_MS = '25000';

  let modelId = 'rules-only';
  if (!noAi) {
    const health = await checkLocalModelHealth();
    if (!health.ok) {
      console.error('FAIL: local LLM not reachable ? start LM Studio on :1234');
      console.error('  ', health.loadError);
      process.exit(1);
    }
    modelId = health.modelId;
    console.log(
      `zero-defect loop | model=${modelId} | count=${count} | rounds=${startRound}..${startRound + maxRounds - 1} | forceAi=${forceAi} | lockCategory=${lockCategory}`
    );
  } else {
    console.log(
      `zero-defect loop (rules-only) | count=${count} | rounds=${startRound}..${startRound + maxRounds - 1} | lockCategory=${lockCategory}`
    );
  }

  clearIntelligenceCache();

  const outDir = path.join(process.cwd(), 'reports');
  await mkdir(outDir, { recursive: true });

  for (let roundOffset = 0; roundOffset < maxRounds; roundOffset++) {
    const round = startRound + roundOffset;
    console.log(`\n=== round ${round} ===`);

    const profiles = buildTestProfiles(count, round);
    console.log(`profiles: ${profiles.length} categories (${new Set(profiles.map((p) => p.vertical)).size} verticals)`);

    let cases: GeneratedNeedCase[];
    if (skipGenerate || noAi) {
      cases = profiles.map((p) => ({
        profile: p,
        text: templateFallback(p),
        source: 'template' as const,
      }));
    } else {
      cases = await generateNeedBatch(profiles);
    }

    const results = await runBatch(cases, forceAi, lockCategory);
    const summary = summarize(results);

    const reportPath = path.join(outDir, `zero-defect-round-${round}-${Date.now()}.json`);
    await writeFile(
      reportPath,
      JSON.stringify({ at: new Date().toISOString(), round, model: modelId, summary, results }, null, 2),
      'utf8'
    );

    console.log('--- round summary ---');
    console.log(`passed: ${summary.passed}/${summary.total} | ai: ${summary.aiInvoked} | truth fixes: ${summary.truthCorrected}`);
    console.log(`latency p50: ${summary.latencyP50Ms}ms`);
    if (Object.keys(summary.issueCounts).length) {
      console.log('issues:', summary.issueCounts);
    }
    if (summary.failures.length) {
      console.log('failures (first 8):');
      for (const f of summary.failures.slice(0, 8)) {
        console.log(`  [${f.category}] ${f.issues || f.error}`);
        console.log(`    text: ${f.text}`);
      }
    }
    console.log(`report: ${reportPath}`);

    if (summary.failed === 0) {
      console.log(`\nzero-defect OK ? ${summary.total}/${summary.total} clean on round ${round}`);
      return;
    }

    if (roundOffset < maxRounds - 1) {
      console.log(`\n${summary.failed} failures ? retry round ${round + 1} with fresh profiles`);
      clearIntelligenceCache();
    }
  }

  console.error('\nFAIL: zero-defect target not reached after max rounds ? fix reported issues and re-run');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
