import type { IntakeStep } from '@/contracts/need-intake';
import type { NeedDraft } from '@/contracts/need-intake';
import { hasIntakeRefineBasics } from '@/lib/need-intake/intake-refine-guards';

export interface IntakeMobileCtaInput {
  step: IntakeStep;
  needText: string;
  canProceedToLocation: boolean;
  canPublish: boolean;
  isLoading: boolean;
  needDraft: NeedDraft | null;
  selectedCategory?: string;
  selectedSubcategory?: string;
  selectedCity?: string;
  mode?: 'create' | 'edit';
}

export interface IntakeMobileCtaState {
  primaryLabel: string;
  primaryDisabled: boolean;
  showBack: boolean;
}

export function resolveIntakeMobileCta(input: IntakeMobileCtaInput): IntakeMobileCtaState {
  const {
    step,
    canPublish,
    isLoading,
    needDraft,
    mode = 'create',
    selectedCategory = '',
    selectedSubcategory = '',
    selectedCity = '',
  } = input;
  const isEdit = mode === 'edit';

  const refineBasicsReady = hasIntakeRefineBasics({
    categorySlug: selectedCategory,
    subcategorySlug: selectedSubcategory,
    city: selectedCity,
    needDraft,
  });

  switch (step) {
    case 'compose':
    case 'need':
    case 'details':
      return {
        primaryLabel: 'ادامه',
        primaryDisabled: isLoading || !input.canProceedToLocation,
        showBack: false,
      };
    case 'location':
      return {
        primaryLabel:
          needDraft?.completionState === 'READY_TO_PUBLISH'
            ? 'بررسی نهایی'
            : 'ادامه',
        primaryDisabled: isLoading || !refineBasicsReady,
        showBack: true,
      };
    case 'preview':
      return {
        primaryLabel: isEdit ? 'ذخیره تغییرات' : 'ثبت نیاز',
        primaryDisabled: isLoading || !canPublish,
        showBack: true,
      };
    default:
      return {
        primaryLabel: 'ادامه',
        primaryDisabled: true,
        showBack: false,
      };
  }
}
