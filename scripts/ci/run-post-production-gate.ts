/**
 * Unified production gate for /post — smoke (~3–5 min) and full (nightly).
 *
 * Run:
 *   npm run test:post-production-gate:smoke
 *   npm run test:post-production-gate:full
 */
import { execSync } from 'node:child_process';

const args = new Set(process.argv.slice(2));
const mode = args.has('--full') ? 'full' : 'smoke';

function run(label: string, cmd: string): void {
  console.log(`\n▶ ${label}`);
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
  } catch {
    console.error(`\n✗ ${label} FAILED`);
    process.exit(1);
  }
  console.log(`✓ ${label}`);
}

const stepsSmoke = [
  ['tsc', 'npx tsc --noEmit'],
  [
    'client-server boundaries',
    'npx --yes tsx scripts/ci/check-client-server-boundaries.ts',
  ],
  [
    'post-queue-wizard',
    'NEED_INTAKE_LLM_ENABLED=false INTAKE_QUEUE_SYNC_FALLBACK=true npx --yes tsx src/intake/fixtures/run-post-queue-wizard-self-test.ts',
  ],
  [
    'post-pipeline golden',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-pipeline-self-test.ts',
  ],
  [
    'rules-coverage-gate',
    'npm run test:rules-coverage-gate',
  ],
  [
    'post-intake-scenarios',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-intake-scenarios-self-test.ts',
  ],
  [
    'listing-title-scenarios',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-listing-title-scenarios-self-test.ts',
  ],
  [
    'post-estate-scenarios',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-estate-scenario-self-test.ts',
  ],
  [
    'post-mlx-gate (required)',
    'NEED_INTAKE_LLM_ENABLED=true NEED_INTAKE_COPY_AI_ENABLED=true npx --yes tsx src/lib/need-intake/fixtures/run-post-mlx-gate-self-test.ts',
  ],
  [
    'post-api-smoke',
    'NEED_INTAKE_LLM_ENABLED=true npx --yes tsx scripts/health/smoke-post-intake-api.ts',
  ],
  [
    'prefill-100k smoke',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-prefill-100k-self-test.ts --smoke',
  ],
];

const stepsFull = [
  ...stepsSmoke,
  [
    'post-pipeline 100k subset',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-post-pipeline-100k-subset-self-test.ts',
  ],
  [
    'prefill-100k full',
    'NEED_INTAKE_LLM_ENABLED=false npx --yes tsx src/lib/need-intake/fixtures/run-prefill-100k-self-test.ts',
  ],
  [
    'estate-benchmark llm',
    'NEED_INTAKE_LLM_ENABLED=true npx --yes tsx src/lib/need-intake/estate/run-estate-benchmark.ts --live-llm --report-md',
  ],
];

console.log(`post-production-gate (${mode})`);

for (const [label, cmd] of mode === 'full' ? stepsFull : stepsSmoke) {
  run(label, cmd);
}

console.log(`\n✓ post-production-gate:${mode} — all stages passed`);
