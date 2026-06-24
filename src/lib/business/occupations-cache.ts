import type { BusinessOccupation } from '@/config/business-occupation-types';
import { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';
import { getLaunchIsActiveForOccupation } from '@/lib/business/occupation-status';

export type ManagedBusinessOccupation = BusinessOccupation & {
  isActive: boolean;
};

function normalizeOccupation(o: BusinessOccupation): ManagedBusinessOccupation {
  return {
    ...o,
    isActive: o.isActive !== false,
  };
}

let cache: ManagedBusinessOccupation[] | null = null;
let cacheAt = 0;

export function getDefaultManagedOccupations(): ManagedBusinessOccupation[] {
  return DEFAULT_BUSINESS_OCCUPATIONS.map((o) => ({
    ...normalizeOccupation(o),
    isActive: getLaunchIsActiveForOccupation(o),
  }));
}

export function getCachedOccupationsSync(): ManagedBusinessOccupation[] {
  return cache ?? getDefaultManagedOccupations();
}

export function setOccupationsCache(data: ManagedBusinessOccupation[]): void {
  cache = data;
  cacheAt = Date.now();
}

export function invalidateOccupationsCache(): void {
  cache = null;
  cacheAt = 0;
}

export function getOccupationsCacheTimestamp(): number {
  return cacheAt;
}

export { normalizeOccupation };
