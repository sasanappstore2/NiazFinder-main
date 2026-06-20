import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import { lookupManagedNeighborhoodBySlug } from '@/lib/neighborhoods/match-managed-neighborhood';

export interface NeighborhoodCandidateLabelInput {
  slug: string;
  label: string;
  city?: string;
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Chip / picker label ? catalog neighborhood name only (never sub-area street names). */
export function formatNeighborhoodDisambiguationLabel(
  candidate: NeighborhoodCandidateLabelInput,
  neighborhoods: ManagedNeighborhood[],
  opts?: { distinct?: boolean }
): string {
  const hit = lookupManagedNeighborhoodBySlug(neighborhoods, candidate.slug);
  const base = (hit?.name ?? candidate.label).trim() || humanizeSlug(candidate.slug);

  if (opts?.distinct) {
    if (hit?.nameEn?.trim() && hit.nameEn.trim().toLowerCase() !== base.toLowerCase()) {
      return `${base} (${hit.nameEn.trim()})`;
    }
    const slugHint = humanizeSlug(candidate.slug);
    if (slugHint && slugHint !== base) return `${base} — ${slugHint}`;
    if (candidate.city?.trim() && candidate.city.trim() !== base) {
      return `${base} (${candidate.city.trim()})`;
    }
  }

  return base;
}

export function neighborhoodCandidatesNeedDistinctLabels(
  candidates: readonly NeighborhoodCandidateLabelInput[]
): boolean {
  const labels = candidates.map((c) => c.label.trim()).filter(Boolean);
  return labels.length >= 2 && new Set(labels).size < labels.length;
}

/** Intake chips always show the managed neighborhood name (ignore matched street/sub-area). */
export function formatAmbiguousNeighborhoodChipLabel(hoodName: string): string {
  return hoodName.trim();
}
