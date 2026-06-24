'use client';

/** Fired after super-admin changes occupation / online-store activation. */
export const BUSINESS_TAXONOMY_INVALIDATE_EVENT = 'business-taxonomy-invalidate';

/** Bust client taxonomy caches so pickers refetch active registries. */
export function invalidateBusinessTaxonomyCache(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BUSINESS_TAXONOMY_INVALIDATE_EVENT));
}
