/**
 * Self-test: real-estate listing selectors + profile completeness.
 * Run: npx --yes tsx src/lib/business/fixtures/run-real-estate-widgets-self-test.ts
 */
import type { Business, PropertyListing } from '@/contracts/business-profile';
import {
  activeListings,
  getListings,
  rentalListings,
  soldListings,
} from '@/lib/business/real-estate-listings';
import { computeProfileCompleteness } from '@/lib/business/profile-completeness';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

// ── Listing selectors
const listings: PropertyListing[] = [
  { id: '1', title: 'A' }, // no status → active
  { id: '2', title: 'B', status: 'active', dealType: 'sale' },
  { id: '3', title: 'C', status: 'sold' },
  { id: '4', title: 'D', dealType: 'rent' },
  { id: '5', title: 'E', status: 'rented' },
];
const business = { extensions: { realEstate: { listings } } } as unknown as Business;

assert(getListings(business).length === 5, 'getListings returns all');
assert(activeListings(listings).map((l) => l.id).join(',') === '1,2,4', 'active excludes sold + rented');
assert(soldListings(listings).map((l) => l.id).join(',') === '3', 'sold filters status=sold');
assert(rentalListings(listings).map((l) => l.id).join(',') === '4,5', 'rental = dealType rent OR status rented');
assert(getListings({} as Business).length === 0, 'missing listings → empty array');

// ── Profile completeness
function mockBusiness(overrides: Record<string, unknown>): Business {
  return {
    identity: { logo: '', coverImage: '', description: '', tags: [], category: [] },
    contact: {},
    portfolio: [],
    extensions: {},
    ...overrides,
  } as unknown as Business;
}

const empty = computeProfileCompleteness(mockBusiness({}));
assert(empty.score === 0, 'empty profile scores 0');
assert(empty.missing.length === 6, 'empty profile has 6 missing items');

const full = computeProfileCompleteness(
  mockBusiness({
    identity: {
      logo: 'l.png',
      coverImage: 'c.png',
      description: 'x'.repeat(45),
      tags: [],
      category: [],
    },
    contact: { phone: '0912' },
    portfolio: [{ id: 'p1', type: 'image', title: 't', mediaUrl: 'm' }],
    extensions: { ecosystem: { serviceArea: { areas: [{ city: 'تهران' }] } } },
  })
);
assert(full.score === 100, `full profile scores 100 (got ${full.score})`);
assert(full.missing.length === 0, 'full profile has no missing items');

const partial = computeProfileCompleteness(
  mockBusiness({
    identity: { logo: 'l.png', coverImage: '', description: 'short', tags: [], category: [] },
    contact: { whatsapp: '0912' },
    portfolio: [],
    extensions: {},
  })
);
assert(partial.score === 33, `partial score = round(2/6)=33 (got ${partial.score})`);
assert(
  partial.missing.map((m) => m.key).sort().join(',') === 'cover,description,portfolio,serviceArea',
  'partial missing items correct'
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: real-estate widgets self-test passed (listings + completeness)');
