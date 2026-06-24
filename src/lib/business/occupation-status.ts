import type { BusinessOccupation } from '@/config/business-occupation-types';

/** Launch sector — only this subtree is ACTIVE for business occupations at launch. */
export const LAUNCH_ACTIVE_OCCUPATION_SECTOR = 'real-estate-facility';

/** Launch policy: real-estate-facility sector + its jobs ACTIVE; all other sectors/jobs DISABLED. */
export function getLaunchIsActiveForOccupation(o: Pick<BusinessOccupation, 'slug' | 'parentSlug' | 'depth'>): boolean {
  if (o.depth === 0) return o.slug === LAUNCH_ACTIVE_OCCUPATION_SECTOR;
  return o.parentSlug === LAUNCH_ACTIVE_OCCUPATION_SECTOR;
}

export function isOccupationPubliclyAvailable(isActive: boolean | undefined): boolean {
  return isActive !== false;
}
