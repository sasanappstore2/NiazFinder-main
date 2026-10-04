import type { WorkspaceFileItem } from '@/components/workspace/types';
import {
  lookupManagedNeighborhoodBySlug,
  matchManagedNeighborhood,
} from '@/lib/neighborhoods/match-managed-neighborhood';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';

export type NeighborhoodSlugMatcher = (item: WorkspaceFileItem) => boolean;

/** Build a reusable matcher — resolves location text once per item, not per slug. */
export function buildFilingNeighborhoodMatcher(
  slugs: string[],
  neighborhoods: ManagedNeighborhood[],
  cityName?: string
): NeighborhoodSlugMatcher {
  if (slugs.length === 0 || !neighborhoods.length) {
    return () => true;
  }

  const selected = slugs
    .map((slug) => lookupManagedNeighborhoodBySlug(neighborhoods, slug))
    .filter((n): n is ManagedNeighborhood => n != null);

  if (!selected.length) {
    return () => false;
  }

  const selectedIds = new Set(selected.map((n) => n.id));

  return (item: WorkspaceFileItem) => {
    const listing = item.listing;
    if (listing.neighborhoodId && selectedIds.has(listing.neighborhoodId)) {
      return true;
    }

    const location = listing.location ?? listing.title ?? '';
    if (!location) return false;

    for (const hood of selected) {
      const name = hood.name.trim();
      if (name && location.includes(name)) return true;
      for (const area of hood.areas ?? []) {
        const areaName = area.trim();
        if (areaName && location.includes(areaName)) return true;
      }
    }

    const matched = matchManagedNeighborhood(neighborhoods, location, cityName);
    return matched != null && selectedIds.has(matched.id);
  };
}

export function filingMatchesNeighborhoodSlugs(
  item: WorkspaceFileItem,
  slugs: string[],
  neighborhoods: ManagedNeighborhood[],
  cityName?: string
): boolean {
  return buildFilingNeighborhoodMatcher(slugs, neighborhoods, cityName)(item);
}
