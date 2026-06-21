/**
 * Collect /post production gate baseline metrics.
 *
 * Run: npm run test:post-gate-baseline
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../..');
const reportsDir = join(root, 'reports');

function run(cmd: string): { ok: boolean; ms: number } {
  const start = Date.now();
  try {
    execSync(cmd, { stdio: 'inherit', cwd: root, env: process.env });
    return { ok: true, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

function main(): void {
  const started = Date.now();
  const postPipeline = run(
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-pipeline-self-test.ts'
  );
  const rulesCoverage = run('npm run test:rules-coverage-gate');

  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - started,
    postPipeline,
    rulesCoverage,
  };

  writeFileSync(join(reportsDir, 'post-gate-baseline.json'), JSON.stringify(report, null, 2));
  console.log('Wrote reports/post-gate-baseline.json');

  if (!postPipeline.ok || !rulesCoverage.ok) process.exit(1);
}

main();
