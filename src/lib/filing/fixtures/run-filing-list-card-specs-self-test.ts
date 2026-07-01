import assert from 'node:assert/strict';
import { buildCategoryFilingListSpecs } from '@/lib/filing/filing-list-card-specs';
import type { PropertyListing } from '@/contracts/business-profile';

function listing(overrides: Partial<PropertyListing>): PropertyListing {
  return {
    id: 'x',
    title: 'test',
    ...overrides,
  };
}

function main() {
  const land = buildCategoryFilingListSpecs(
    listing({
      propertyType: 'land',
      deedType: 'سند تک برگ',
      orientation: 'شمالی',
      landUse: 'مسکونی',
      frontage: '25',
    })
  );
  assert.ok(land.some((s) => s.key === 'landUse' && s.label.includes('مسکونی')));
  assert.ok(land.some((s) => s.key === 'frontage'));
  assert.equal(land.find((s) => s.key === 'rooms'), undefined);

  const shop = buildCategoryFilingListSpecs(
    listing({
      propertyType: 'shop',
      floor: 0,
      buildingAge: 10,
      deedType: 'سند تک برگ',
      frontage: '8',
    })
  );
  assert.ok(shop.some((s) => s.key === 'frontage'));
  assert.equal(shop.find((s) => s.key === 'rooms'), undefined);

  const apt = buildCategoryFilingListSpecs(
    listing({
      propertyType: 'apartment',
      floor: 3,
      rooms: 2,
      buildingAge: 7,
      deedType: 'سند شش‌دانگ',
    })
  );
  assert.deepEqual(
    apt.map((s) => s.key),
    ['floor', 'rooms', 'buildingAge', 'documentType']
  );

  console.log('filing-list-card-specs OK');
}

main();
