import type { PropertyListing } from '@/contracts/business-profile';

const MAX_IMAGES = 5;

export function listingCoverImage(listing: PropertyListing): string | undefined {
  if (listing.images?.length) return listing.images[0];
  return listing.image;
}

export function normalizePropertyListing(listing: PropertyListing): PropertyListing {
  const merged = [
    ...(listing.images ?? []),
    ...(listing.image && !listing.images?.includes(listing.image) ? [listing.image] : []),
  ].filter(Boolean);
  const images = merged.slice(0, MAX_IMAGES);
  return {
    ...listing,
    images: images.length ? images : undefined,
    image: images[0],
  };
}

export function normalizePropertyListings(listings: PropertyListing[]): PropertyListing[] {
  return listings.map(normalizePropertyListing);
}
