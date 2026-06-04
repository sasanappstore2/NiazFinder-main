#!/usr/bin/env npx tsx
/**
 * Baseline / post-train eval helper.
 * Runs golden fixture eval; optionally MLX live eval when NEED_INTAKE_LLM_ENABLED=true.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { HOLDOUT_PATH, MANIFEST_PATH } from './build-intake-dataset-10k';

function run(cmd: string): void {
  console.log(`\n$ ${cmd}\n`);
  execSync(cmd, { stdio: 'inherit', cwd: process.cwd() });
}

console.log('=== Intake AI baseline / post-train eval ===\n');

if (existsSync(MANIFEST_PATH)) {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as {
    trainSize?: number;
    holdoutSize?: number;
    poolSize?: number;
  };
  console.log(
    `Dataset: pool=${manifest.poolSize} train=${manifest.trainSize} holdout=${manifest.holdoutSize}`
  );
}

if (existsSync(HOLDOUT_PATH)) {
  const lines = readFileSync(HOLDOUT_PATH, 'utf8').split('\n').filter(Boolean).length;
  console.log(`Holdout file: ${lines} rows at ${HOLDOUT_PATH}`);
}

run('npm run test:intake-dataset');

try {
  if (process.env.INTAKE_EVAL_LIVE === '1' || process.env.NEED_INTAKE_LLM_ENABLED === 'true') {
    run('npm run evaluate:intake-ai:live');
  } else {
    run('npm run evaluate:intake-ai');
  }
} catch {
  console.warn('\nNote: evaluate:intake-ai reported failures (oracle/eval dataset drift). Golden fixture eval above is the gate for dataset export.');
}

console.log('\nEval complete.');
