import { parseJsonArray } from '@/lib/business/json-fields';

export type ProfileOnboardingFields = {
  onboardingCompletedAt: Date | null;
  name: string;
  phone: string | null;
  categorySlugs: string;
};

/** True when user finished the onboarding wizard (or backfilled). */
export function hasCompletedOnboarding(profile: {
  onboardingCompletedAt: Date | null;
}): boolean {
  return profile.onboardingCompletedAt != null;
}

/** Heuristic for legacy rows before onboardingCompletedAt existed. */
export function isProfileSubstantivelyComplete(profile: ProfileOnboardingFields): boolean {
  if (hasCompletedOnboarding(profile)) return true;
  const categories = parseJsonArray<string>(profile.categorySlugs);
  const name = profile.name?.trim() ?? '';
  const phone = profile.phone?.trim() ?? '';
  return (
    name.length >= 2 &&
    name !== 'کسب‌وکار' &&
    phone.length >= 10 &&
    categories.length > 0
  );
}

export function needsOnboarding(profile: ProfileOnboardingFields): boolean {
  return !hasCompletedOnboarding(profile) && !isProfileSubstantivelyComplete(profile);
}
