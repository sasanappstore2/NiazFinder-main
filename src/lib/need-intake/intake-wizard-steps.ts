import type { IntakeStep } from '@/contracts/need-intake';

export type IntakeWizardStepKey = 'need' | 'location' | 'preview';

export function normalizeIntakeWizardStep(step: IntakeStep): IntakeWizardStepKey {
  if (step === 'details') return 'need';
  if (step === 'need' || step === 'location' || step === 'preview') return step;
  return 'preview';
}
