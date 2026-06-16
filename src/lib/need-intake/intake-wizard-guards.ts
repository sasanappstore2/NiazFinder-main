import type { IntakeStep, NeedDraft } from '@/contracts/need-intake';
import type { IntakeWizardStepKey } from '@/lib/need-intake/intake-wizard-steps';
import { normalizeIntakeWizardStep } from '@/lib/need-intake/intake-wizard-steps';
import { recordToEntities } from '@/intake/aggregate/needDraftAggregate';
import { getPublishReadiness } from '@/intake/validation/publishValidator';
import { canProceedToIntakeLocation } from '@/lib/need-intake/compose-source-text';

const WIZARD_ORDER: readonly IntakeWizardStepKey[] = ['need', 'location', 'preview'];

function wizardStepIndex(step: IntakeStep): number {
  if (step === 'publishing' || step === 'done') return WIZARD_ORDER.length - 1;
  const normalized = normalizeIntakeWizardStep(step);
  const idx = WIZARD_ORDER.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

function normalizeNavigationTarget(target: IntakeStep): IntakeWizardStepKey | null {
  if (target === 'details') return 'need';
  if (WIZARD_ORDER.includes(target as IntakeWizardStepKey)) {
    return target as IntakeWizardStepKey;
  }
  return null;
}

export interface IntakeWizardGuardContext {
  currentStep: IntakeStep;
  needText: string;
  detailsText: string;
  needDraft: NeedDraft | null;
  selectedCategory: string;
  selectedSubcategory: string;
  selectedCity: string;
}

export function canNavigateToIntakeStep(
  target: IntakeStep,
  ctx: IntakeWizardGuardContext
): { ok: boolean; message?: string } {
  if (target === 'publishing' || target === 'done') {
    return { ok: false, message: 'در حین انتشار نمی‌توانید مرحله را عوض کنید' };
  }

  const normalizedTarget = normalizeNavigationTarget(target);
  if (!normalizedTarget) {
    return { ok: false };
  }

  const currentIdx = wizardStepIndex(ctx.currentStep);
  const targetIdx = wizardStepIndex(normalizedTarget);

  if (targetIdx <= currentIdx) {
    if (targetIdx === currentIdx) return { ok: false };
    return { ok: true };
  }

  if (normalizedTarget === 'need' && !ctx.needText.trim()) {
    return { ok: false, message: 'ابتدا متن نیاز را وارد کنید' };
  }

  if (normalizedTarget === 'location' || normalizedTarget === 'preview') {
    if (!canProceedToIntakeLocation(ctx.needText, ctx.detailsText)) {
      return {
        ok: false,
        message: 'یک جمله کامل‌تر بنویسید یا جزئیات اختیاری را پر کنید',
      };
    }
  }

  if (normalizedTarget === 'preview') {
    const draftEntities = ctx.needDraft ? recordToEntities(ctx.needDraft.entities) : null;
    const categorySlug = ctx.selectedCategory || draftEntities?.categorySlug || '';
    const subcategorySlug = ctx.selectedSubcategory || draftEntities?.subcategorySlug || '';
    if (!categorySlug && !subcategorySlug) {
      return { ok: false, message: 'دسته‌بندی را مشخص کنید' };
    }

    const cityValue = ctx.selectedCity.trim() || draftEntities?.city?.trim() || '';
    if (!cityValue) {
      return { ok: false, message: 'شهر را مشخص کنید' };
    }

    if (!ctx.needDraft) {
      return { ok: false, message: 'اطلاعات کافی برای پیش‌نمایش نیست' };
    }

    const readiness = getPublishReadiness(ctx.needDraft);
    if (!readiness.canPublish) {
      const msg = readiness.errors.map((e) => e.message).join(' · ');
      return { ok: false, message: msg || 'فیلدهای الزامی را تکمیل کنید' };
    }
  }

  return { ok: true };
}
