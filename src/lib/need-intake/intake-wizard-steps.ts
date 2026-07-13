import type { IntakeStep } from '@/contracts/need-intake';

/** Canonical 3-step wizard keys (compose merges legacy need+details). */
export type IntakeWizardStepKey = 'compose' | 'location' | 'preview';

export function normalizeIntakeWizardStep(step: IntakeStep): IntakeWizardStepKey {
  if (step === 'compose' || step === 'need' || step === 'details') return 'compose';
  if (step === 'location' || step === 'preview') return step;
  return 'preview';
}

/** True for the merged writing step (compose / legacy need / legacy details). */
export function isIntakeComposeStep(step: IntakeStep): boolean {
  return step === 'compose' || step === 'need' || step === 'details';
}
