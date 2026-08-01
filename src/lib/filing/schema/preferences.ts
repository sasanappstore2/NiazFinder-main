import type { PropertyListing } from '@/contracts/business-profile';
import type { CollaborationPropertyKind } from '@prisma/client';
import {
  inferListingDealTypeFromCategory,
  normalizeListingDealType,
  type PropertyListingDealType,
} from '@/lib/business/real-estate-listing-deal-types';
import type { WorkspaceFilingPreferences, WorkspacePropertyKind } from '@/lib/business/ecosystem/types';
import { FILING_PROPERTY_KINDS } from '@/lib/filing/schema/attribute-schema';

export const WORKSPACE_DEAL_TYPE_OPTIONS = [
  { value: 'sell' as const, label: 'خرید / فروش' },
  { value: 'rent_rahn_ejare' as const, label: 'رهن و اجاره' },
  { value: 'rent_rahn_full' as const, label: 'رهن کامل' },
  { value: 'rent_short_term' as const, label: 'اجاره روزانه' },
];

export const WORKSPACE_PROPERTY_KIND_OPTIONS = [
  { value: 'apartment' as const, label: 'آپارتمان' },
  { value: 'villa' as const, label: 'ویلایی' },
  { value: 'land' as const, label: 'زمین' },
  { value: 'office' as const, label: 'دفتر کار' },
  { value: 'shop' as const, label: 'مغازه' },
  { value: 'commercial' as const, label: 'تجاری' },
] as const;

const COLLAB_KIND_BY_WORKSPACE: Record<WorkspacePropertyKind, CollaborationPropertyKind> = {
  apartment: 'APARTMENT',
  villa: 'VILLA',
  land: 'LAND',
  office: 'COMMERCIAL',
  shop: 'COMMERCIAL',
  commercial: 'COMMERCIAL',
};

export function emptyWorkspaceFilingPreferences(): WorkspaceFilingPreferences {
  return { dealTypes: [], propertyKinds: [] };
}

export function isWorkspaceFilingPreferencesEmpty(
  prefs: WorkspaceFilingPreferences | null | undefined
): boolean {
  return !prefs?.dealTypes?.length && !prefs?.propertyKinds?.length;
}

export function inferListingPropertyKind(
  listing: PropertyListing
): WorkspacePropertyKind | 'other' {
  const slug = (listing.categorySlug ?? listing.propertyType ?? '').toLowerCase();
  if (slug.includes('villa') || slug === 'villa') return 'villa';
  if (slug.includes('land') || slug.includes('plot') || slug.includes('زمین')) return 'land';
  if (
    slug.includes('shop') ||
    slug.includes('office') ||
    slug.includes('commercial') ||
    slug.includes('warehouse') ||
    slug.includes('تجاری') ||
    slug.includes('اداری')
  ) {
    return 'commercial';
  }
  if (slug.includes('apartment') || slug.includes('suite') || slug.includes('آپارتمان')) {
    return 'apartment';
  }
  return 'other';
}

export function resolveListingDealType(listing: PropertyListing): PropertyListingDealType {
  return normalizeListingDealType(
    listing.dealType ?? inferListingDealTypeFromCategory(listing.categorySlug)
  );
}

const FILING_KIND_SET = new Set<string>(FILING_PROPERTY_KINDS);

/** Canonical property kind for browse filters — prefers explicit `propertyType`. */
export function resolveListingPropertyKindForFilter(listing: PropertyListing): string {
  const explicit = listing.propertyType?.trim();
  if (explicit && FILING_KIND_SET.has(explicit)) {
    return explicit;
  }
  return inferListingPropertyKind(listing);
}

export function listingMatchesPropertyKindFilter(
  listing: PropertyListing,
  filterKind: string
): boolean {
  if (filterKind === 'all') return true;

  const resolved = resolveListingPropertyKindForFilter(listing);
  if (resolved === filterKind) return true;

  if (resolved !== 'commercial') return false;

  const slug = (listing.categorySlug ?? listing.propertyType ?? '').toLowerCase();
  if (filterKind === 'office' && slug.includes('office')) return true;
  if (filterKind === 'shop' && slug.includes('shop')) return true;
  if (filterKind === 'commercial') return true;

  return false;
}

export function listingMatchesFilingPreferences(
  listing: PropertyListing,
  prefs: WorkspaceFilingPreferences | null | undefined
): boolean {
  if (isWorkspaceFilingPreferencesEmpty(prefs)) return true;

  if (prefs!.dealTypes?.length) {
    const deal = resolveListingDealType(listing);
    if (!prefs!.dealTypes.includes(deal)) return false;
  }

  if (prefs!.propertyKinds?.length) {
    const kind = inferListingPropertyKind(listing);
    if (kind === 'other' || !prefs!.propertyKinds.includes(kind)) return false;
  }

  return true;
}

export function filterListingsByFilingPreferences(
  listings: PropertyListing[],
  prefs: WorkspaceFilingPreferences | null | undefined,
  opts?: { alwaysIncludeIds?: string[] }
): PropertyListing[] {
  if (isWorkspaceFilingPreferencesEmpty(prefs)) return listings;
  const keep = new Set(opts?.alwaysIncludeIds ?? []);
  return listings.filter(
    (listing) => keep.has(listing.id) || listingMatchesFilingPreferences(listing, prefs)
  );
}

export function collaborationMatchesFilingPreferences(
  post: { dealType: string | null; propertyKind: CollaborationPropertyKind | null },
  prefs: WorkspaceFilingPreferences | null | undefined
): boolean {
  if (isWorkspaceFilingPreferencesEmpty(prefs)) return true;

  if (prefs!.dealTypes?.length && post.dealType) {
    const deal = normalizeListingDealType(post.dealType as PropertyListingDealType);
    if (!prefs!.dealTypes.includes(deal)) return false;
  }

  if (prefs!.propertyKinds?.length && post.propertyKind) {
    const allowed = new Set(
      prefs!.propertyKinds.map((k) => COLLAB_KIND_BY_WORKSPACE[k])
    );
    if (!allowed.has(post.propertyKind)) return false;
  }

  return true;
}

export function formatFilingPreferencesSummary(
  prefs: WorkspaceFilingPreferences | null | undefined
): string | null {
  if (isWorkspaceFilingPreferencesEmpty(prefs)) return null;

  const parts: string[] = [];
  if (prefs!.dealTypes?.length) {
    const labels = prefs!.dealTypes.map(
      (v) => WORKSPACE_DEAL_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v
    );
    parts.push(labels.join('، '));
  }
  if (prefs!.propertyKinds?.length) {
    const labels = prefs!.propertyKinds.map(
      (v) => WORKSPACE_PROPERTY_KIND_OPTIONS.find((o) => o.value === v)?.label ?? v
    );
    parts.push(labels.join('، '));
  }
  return parts.join(' · ');
}
