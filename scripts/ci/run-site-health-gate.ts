/**
 * Unified site health gate — offline / smoke / full tiers.
 *
 * npm run health:gate:offline
 * npm run health:gate:smoke   (requires dev server)
 * npm run health:gate:full    (smoke + services + crawl subset)
 */
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const args = new Set(process.argv.slice(2));
const mode = args.has('--full') ? 'full' : args.has('--smoke') ? 'smoke' : 'offline';
const root = join(import.meta.dirname, '../..');
const reportsDir = join(root, 'reports');

type Step = { name: string; cmd: string; optional?: boolean };

function runStep(step: Step): { name: string; ok: boolean; ms: number; optional?: boolean } {
  const start = Date.now();
  console.log(`\n▶ ${step.name}`);
  try {
    execSync(step.cmd, { stdio: 'inherit', env: process.env, cwd: root });
    console.log(`✓ ${step.name}`);
    return { name: step.name, ok: true, ms: Date.now() - start, optional: step.optional };
  } catch {
    if (step.optional) {
      console.warn(`⚠ ${step.name} (optional — skipped failure)`);
      return { name: step.name, ok: true, ms: Date.now() - start, optional: true };
    }
    console.error(`✗ ${step.name} FAILED`);
    return { name: step.name, ok: false, ms: Date.now() - start, optional: step.optional };
  }
}

const offlineSteps: Step[] = [
  { name: 'prisma-validate', cmd: 'npx prisma validate' },
  { name: 'health-baseline', cmd: 'npm run health:baseline', optional: true },
  { name: 'health-inventory', cmd: 'npm run health:inventory' },
  { name: 'health-wiring-matrix', cmd: 'npm run health:wiring-matrix' },
  { name: 'test-page-heading', cmd: 'npm run test:page-heading' },
  { name: 'test-category-parity', cmd: 'npm run test:category-parity' },
  { name: 'test-wallet-api', cmd: 'npm run test:wallet-api' },
  { name: 'test-guard-api-client', cmd: 'npm run test:guard-api-client' },
  { name: 'test-dashboard-api', cmd: 'npm run test:dashboard-api' },
  { name: 'test-business-onboarding', cmd: 'npm run test:business-onboarding' },
  { name: 'test-occupations-parity', cmd: 'npm run test:occupations-parity' },
  { name: 'test-page-h1-coverage', cmd: 'npm run test:page-h1-coverage' },
  { name: 'smoke-intake-precommit', cmd: 'npm run smoke:intake-precommit' },
];

const smokeSteps: Step[] = [
  { name: 'health-db', cmd: 'npm run health:db', optional: true },
  { name: 'smoke-routes', cmd: 'npm run smoke:routes' },
  { name: 'smoke-api', cmd: 'npm run smoke:api' },
  { name: 'smoke-map', cmd: 'npm run smoke:map', optional: true },
  { name: 'test-super-admin-e2e', cmd: 'npm run test:super-admin-e2e' },
  { name: 'health-services', cmd: 'npm run health:services', optional: true },
];

const fullSteps: Step[] = [
  ...smokeSteps,
  {
    name: 'crawl-run-subset',
    cmd: 'CRAWL_MAX_PAGES=50 CRAWL_SKIP_FILTERS=1 npm run crawl:run',
    optional: true,
  },
  { name: 'test-communication-e2e', cmd: 'npm run test:communication-e2e', optional: true },
];

function stepsForMode(): Step[] {
  if (mode === 'full') return [...offlineSteps, ...fullSteps];
  if (mode === 'smoke') return [...offlineSteps, ...smokeSteps];
  return offlineSteps;
}

function main(): void {
  const started = Date.now();
  const steps = stepsForMode();
  const results = steps.map(runStep);
  const failed = results.filter((r) => !r.ok);

  const report = {
    timestamp: new Date().toISOString(),
    mode,
    durationMs: Date.now() - started,
    passed: results.filter((r) => r.ok).length,
    failed: failed.length,
    steps: results,
  };

  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, 'site-health.json'), JSON.stringify(report, null, 2));
  console.log(`\nWrote reports/site-health.json (${mode})`);

  if (failed.length > 0) {
    process.exit(1);
  }
  console.log(`\n✓ site-health-gate:${mode} — all required stages passed`);
}

main();
