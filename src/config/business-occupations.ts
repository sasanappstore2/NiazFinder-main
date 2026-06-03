/**
 * Business / occupation taxonomy — NOT the same as need listing categories.
 * Runtime registry: src/data/business-occupations.json (admin-editable).
 * Fallback: business-occupations-defaults.ts
 * See docs/BUSINESS_OCCUPATIONS.md
 */

export type { BusinessOccupation } from '@/config/business-occupation-types';
export { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';

import type { BusinessOccupation } from '@/config/business-occupation-types';
import { getCachedOccupationsSync } from '@/lib/business/occupations-cache';

function activeOccupations(): BusinessOccupation[] {
  return getCachedOccupationsSync().filter((o) => o.isActive !== false);
}

function allOccupations(): BusinessOccupation[] {
  return getCachedOccupationsSync();
}

function buildMaps(list: BusinessOccupation[]) {
  const bySlug = new Map(list.map((o) => [o.slug, o]));
  const allSlugs = new Set(list.map((o) => o.slug));
  return { bySlug, allSlugs };
}

/** Active occupations list (replaces static BUSINESS_OCCUPATIONS array). */
export function getBusinessOccupationsList(): BusinessOccupation[] {
  return activeOccupations();
}

/** Renamed occupations — migrate stored profile slugs without re-onboarding. */
export const LEGACY_OCCUPATION_ALIASES: Readonly<Record<string, string>> = {
  'content-creator': 'social-media-manager',
  copywriter: 'seo-digital-marketing',
  'business-consultant': 'management-consultant',
  'private-chef': 'catering',
  'car-repair': 'auto-mechanic',
};

export function resolveOccupationSlug(slug: string): string {
  const t = slug.trim();
  return LEGACY_OCCUPATION_ALIASES[t] ?? t;
}

export function isOccupationSlug(slug: string): boolean {
  const { allSlugs } = buildMaps(allOccupations());
  return allSlugs.has(resolveOccupationSlug(slug));
}

export function getOccupationBySlug(slug: string): BusinessOccupation | null {
  const { bySlug } = buildMaps(allOccupations());
  return bySlug.get(resolveOccupationSlug(slug)) ?? null;
}

export function getOccupationPath(slug: string): BusinessOccupation[] {
  const { bySlug } = buildMaps(allOccupations());
  const path: BusinessOccupation[] = [];
  let cursor: BusinessOccupation | null = bySlug.get(resolveOccupationSlug(slug)) ?? null;
  let safety = 4;
  while (cursor && safety-- > 0) {
    path.unshift(cursor);
    cursor = cursor.parentSlug ? bySlug.get(cursor.parentSlug) ?? null : null;
  }
  return path;
}

export function isAncestorOccupation(parent: string, child: string): boolean {
  const path = getOccupationPath(child);
  return path.some((o) => o.slug === parent && o.slug !== child);
}

function occupationSortKey(o: BusinessOccupation): number {
  return o.sortOrder ?? 9999;
}

export function compareOccupationsByDisplayOrder(
  a: BusinessOccupation,
  b: BusinessOccupation
): number {
  const byOrder = occupationSortKey(a) - occupationSortKey(b);
  if (byOrder !== 0) return byOrder;
  return a.title.localeCompare(b.title, 'fa');
}

/** Pickable in wizard: depth-1 active occupations only, demand-ordered. */
export function getPickableOccupations(): BusinessOccupation[] {
  return activeOccupations().filter((o) => o.depth === 1).sort(compareOccupationsByDisplayOrder);
}

export function getOccupationSectors(): BusinessOccupation[] {
  return activeOccupations().filter((o) => o.depth === 0).sort(compareOccupationsByDisplayOrder);
}

export function getOccupationTitle(slug: string): string {
  return getOccupationBySlug(slug)?.title ?? slug;
}

/** True if slug is a valid pickable occupation (depth 1, active). */
export function isPickableOccupationSlug(slug: string): boolean {
  const o = getOccupationBySlug(resolveOccupationSlug(slug));
  return o != null && o.depth === 1 && o.isActive !== false;
}

/** Count of selectable jobs (for docs/tests). */
export function getPickableOccupationCount(): number {
  return getPickableOccupations().length;
}
