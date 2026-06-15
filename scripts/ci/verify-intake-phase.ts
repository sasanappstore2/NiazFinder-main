/**
 * Verify intake execution phase completion criteria.
 * Run: npx tsx scripts/ci/verify-intake-phase.ts --phase 5
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function argPhase(): number {
  const idx = process.argv.indexOf('--phase');
  const raw = idx >= 0 ? process.argv[idx + 1] : process.argv[2];
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || n > 50) {
    console.error('Usage: npx tsx scripts/ci/verify-intake-phase.ts --phase <1-50>');
    process.exit(2);
  }
  return n;
}

function readJson(path: string): Record<string, unknown> | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
}

function grepCount(pattern: string, path: string): number {
  try {
    const out = execSync(`rg -l "${pattern}" "${path}" 2>/dev/null || true`, {
      encoding: 'utf8',
    }).trim();
    return out ? out.split('\n').filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

function lineCount(path: string): number {
  if (!existsSync(join(ROOT, path))) return 0;
  return readFileSync(join(ROOT, path), 'utf8').split('\n').length;
}

type Check = { id: string; ok: boolean; detail: string };

function verifyPhase(phase: number): Check[] {
  const checks: Check[] = [];
  const baseline = readJson(join(ROOT, 'reports/intake-baseline.json'));
  const execDoc = existsSync(join(ROOT, 'docs/INTAKE_EXECUTION.md'));

  const phaseComplete = (n: number): boolean =>
    Boolean(baseline?.[`phase${n}Complete`]);

  switch (phase) {
    case 1:
      checks.push({
        id: '1.1',
        ok: existsSync(join(ROOT, 'reports/intake-baseline.json')),
        detail: 'reports/intake-baseline.json exists',
      });
      checks.push({
        id: '1.10',
        ok: execDoc,
        detail: 'docs/INTAKE_EXECUTION.md exists',
      });
      break;

    case 2:
      for (const f of [
        'docs/NEED_INTAKE.md',
        'docs/INTAKE_INDEX.md',
        'docs/INTAKE_NEED_DRAFT.md',
        'docs/adr/001-intake-ai-strategy.md',
      ]) {
        checks.push({ id: '2.x', ok: existsSync(join(ROOT, f)), detail: f });
      }
      checks.push({ id: '2.10', ok: phaseComplete(2), detail: 'phase2Complete in baseline' });
      break;

    case 3:
      checks.push({
        id: '3.2',
        ok: !existsSync(join(ROOT, 'src/components/need-intake/IntakeChatComposer.tsx')),
        detail: 'IntakeChatComposer removed',
      });
      checks.push({
        id: '3.7',
        ok: (baseline?.codeMetrics as { orphanComponents?: number } | undefined)?.orphanComponents === 0,
        detail: 'orphanComponents = 0',
      });
      break;

    case 4:
      checks.push({
        id: '4.1',
        ok: readFileSync(join(ROOT, 'src/contracts/need-intake.ts'), 'utf8').includes(
          'NEED_DRAFT_SCHEMA_VERSION'
        ),
        detail: 'NEED_DRAFT_SCHEMA_VERSION constant',
      });
      checks.push({
        id: '4.10',
        ok: existsSync(join(ROOT, 'src/intake/fixtures/run-draft-roundtrip-self-test.ts')),
        detail: 'draft-roundtrip fixture',
      });
      break;

    case 5:
      checks.push({
        id: '5.1',
        ok: readFileSync(join(ROOT, 'package.json'), 'utf8').includes('test:intake-baseline'),
        detail: 'npm run test:intake-baseline',
      });
      checks.push({
        id: '5.5',
        ok: existsSync(join(ROOT, '.github/workflows/intake-baseline.yml')),
        detail: 'GitHub workflow intake-baseline.yml',
      });
      checks.push({
        id: '5.8',
        ok: existsSync(join(ROOT, 'docs/INTAKE_RELEASE_CHECKLIST.md')),
        detail: 'INTAKE_RELEASE_CHECKLIST.md',
      });
      break;

    case 6:
      checks.push({
        id: '6.1',
        ok: existsSync(join(ROOT, 'src/components/need-intake/wizard/IntakeWizardOrchestrator.tsx')),
        detail: 'IntakeWizardOrchestrator.tsx',
      });
      checks.push({
        id: '6.3',
        ok: existsSync(join(ROOT, 'src/hooks/use-intake-user-locks.ts')),
        detail: 'use-intake-user-locks.ts',
      });
      checks.push({
        id: '6.4',
        ok: existsSync(join(ROOT, 'src/hooks/use-intake-publish.ts')),
        detail: 'use-intake-publish.ts',
      });
      break;

    default:
      checks.push({
        id: `${phase}.0`,
        ok: phaseComplete(phase),
        detail: `phase${phase}Complete flag (manual — phases ${phase} not automated yet)`,
      });
  }

  return checks;
}

function main(): void {
  const phase = argPhase();
  const checks = verifyPhase(phase);
  const failed = checks.filter((c) => !c.ok);

  console.log(`\nPhase ${phase} verification (${checks.length} checks)\n`);
  for (const c of checks) {
    console.log(`${c.ok ? '✓' : '✗'} [${c.id}] ${c.detail}`);
  }

  if (failed.length) {
    console.error(`\n✗ Phase ${phase}: ${failed.length}/${checks.length} checks failed`);
    process.exit(1);
  }
  console.log(`\n✓ Phase ${phase}: all ${checks.length} checks passed`);
}

main();
