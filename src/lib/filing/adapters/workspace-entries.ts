import type { RegionalFiling } from '@prisma/client';
import { db } from '@/lib/db';
import { parseJsonArray, parseJsonObject } from '@/lib/business/json-fields';
import { isRealEstateBusiness } from '@/lib/business/is-real-estate-business';
import { normalizePropertyListings } from '@/lib/business/normalize-property-listing';
import type { PropertyListing, RealEstateExtension } from '@/contracts/business-profile';
import type { ServiceAreaEntry, WorkspaceFilingPreferences } from '@/lib/business/ecosystem/types';
import {
  filterListingsByFilingPreferences,
  listingMatchesFilingPreferences,
} from '@/lib/filing/schema/preferences';
import { regionalFilingToPropertyListing } from '@/lib/filing/adapters/prisma-to-listing';
import {
  listRegionalFilingRowsForWorkspace,
  regionalFilingMatchesServiceArea,
} from '@/lib/filing/adapters/workspace-feed';
import { publicFilingSourceProvider } from '@/lib/filing/presentation/public-brand';

export type WorkspaceFilingSourceKind = 'own' | 'peer' | 'import';

export type WorkspaceFilingPosterKind = 'own' | 'broker' | 'owner';

export type WorkspaceFilingEntry = {
  workspaceId: string;
  listing: PropertyListing;
  sourceKind: WorkspaceFilingSourceKind;
  sourceProvider: string;
  posterKind: WorkspaceFilingPosterKind;
  /** Business slug for /b/{slug}/p/{listingId} detail links. */
  detailSlug?: string;
  /** Imported regional filing — links to /f/{id}. */
  regionalDetail?: boolean;
};

type SourceMetaJson = {
  brokerOffice?: string | null;
  brokerPhone?: string | null;
  ownerAddress?: string | null;
  ownerPhone?: string | null;
};

function readOwnListings(extensions: string): PropertyListing[] {
  const parsed = parseJsonObject<Record<string, unknown>>(extensions, {});
  const re = parsed.realEstate as RealEstateExtension | undefined;
  return Array.isArray(re?.listings) ? re.listings : [];
}

export function parseSourceMetaJsonForPoster(json: string | null | undefined): SourceMetaJson {
  if (!json?.trim() || json.trim() === '{}') return {};
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    return {
      brokerOffice: typeof parsed.brokerOffice === 'string' ? parsed.brokerOffice : null,
      brokerPhone: typeof parsed.brokerPhone === 'string' ? parsed.brokerPhone : null,
      ownerAddress: typeof parsed.ownerAddress === 'string' ? parsed.ownerAddress : null,
      ownerPhone: typeof parsed.ownerPhone === 'string' ? parsed.ownerPhone : null,
    };
  } catch {
    return {};
  }
}

export function inferPosterKindFromSourceMeta(
  sourceMeta: SourceMetaJson | undefined
): Exclude<WorkspaceFilingPosterKind, 'own'> {
  if (sourceMeta?.brokerOffice || sourceMeta?.brokerPhone) return 'broker';
  if (sourceMeta?.ownerAddress || sourceMeta?.ownerPhone) return 'owner';
  return 'broker';
}

export function regionalSourceProvider(sourceSite: string | null | undefined): string {
  return publicFilingSourceProvider(sourceSite);
}

function propertyListingMatchesServiceArea(
  listing: PropertyListing,
  areas: ServiceAreaEntry[],
  profileCity?: string | null
): boolean {
  return areas.some((area) => {
    const filingLike = {
      city: profileCity ?? area.city,
      cityId: listing.cityId ?? area.cityId ?? null,
      neighborhood: listing.location ?? null,
      neighborhoodId: listing.neighborhoodId ?? null,
    };
    return regionalFilingMatchesServiceArea(filingLike, area);
  });
}

