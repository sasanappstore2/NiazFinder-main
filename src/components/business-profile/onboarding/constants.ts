export const WIZARD_STEPS = [
  { id: 0, label: 'هویت و دسته', short: 'هویت' },
  { id: 1, label: 'تماس و مکان', short: 'تماس' },
  { id: 2, label: 'تصاویر و لینک‌ها', short: 'برند' },
  { id: 3, label: 'انتشار', short: 'انتشار' },
] as const;

/** Fibonacci spacing scale for wizard scope (px). */
export const WIZARD_SPACE = {
  xs: 'p-2', // 8
  sm: 'p-[13px]', // 13
  md: 'p-[21px]', // 21
  lg: 'p-[34px]', // 34
  xl: 'gap-[55px]', // 55
} as const;

export const ONBOARDING_DRAFT_KEY = 'nf_business_onboarding_draft_v1';
