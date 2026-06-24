import type { RealEstateSubtype } from '@/lib/business/widget-registry';
import { getRealEstateOnboardingConfig } from '@/lib/business/real-estate-onboarding-config';

export const WIZARD_STEPS_GENERIC = [
  { id: 0, label: 'هویت و دسته', short: 'هویت' },
  { id: 1, label: 'تماس و مکان', short: 'تماس' },
  { id: 2, label: 'تصاویر و لینک‌ها', short: 'برند' },
  { id: 3, label: 'انتشار', short: 'انتشار' },
] as const;

export function getWizardSteps(isRealEstate: boolean, subtype?: RealEstateSubtype | null) {
  if (!isRealEstate) return [...WIZARD_STEPS_GENERIC];

  const reConfig = getRealEstateOnboardingConfig(subtype);
  return [
    { id: 0, label: 'هویت و دسته', short: 'هویت' },
    { id: 1, label: 'تماس و مکان', short: 'تماس' },
    { id: 2, label: reConfig.stepLabel, short: reConfig.stepShort },
    { id: 3, label: 'انتشار', short: 'انتشار' },
  ] as const;
}

/** @deprecated Use getWizardSteps() */
export const WIZARD_STEPS = WIZARD_STEPS_GENERIC;

/** Fibonacci spacing scale for wizard scope (px). */
export const WIZARD_SPACE = {
  xs: 'p-2', // 8
  sm: 'p-[13px]', // 13
  md: 'p-[21px]', // 21
  lg: 'p-[34px]', // 34
  xl: 'gap-[55px]', // 55
} as const;

export const ONBOARDING_DRAFT_KEY = 'nf_business_onboarding_draft_v2';
