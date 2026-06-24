/**
 * Self-test: widget subtype resolution + registry/taxonomy integrity.
 * Run: npx --yes tsx src/lib/business/fixtures/run-widget-resolution-self-test.ts
 *
 * Covers audit fixes C1 (identity.category source) and C2 (single canonical
 * kebab slug format shared by registry + taxonomy).
 */
import type { Business } from '@/contracts/business-profile';
import { getPrimaryRealEstateSubtype } from '@/lib/business/widget-config';
import {
  REAL_ESTATE_SUBTYPES,
  WIDGET_REGISTRY,
  getWidgetsForSubtype,
  isRealEstateSubtype,
} from '@/lib/business/widget-registry';
import { DEFAULT_BUSINESS_OCCUPATIONS } from '@/config/business-occupations-defaults';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

function mockBusiness(category: unknown): Business {
  return { identity: { category } } as unknown as Business;
}

// ── C1: resolution reads identity.category (already an array; no JSON.parse)
assert(
  getPrimaryRealEstateSubtype(mockBusiness(['real-estate-agent'])) === 'real-estate-agent',
  'resolves canonical kebab slug from identity.category'
);
assert(
  getPrimaryRealEstateSubtype(mockBusiness(['some-shop', 'architect'])) === 'architect',
  'resolves first matching subtype among multiple categories'
);

// ── C2: underscore format must NOT resolve (single canonical format = kebab)
assert(
  getPrimaryRealEstateSubtype(mockBusiness(['real_estate_agent'])) === null,
  'legacy underscore slug does not resolve'
);
assert(
  getPrimaryRealEstateSubtype(mockBusiness(['plumber'])) === null,
  'non-real-estate occupation resolves to null'
);

// ── Type-safe guards against malformed runtime shapes
assert(getPrimaryRealEstateSubtype(mockBusiness(undefined)) === null, 'undefined category → null');
assert(getPrimaryRealEstateSubtype(mockBusiness('real-estate-agent')) === null, 'string (not array) category → null');
assert(getPrimaryRealEstateSubtype(null) === null, 'null business → null');
assert(getPrimaryRealEstateSubtype(mockBusiness([])) === null, 'empty category → null');

// ── isRealEstateSubtype guard
assert(isRealEstateSubtype('real-estate-agent'), 'guard accepts a real subtype');
assert(!isRealEstateSubtype('real_estate_lawyer'), 'guard rejects removed placeholder subtype');
assert(!isRealEstateSubtype('property_investment'), 'guard rejects removed placeholder subtype');

// ── C2: every registry key MUST be a real depth-1 occupation slug (single source of truth)
const occBySlug = new Map(DEFAULT_BUSINESS_OCCUPATIONS.map((o) => [o.slug, o]));
for (const subtype of REAL_ESTATE_SUBTYPES) {
  const occ = occBySlug.get(subtype);
  assert(occ != null, `registry key "${subtype}" must exist in occupation taxonomy`);
  assert(occ?.depth === 1, `registry key "${subtype}" must be a depth-1 (pickable) occupation`);
}

// ── Widget wiring per subtype: non-empty, unique ids, sequential order, has component
const ECOSYSTEM_IDS = [
  'reputation_score',
  'verification_badges',
  'specialization_tags',
  'service_coverage',
  'business_network',
  'knowledge_hub',
  'matching_insights',
  'property_request_hub',
];
for (const subtype of REAL_ESTATE_SUBTYPES) {
  const widgets = getWidgetsForSubtype(subtype);
  assert(widgets.length > 0, `${subtype} has widgets`);

  const ids = widgets.map((w) => w.id);
  assert(new Set(ids).size === ids.length, `${subtype} has unique widget ids`);

  widgets.forEach((w, i) => {
    assert(w.defaultOrder === i + 1, `${subtype} widget order sequential at ${w.id}`);
    assert(w.component != null, `${subtype} widget ${w.id} has a component`);
    assert(typeof w.title === 'string' && w.title.length > 0, `${subtype} widget ${w.id} has a title`);
  });

  // Ecosystem widgets appended to every subtype
  for (const eco of ECOSYSTEM_IDS) {
    assert(ids.includes(eco as never), `${subtype} includes ecosystem widget ${eco}`);
  }
}

// ── Registry object keys match the derived runtime list
assert(
  Object.keys(WIDGET_REGISTRY).length === REAL_ESTATE_SUBTYPES.length,
  'REAL_ESTATE_SUBTYPES matches registry keys'
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log(`OK: widget resolution self-test passed (${REAL_ESTATE_SUBTYPES.length} subtypes)`);
