/**
 * Production gate baseline report for /post.
 * Run: npm run test:post-gate-baseline
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runPostGoldenMatrixSelfTest } from '@/lib/need-intake/fixtures/run-post-pipeline-self-test';
import { checkQwenIntakeHealth, getNeedIntakeLlmBaseUrl } from '@/lib/need-intake/qwen-intake-client';

const OUT = join(process.cwd(), 'data', 'need-intake-training', 'post-gate-baseline.json');

function runCmd(cmd: string): { ok: boolean; output: string } {
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, output: output.trim() };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string };
    return { ok: false, output: [err.stdout, err.stderr].filter(Boolean).join('\n').trim() };
  }
}

async function main(): Promise<void> {
  const tsc = runCmd('npx tsc --noEmit 2>&1');
  const postIntake = runCmd(
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-intake-scenarios-self-test.ts 2>&1'
  );
  const prefillSmoke = runCmd(
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-prefill-100k-self-test.ts --smoke 2>&1'
  );

  const golden = runPostGoldenMatrixSelfTest();
  const mlxHealth = await checkQwenIntakeHealth().catch(() => ({ ok: false, loadError: 'unreachable' }));

  let estateBenchmarkLlm: { ok: boolean; output: string } | null = null;
  if (mlxHealth.ok) {
    estateBenchmarkLlm = runCmd(
      'NEED_INTAKE_LLM_ENABLED=true npx --yes tsx src/lib/need-intake/estate/run-estate-benchmark.ts --live-llm --report-md 2>&1'
    );
  }

  const prefillMatch = prefillSmoke.output.match(/(\d+)\/(\d+).*?([\d.]+)%/);
  const report = {
    generatedAt: new Date().toISOString(),
    env: {
      NEED_INTAKE_LLM_ENABLED: process.env.NEED_INTAKE_LLM_ENABLED ?? '(unset)',
      NEED_INTAKE_COPY_AI_ENABLED: process.env.NEED_INTAKE_COPY_AI_ENABLED ?? '(unset)',
      NEED_INTAKE_LLM_URL: getNeedIntakeLlmBaseUrl(),
    },
    tsc: { ok: tsc.ok },
    postIntakeScenarios: { ok: postIntake.ok, tail: postIntake.output.split('\n').slice(-3) },
    prefill100kSmoke: {
      ok: prefillSmoke.ok,
      passed: prefillMatch ? Number(prefillMatch[1]) : null,
      total: prefillMatch ? Number(prefillMatch[2]) : null,
      passRate: prefillMatch ? Number(prefillMatch[3]) / 100 : null,
    },
    postGoldenMatrix: golden,
    mlxHealth,
    estateBenchmarkLlm: estateBenchmarkLlm
      ? { ok: estateBenchmarkLlm.ok, tail: estateBenchmarkLlm.output.split('\n').slice(-5) }
      : { skipped: true, reason: 'MLX unavailable' },
  };

  mkdirSync(join(process.cwd(), 'data', 'need-intake-training'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8');
  console.log(`Wrote ${OUT}`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
