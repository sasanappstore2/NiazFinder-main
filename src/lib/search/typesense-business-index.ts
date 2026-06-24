import type { BusinessProfile, User } from '@prisma/client';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
import { BUSINESS_PROFILES_COLLECTION, getTypesenseClient } from '@/lib/search/typesense-client';
import { readBusinessMatchSignals } from '@/lib/business/ecosystem/match-signals';
import { activeListings } from '@/lib/business/real-estate-listings';
import type { PropertyListing } from '@/contracts/business-profile';

export type BusinessProfileSearchDocument = {
  id: string;
  title: string;
  category: string[];
  city: string;
  province: string;
  location?: [number, number];
  rating: number;
  review_count: number;
  verified: boolean;
  slug: string;
  user_id: string;
  tags: string[];
  view_count: number;
  created_at: number;
  description?: string;
  logo?: string;
  listing_count?: number;
  specialization_facet?: string[];
  service_neighborhood_ids?: string[];
};

export const businessProfilesCollectionSchema: CollectionCreateSchema = {
  name: BUSINESS_PROFILES_COLLECTION,
  fields: [
    { name: 'id', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'category', type: 'string[]', facet: true },
    { name: 'city', type: 'string', facet: true },
    { name: 'province', type: 'string', facet: true },
    { name: 'location', type: 'geopoint', optional: true },
    { name: 'rating', type: 'float' },
    { name: 'review_count', type: 'int32' },
    { name: 'verified', type: 'bool', facet: true },
    { name: 'slug', type: 'string' },
    { name: 'user_id', type: 'string' },
    { name: 'tags', type: 'string[]', optional: true },
    { name: 'view_count', type: 'int32' },
    { name: 'created_at', type: 'int64' },
    { name: 'description', type: 'string', optional: true },
    { name: 'logo', type: 'string', optional: true },
    { name: 'listing_count', type: 'int32', optional: true, facet: true },
    { name: 'specialization_facet', type: 'string[]', optional: true, facet: true },
    { name: 'service_neighborhood_ids', type: 'string[]', optional: true, facet: true },
  ],
  default_sorting_field: 'rating',
};

type ProfileForIndex = Pick<
  BusinessProfile,
  | 'id'
  | 'userId'
  | 'name'
  | 'slug'
  | 'logo'
  | 'description'
  | 'categorySlugs'
  | 'tags'
  | 'city'
  | 'province'
  | 'lat'
  | 'lng'
  | 'status'
  | 'rating'
  | 'reviewCount'
  | 'verified'
  | 'viewCount'
  | 'createdAt'
  | 'extensions'
> & {
  user?: Pick<User, 'isActive' | 'isVerified' | 'avatar' | 'online'>;
};

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function isIndexableBusinessProfile(profile: ProfileForIndex): boolean {
  return profile.status === 'ACTIVE' && profile.user?.isActive !== false;
}

export function businessProfileToTypesenseDocument(
  profile: ProfileForIndex
): BusinessProfileSearchDocument {
  const signals = readBusinessMatchSignals(profile.extensions ?? '{}');
  const listings = signals.listings as PropertyListing[];
  const listingCount = activeListings(listings).length;

  const doc: BusinessProfileSearchDocument = {
    id: profile.id,
    title: profile.name,
    category: parseJsonArray(profile.categorySlugs),
    city: profile.city ?? '',
    province: profile.province ?? '',
    rating: profile.rating,
    review_count: profile.reviewCount,
    verified: profile.verified || profile.user?.isVerified === true,
    slug: profile.slug,
    user_id: profile.userId,
    tags: parseJsonArray(profile.tags),
    view_count: profile.viewCount,
    created_at: profile.createdAt.getTime(),
    description: profile.description ?? undefined,
    logo: profile.logo ?? profile.user?.avatar ?? undefined,
    listing_count: listingCount > 0 ? listingCount : undefined,
    specialization_facet:
      signals.specializations.length > 0 ? signals.specializations : undefined,
    service_neighborhood_ids:
      signals.serviceNeighborhoodIds.length > 0 ? signals.serviceNeighborhoodIds : undefined,
  };

  if (
    typeof profile.lat === 'number' &&
    typeof profile.lng === 'number' &&
    Number.isFinite(profile.lat) &&
    Number.isFinite(profile.lng)
  ) {
    doc.location = [profile.lat, profile.lng];
  }

  return doc;
}

export async function ensureBusinessProfilesCollection(): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;

  try {
    await client.collections(BUSINESS_PROFILES_COLLECTION).retrieve();
  } catch {
    await client.collections().create(businessProfilesCollectionSchema);
  }
}

export async function upsertBusinessProfileDocuments(
  documents: BusinessProfileSearchDocument[]
): Promise<void> {
  const client = getTypesenseClient();
  if (!client || documents.length === 0) return;

  await ensureBusinessProfilesCollection();
  await client
    .collections(BUSINESS_PROFILES_COLLECTION)
    .documents()
    .import(documents, { action: 'upsert' });
}

export async function deleteBusinessProfileDocument(profileId: string): Promise<void> {
  const client = getTypesenseClient();
  if (!client) return;

  try {
    await client.collections(BUSINESS_PROFILES_COLLECTION).documents(profileId).delete();
  } catch {
    // Document may not exist ? safe to ignore.
  }
}
