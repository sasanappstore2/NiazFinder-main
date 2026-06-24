import type { Business, PropertyListing } from '@/contracts/business-profile';
import { isListingRentDeal } from '@/lib/business/real-estate-listing-deal-types';

/**
 * Real-estate listing selectors.
 *
 * Single data source: `business.extensions.realEstate.listings` (already present
 * on the public Business object — no extra query). Pure functions shared by the
 * Active / Sold / Rental listing widgets.
 */
export function getListings(business: Business): PropertyListing[] {
  return business.extensions?.realEstate?.listings ?? [];
}

/** Active = not sold and not rented (treats missing status as active). */
export function activeListings(listings: PropertyListing[]): PropertyListing[] {
  return listings.filter((l) => l.status !== 'sold' && l.status !== 'rented');
}

export function soldListings(listings: PropertyListing[]): PropertyListing[] {
  return listings.filter((l) => l.status === 'sold');
}

/** Rental = offered for rent (by deal type) or already rented. */
export function rentalListings(listings: PropertyListing[]): PropertyListing[] {
  return listings.filter((l) => isListingRentDeal(l.dealType) || l.status === 'rented');
}
