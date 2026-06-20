/**
 * Fibonacci spacing + layout tokens for public business profile pages.
 * Scale: 8 → 13 → 21 → 34 (aligned with product-detail-tokens).
 */
export const profileFib = {
  xs: 8,
  sm: 13,
  md: 21,
  lg: 34,
} as const;

export const PROFILE_HERO = 'profile-hero profile-surface relative z-0 overflow-hidden rounded-2xl shadow-sm';

export const PROFILE_COVER =
  'profile-hero__cover relative aspect-[21/9] max-h-56 w-full overflow-hidden sm:max-h-60';

export const PROFILE_COVER_IMAGE = 'object-cover object-center';

export const PROFILE_IDENTITY_SHEET = 'profile-identity-sheet relative px-4 pb-5 sm:px-6';

export const PROFILE_LOGO =
  'profile-hero__logo absolute end-4 top-0 z-10 size-20 -translate-y-1/2 overflow-hidden rounded-2xl border-4 border-background bg-muted shadow-lg ring-1 ring-border/40 sm:end-6 sm:size-24 lg:size-28';

export const PROFILE_IDENTITY_BODY = 'profile-identity-sheet__body min-w-0';

export const PROFILE_SECTION_GAP = 'space-y-[21px] sm:space-y-[34px]';

export const PROFILE_HERO_TO_TABS = 'mt-[21px] sm:mt-[34px]';

export const PROFILE_TABS_TO_CONTENT = 'pt-[21px] sm:pt-[34px]';

export const PROFILE_ACTION_TOOLBAR =
  'profile-action-toolbar grid w-full min-w-0 grid-cols-2 gap-2 md:flex md:flex-wrap md:items-stretch md:gap-2';

export const PROFILE_TOOLBAR_BTN =
  'h-11 min-h-11 w-full justify-center md:w-auto md:min-w-[7.5rem]';
