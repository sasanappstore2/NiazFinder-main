import assert from 'node:assert/strict';
import type { PropertyListing } from '@/contracts/business-profile';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import {
  DEFAULT_FILING_BROWSE_FILTERS,
  filingFinancialFiltersClearForDeal,
  filterFilingBrowseItems,
} from '@/lib/filing/browse/apply-filters';
import {
  listingMatchesPropertyKindFilter,
  resolveListingPropertyKindForFilter,
} from '@/lib/filing/schema/preferences';

function fileItem(listing: Partial<PropertyListing>): WorkspaceFileItem {
  return {
    kind: 'file',
    id: listing.id ?? 'f1',
    listing: { id: listing.id ?? 'f1', title: listing.title ?? 'test', ...listing },
    dealLabel: '',
    categoryLabel: '',
    priceDisplay: '',
    colorLabel: '',
    createdAt: new Date().toISOString(),
  };
}

function main() {
  const withParking = fileItem({
    id: 'parking',
    dealType: 'sell',
    propertyType: 'apartment',
    amenities: { parking: true, elevator: false },
  });
  const noParking = fileItem({
    id: 'no-parking',
    dealType: 'sell',
    propertyType: 'apartment',
    amenities: { parking: false },
  });

  const amenityFiltered = filterFilingBrowseItems(
    [withParking, noParking],
    { ...DEFAULT_FILING_BROWSE_FILTERS, amenities: ['parking'] }
  );
  assert.equal(amenityFiltered.length, 1);
  assert.equal(amenityFiltered[0]!.id, 'parking');

  const officeExplicit = fileItem({
    id: 'office-explicit',
    propertyType: 'office',
    categorySlug: 'commercial-rent',
  });
  assert.equal(resolveListingPropertyKindForFilter(officeExplicit.listing), 'office');
  assert.equal(
    listingMatchesPropertyKindFilter(officeExplicit.listing, 'office'),
    true,
    'explicit office should match office filter'
  );

  const officeInferred = fileItem({
    id: 'office-inferred',
    categorySlug: 'office-sale',
  });
  assert.equal(
    listingMatchesPropertyKindFilter(officeInferred.listing, 'office'),
    true,
    'office slug should match office filter via commercial inference'
  );

  const officeFiltered = filterFilingBrowseItems(
    [officeExplicit, fileItem({ id: 'apt', propertyType: 'apartment' })],
    { ...DEFAULT_FILING_BROWSE_FILTERS, propertyKind: 'office' }
  );
  assert.equal(officeFiltered.length, 1);
  assert.equal(officeFiltered[0]!.id, 'office-explicit');

  assert.deepEqual(filingFinancialFiltersClearForDeal('rent_rahn_ejare'), {
    priceMin: '',
    priceMax: '',
  });

  const rentLow = fileItem({
    id: 'rent-low',
    dealType: 'rent_rahn_ejare',
    deposit: '100000000',
  });
  const rentHigh = fileItem({
    id: 'rent-high',
    dealType: 'rent_rahn_ejare',
    deposit: '900000000',
  });

  const withGhostPrice = filterFilingBrowseItems([rentLow, rentHigh], {
    ...DEFAULT_FILING_BROWSE_FILTERS,
    dealType: 'rent_rahn_ejare',
    priceMin: '500000000',
  });
  assert.equal(
    withGhostPrice.length,
    0,
    'ghost priceMin hides rent listings that have no sale price'
  );

  const afterClear = filterFilingBrowseItems([rentLow, rentHigh], {
    ...DEFAULT_FILING_BROWSE_FILTERS,
    dealType: 'rent_rahn_ejare',
    ...filingFinancialFiltersClearForDeal('rent_rahn_ejare'),
  });
  assert.equal(afterClear.length, 2, 'clearing financial ghosts restores rent results');

  console.log('filing-browse-filters OK');
}

main();
