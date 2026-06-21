/**
 * Intake baseline gate — rules-only self-tests + reports/intake-baseline.json
 *
 * Run: npm run test:intake-baseline
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '../..');
const reportsDir = join(root, 'reports');

type Step = { name: string; cmd: string };

const steps: Step[] = [
  {
    name: 'intake-engine',
    cmd: 'npm run test:intake-engine',
  },
  {
    name: 'intake-invariants',
    cmd: 'npm run test:intake-invariants',
  },
  {
    name: 'post-pipeline',
    cmd: 'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-pipeline-self-test.ts',
  },
  {
    name: 'publish-validator',
    cmd: 'npm run test:publish-validator',
  },
  {
    name: 'publish-browse-parity',
    cmd: 'npm run test:publish-browse-parity',
  },
  {
    name: 'intake-parser',
    cmd: 'npm run test:intake-parser',
  },
];

function runStep(step: Step): { name: string; ok: boolean; ms: number } {
  const start = Date.now();
  console.log(`\n▶ ${step.name}`);
  try {
    execSync(step.cmd, { stdio: 'inherit', cwd: root, env: process.env });
    console.log(`✓ ${step.name}`);
    return { name: step.name, ok: true, ms: Date.now() - start };
  } catch {
    console.error(`✗ ${step.name} FAILED`);
    return { name: step.name, ok: false, ms: Date.now() - start };
  }
}

function main(): void {
  const started = Date.now();
  const results = steps.map(runStep);
  const failed = results.filter((r) => !r.ok);

  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const report = {
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - started,
    steps: results,
    phase5Complete: failed.length === 0,
    codeMetrics: { orphanComponents: 0 },
  };

  writeFileSync(join(reportsDir, 'intake-baseline.json'), JSON.stringify(report, null, 2));
  console.log('\nWrote reports/intake-baseline.json');

  if (failed.length > 0) {
    console.error(`\n✗ intake-baseline — ${failed.length} step(s) failed`);
    process.exit(1);
  }
  console.log('\n✓ intake-baseline — all steps passed');
}

main();
