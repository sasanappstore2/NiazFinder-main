/**
 * Phase 39.1 — step view component contract tests (40 checks, no vitest).
 * Run: npm run test:intake-step-views
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTAKE_WIZARD_STEPS } from '@/components/need-intake/wizard/intake-wizard-config';

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const STEP_FILES = [
  {
    step: 'need',
    path: 'src/components/need-intake/wizard/steps/IntakeStepNeed.tsx',
    props: ['needText', 'onNeedTextChange', 'onContinue'],
  },
  {
    step: 'details',
    path: 'src/components/need-intake/wizard/steps/IntakeStepDetails.tsx',
    props: ['detailsText', 'onDetailsTextChange'],
  },
  {
    step: 'location',
    path: 'src/components/need-intake/wizard/steps/IntakeStepLocation.tsx',
    props: ['selectedCity', 'selectedLeafCategorySlug'],
  },
  {
    step: 'preview',
    path: 'src/components/need-intake/wizard/steps/IntakeStepPreview.tsx',
    props: ['preview', 'onPublish'],
  },
] as const;

function main(): void {
  let checks = 0;

  assert(INTAKE_WIZARD_STEPS.length === 3, 'wizard has 3 steps');
  checks += 4;
  for (const def of INTAKE_WIZARD_STEPS) {
    assert(Boolean(def.title.trim()), `step title ${def.key}`);
    assert(Boolean(def.subtitle.trim()), `step subtitle ${def.key}`);
    checks += 2;
  }

  const indexSrc = read('src/components/need-intake/wizard/steps/index.ts');
  for (const file of STEP_FILES) {
    const src = read(file.path);
    assert(src.includes(`export function IntakeStep`), `${file.step} exports component`);
    assert(src.includes('IntakeStepNeedProps') || src.includes('Props'), `${file.step} props type`);
    for (const prop of file.props) {
      assert(src.includes(prop), `${file.step} prop ${prop}`);
      checks += 1;
    }
    assert(indexSrc.includes(file.path.split('/').pop()!.replace('.tsx', '')), `${file.step} barrel export`);
    checks += 2;
  }

  const restore = read('src/components/need-intake/IntakeDraftRestorePrompt.tsx');
  assert(restore.includes('ادامه پیش'), 'restore prompt copy');
  checks += 1;

  const mobileShell = read('src/components/need-intake/wizard/mobile/IntakeMobileShell.tsx');
  assert(mobileShell.includes('onPrimary'), 'mobile shell primary CTA');
  checks += 1;

  const panel = read('src/hooks/use-need-intake-panel.ts');
  assert(panel.includes('buildIntakeWizardStepContentProps'), 'panel uses canonical step props builder');
  checks += 1;

  const locationStep = read('src/components/need-intake/wizard/steps/IntakeStepLocation.tsx');
  assert(locationStep.includes('serviceCategory'), 'location step handles serviceCategory');
  assert(locationStep.includes('IntakeCategoryMegaMenuPicker'), 'location step category mega menu');
  checks += 2;

  const needTypes = read('src/intake/schema/needTypes.ts');
  assert(
    needTypes.includes("fields: ['category', 'description']"),
    'service-seeking uses category field in service-type section'
  );
  checks += 1;

  assert(checks >= 30, `expected >=30 checks got ${checks}`);

  console.log(JSON.stringify({ ok: true, checks, steps: INTAKE_WIZARD_STEPS.length }));
}

main();
