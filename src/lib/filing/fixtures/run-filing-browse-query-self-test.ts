import assert from 'node:assert/strict';
import { DEFAULT_FILING_BROWSE_FILTERS } from '@/lib/filing/browse/apply-filters';
import { buildFilingBrowseWhere } from '@/lib/filing/browse/query-filings';

function main() {
  const sellWhere = buildFilingBrowseWhere(
    { ...DEFAULT_FILING_BROWSE_FILTERS, dealType: 'sell', rooms: '2' },
    { city: 'مشهد' }
  );
  assert.equal(sellWhere.status, 'active');
  assert.equal(sellWhere.city, 'مشهد');
  assert.equal(sellWhere.dealType, 'sell');
  assert.equal(sellWhere.rooms, 2);

  const amenityWhere = buildFilingBrowseWhere(
    { ...DEFAULT_FILING_BROWSE_FILTERS, amenities: ['parking', 'elevator'] },
    { cityId: 'mashhad' }
  );
  assert.equal(amenityWhere.hasParking, true);
  assert.equal(amenityWhere.hasElevator, true);

  const emptyNeighborhoods = buildFilingBrowseWhere(
    { ...DEFAULT_FILING_BROWSE_FILTERS, neighborhoods: ['unknown-slug'] },
    {
      city: 'مشهد',
      neighborhoods: [{ id: 'n1', name: 'Test', nameEn: 'test', isActive: true, order: 0 }],
    }
  );
  assert.ok(Array.isArray(emptyNeighborhoods.AND));
  const andClause = emptyNeighborhoods.AND as Array<{ OR?: Array<{ id?: { in: string[] } }> }>;
  assert.deepEqual(andClause[0]?.OR?.[0]?.id, { in: [] });

  const qWhere = buildFilingBrowseWhere(
    { ...DEFAULT_FILING_BROWSE_FILTERS, q: 'آپارتمان' },
    { city: 'مشهد' }
  );
  assert.ok(Array.isArray(qWhere.OR));
  assert.equal(qWhere.OR!.length, 4);

  console.log('run-filing-browse-query-self-test: ok');
}

main();