export async function listPeerConsultantListingsForWorkspace(
  areas: ServiceAreaEntry[],
  excludeProfileId: string
): Promise<Array<{ listing: PropertyListing; consultantName: string; consultantSlug: string }>> {
  if (!areas.length) return [];

  const cities = [...new Set(areas.map((area) => area.city).filter(Boolean))];
  if (!cities.length) return [];

  const profiles = await db.businessProfile.findMany({
    where: {
      id: { not: excludeProfileId },
      status: 'ACTIVE',
      city: { in: cities },
      user: { isActive: true },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      extensions: true,
      categorySlugs: true,
    },
    take: 80,
  });

  const out: Array<{ listing: PropertyListing; consultantName: string; consultantSlug: string }> =
    [];

  for (const profile of profiles) {
    const occupationSlugs = parseJsonArray<string>(profile.categorySlugs);
    if (!isRealEstateBusiness(occupationSlugs)) continue;

    const listings = normalizePropertyListings(readOwnListings(profile.extensions));
    for (const listing of listings) {
      if (listing.status === 'sold' || listing.status === 'rented') continue;
      if (!propertyListingMatchesServiceArea(listing, areas, profile.city)) continue;
      out.push({
        listing,
        consultantName: profile.name,
        consultantSlug: profile.slug,
      });
    }
  }

  return out;
}

function filterEntriesByFilingPreferences(
  entries: WorkspaceFilingEntry[],
  prefs: WorkspaceFilingPreferences | null | undefined,
  ownWorkspaceIds: Set<string>
): WorkspaceFilingEntry[] {
  if (!prefs?.dealTypes?.length && !prefs?.propertyKinds?.length) return entries;
  return entries.filter(
    (entry) =>
      ownWorkspaceIds.has(entry.workspaceId) ||
      listingMatchesFilingPreferences(entry.listing, prefs)
  );
}

export async function buildWorkspaceFilingEntries(input: {
  profileId: string;
  profileSlug: string;
  extensions: string;
  areas: ServiceAreaEntry[];
  filingPreferences?: WorkspaceFilingPreferences | null;
}): Promise<{ entries: WorkspaceFilingEntry[]; ownListingIds: string[] }> {
  const ownListings = normalizePropertyListings(readOwnListings(input.extensions));
  const ownListingIds = ownListings.map((listing) => listing.id);
  const ownWorkspaceIds = new Set(ownListingIds);

  const [regionalRows, peerRows] = await Promise.all([
    listRegionalFilingRowsForWorkspace(input.areas),
    listPeerConsultantListingsForWorkspace(input.areas, input.profileId),
  ]);

  const entries: WorkspaceFilingEntry[] = [];

  for (const listing of ownListings) {
    entries.push({
      workspaceId: listing.id,
      listing,
      sourceKind: 'own',
      sourceProvider: 'پروفایل من',
      posterKind: 'own',
      detailSlug: input.profileSlug,
    });
  }

  for (const row of regionalRows) {
    const listing = regionalFilingToPropertyListing(row);
    entries.push({
      workspaceId: listing.id,
      listing,
      sourceKind: 'import',
      sourceProvider: regionalSourceProvider(row.sourceSite),
      posterKind: inferPosterKindFromSourceMeta(parseSourceMetaJsonForPoster(row.sourceMetaJson)),
      regionalDetail: true,
    });
  }

  for (const { listing, consultantName, consultantSlug } of peerRows) {
    entries.push({
      workspaceId: `peer_${consultantSlug}_${listing.id}`,
      listing,
      sourceKind: 'peer',
      sourceProvider: `مشاور منطقه · ${consultantName}`,
      posterKind: 'broker',
      detailSlug: consultantSlug,
    });
  }

  const filtered = filterEntriesByFilingPreferences(
    entries,
    input.filingPreferences,
    ownWorkspaceIds
  );

  return { entries: filtered, ownListingIds };
}

/** Legacy flat listing list — keeps older callers working. */
export function workspaceEntriesToListings(entries: WorkspaceFilingEntry[]): PropertyListing[] {
  return entries.map((entry) => entry.listing);
}

export function workspaceEntriesToLegacyListings(
  entries: WorkspaceFilingEntry[],
  filingPreferences: WorkspaceFilingPreferences | null | undefined,
  ownListingIds: string[]
): PropertyListing[] {
  return filterListingsByFilingPreferences(
    workspaceEntriesToListings(entries),
    filingPreferences,
    { alwaysIncludeIds: ownListingIds }
  );
}
