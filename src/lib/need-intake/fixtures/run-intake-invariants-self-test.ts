/**
 * Cross-cutting intake invariants — not tied to one neighborhood or ad text.
 * Run: npm run test:intake-invariants
 */
import { extractLocationFragment } from '@/lib/need-intake/location-fragment';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { parsePersianAmountPhrase } from '@/lib/need-intake/parse-persian-amount';
import { resolveTransactionType } from '@/lib/need-intake/resolve-transaction-type';
import { findManagedNeighborhoodAmbiguity } from '@/lib/neighborhoods/find-managed-neighborhood-ambiguity';
import { getNeighborhoodCatalogForCity } from '@/lib/need-intake/neighborhood-catalog.server';
import type { ManagedNeighborhood } from '@/lib/locations/managed-types';
import { resolveIntakeCategory } from '@/lib/need-intake/resolve-intake-category';
import { isCategoryVerticalCoherent } from '@/lib/need-intake/parse-coherence';
import {
  buildParsedIntentFromForm,
  recomputeNeedDraft,
  syncNeedDraftFromForm,
} from '@/intake/aggregate/needDraftAggregate';
import { draftToLegacyPayload } from '@/intake/legacy/draftToLegacyPayload';
import {
  neighborhoodMatchesFragment,
  resolveIntakeNeighborhoodFromDraft,
} from '@/lib/need-intake/sync-intake-location-form';
import type { NeedDraft } from '@/contracts/need-intake';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const AMOUNT_CASES: [string, number][] = [
  ['\u0635\u062F \u0648 \u0633\u06CC', 130],
  ['\u0646\u0647\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647', 950],
  ['\u0628\u06CC\u0633\u062A \u0648 \u067E\u0646\u062C', 25],
  ['\u062F\u0647', 10],
  ['\u067E\u0648\u0646\u0635\u062F', 500],
  ['\u067E\u0627\u0646\u0635\u062F', 500],
  ['\u0686\u0647\u0627\u0631\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647 \u0648 \u062F\u0648', 452],
  ['150', 150],
];

for (const [phrase, expected] of AMOUNT_CASES) {
  assert(parsePersianAmountPhrase(phrase) === expected, `amount ${phrase} -> ${expected}`);
}

const SLOT_CASES: { text: string; rahn?: number; rent?: number }[] = [
  {
    text:
      '\u0645\u06CC\u062A\u0648\u0646\u0645 \u0635\u062F \u0648 \u0633\u06CC \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0628\u062F\u0645 \u0648 \u062F\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647',
    rahn: 130_000_000,
    rent: 10_000_000,
  },
  {
    text:
      '\u0646\u0647\u0635\u062F \u0648 \u067E\u0646\u062C\u0627\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0648 \u0628\u06CC\u0633\u062A \u0648 \u067E\u0646\u062C \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647',
    rahn: 950_000_000,
    rent: 25_000_000,
  },
];

for (const c of SLOT_CASES) {
  const slots = extractPropertySlotsFromText(c.text);
  if (c.rahn != null) {
    assert(Number(slots.rahnAmount) === c.rahn, `rahn ${c.text}: ${slots.rahnAmount}`);
  }
  if (c.rent != null) {
    assert(Number(slots.monthlyRent) === c.rent, `rent ${c.text}: ${slots.monthlyRent}`);
  }
}

const FRAGMENT_CASES: { text: string; minLen: number }[] = [
  {
    text: '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631 \u062C\u0644\u0627\u0644 \u0622\u0644 \u0627\u062D\u0645\u062F \u0645\u06CC\u062E\u0648\u0627\u0645',
    minLen: 10,
  },
  {
    text: '\u0648\u06CC\u0644\u0627 \u062F\u0631 \u0634\u0647\u0631\u06A9 \u063A\u0631\u0628 \u062A\u0647\u0631\u0627\u0646 \u0644\u0627\u0632\u0645 \u062F\u0627\u0631\u0645',
    minLen: 6,
  },
  {
    text:
      '\u0645\u063A\u0627\u0632\u0647 \u062F\u0631 \u062E\u06CC\u0627\u0628\u0627\u0646 \u0622\u0632\u0627\u062F\u06CC \u0634\u0645\u0627\u0644\u06CC \u0645\u0634\u0647\u062F',
    minLen: 8,
  },
];

for (const c of FRAGMENT_CASES) {
  const frag = extractLocationFragment(c.text);
  assert(Boolean(frag && frag.length >= c.minLen), `fragment too short: ${frag}`);
  assert((frag?.split(/\s+/).length ?? 0) >= 2, `fragment should be multi-word: ${frag}`);
}

const budgetFrag = extractLocationFragment(
  '\u06CC\u06A9 \u0645\u0644\u06A9 \u062F\u0631 \u0637\u0627\u0644\u0642\u0627\u0646\u06CC \u0628\u0648\u062F\u062C\u0647 \u0686\u0647\u0627\u0631\u0635\u062F \u0648 \u0633\u06CC \u0645\u06CC\u0644\u06CC\u0648\u0646'
);
assert(
  budgetFrag === '\u0637\u0627\u0644\u0642\u0627\u0646\u06CC',
  `budget should not bleed into hood fragment: ${budgetFrag}`
);

const TX_CASES: { text: string; category: string; expected: string }[] = [
  {
    text:
      '\u0645\u06CC\u062A\u0648\u0646\u0645 \u0635\u062F \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0628\u062F\u0645 \u0648 \u062F\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647',
    category: 'apartment-rent',
    expected: 'DEPOSIT_AND_RENT',
  },
  {
    text: '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631 \u062A\u0647\u0631\u0627\u0646 \u0645\u06CC\u062E\u0648\u0627\u0645',
    category: 'apartment-rent',
    expected: 'RENT',
  },
];

for (const c of TX_CASES) {
  const tx = resolveTransactionType({
    sourceText: c.text,
    categorySlug: 'real-estate',
    subcategorySlug: c.category,
  });
  assert(tx === c.expected, `tx ${c.text}: ${tx} expected ${c.expected}`);
}

function catalogAsManaged(cityName: string): ManagedNeighborhood[] {
  const catalog = getNeighborhoodCatalogForCity(cityName);
  return catalog.map((n, i) => ({
    id: n.slug,
    name: n.name,
    areas: n.areas,
    isActive: true,
    order: i,
  }));
}

for (const city of ['\u0645\u0634\u0647\u062F', '\u062A\u0647\u0631\u0627\u0646']) {
  const hoods = catalogAsManaged(city);
  const longPhrase = '\u062E\u06CC\u0627\u0628\u0627\u0646 \u0622\u06CC\u062A \u0627\u0644\u0644\u0647 \u06A9\u0627\u0634\u0627\u0646\u06CC';
  const hits = findManagedNeighborhoodAmbiguity(hoods, longPhrase);
  assert(hits.length <= 3, `${city} chip explosion: ${hits.length} hits`);
}

function isRealEstateCategorySlug(slug: string): boolean {
  return isCategoryVerticalCoherent(slug, 'real-estate');
}

const APARTMENT_FARAMEZ =
  '\u06CC\u06A9 \u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0631 \u0641\u0631\u0627\u0645\u0631\u0632 \u0639\u0628\u0627\u0633\u06CC \u0645\u06CC\u062E\u0648\u0627\u0645';

const resolvedFromText = resolveIntakeCategory({
  sourceText: APARTMENT_FARAMEZ,
  formCategorySlug: 'repairs',
  formSubcategorySlug: 'repairs',
  categoryLockedByUser: false,
});
assert(
  resolvedFromText.source === 'text',
  `category should come from text, got ${resolvedFromText.source}`
);
assert(
  isRealEstateCategorySlug(resolvedFromText.categorySlug),
  `expected real-estate category, got ${resolvedFromText.categorySlug}`
);

const lockedRepairs = resolveIntakeCategory({
  sourceText: APARTMENT_FARAMEZ,
  formCategorySlug: 'repairs',
  formSubcategorySlug: 'repairs',
  categoryLockedByUser: true,
});
assert(lockedRepairs.categorySlug === 'repairs', `locked repairs expected, got ${lockedRepairs.categorySlug}`);

const parsedFromForm = buildParsedIntentFromForm({
  needText: APARTMENT_FARAMEZ,
  detailsText: '',
  categorySlug: 'repairs',
  subcategorySlug: 'repairs',
  city: '\u0645\u0634\u0647\u062F',
  neighborhood: '\u062C\u0627\u0646\u0628\u0627\u0632',
});
assert(
  isRealEstateCategorySlug(parsedFromForm.categorySlug),
  `buildParsedIntentFromForm category: ${parsedFromForm.categorySlug}`
);

assert(
  !neighborhoodMatchesFragment('\u062C\u0627\u0646\u0628\u0627\u0632', '\u0641\u0631\u0627\u0645\u0631\u0632 \u0639\u0628\u0627\u0633\u06CC'),
  'janbaz should not match faramez fragment'
);

const staleDraft: NeedDraft = recomputeNeedDraft({
  templateId: 'general',
  templateVersion: 1,
  schemaVersion: 1,
  vertical: 'services',
  category: 'plumbing',
  entities: {
    categorySlug: 'repairs',
    subcategorySlug: 'repairs',
    neighborhood: '\u062C\u0627\u0646\u0628\u0627\u0632',
    city: '\u0645\u0634\u0647\u062F',
  },
  completionScore: 0,
  matchabilityScore: 0,
  completionState: 'VERY_INCOMPLETE',
  sections: [],
  missingFields: [],
  nextQuestion: null,
  sourceText: APARTMENT_FARAMEZ,
  updatedAt: new Date().toISOString(),
  parsedIntent: buildParsedIntentFromForm({
    needText: APARTMENT_FARAMEZ,
    detailsText: '',
    categorySlug: '',
    subcategorySlug: '',
    city: '\u0645\u0634\u0647\u062F',
    neighborhood: '',
  }),
  answers: {},
});

const synced = syncNeedDraftFromForm(
  staleDraft,
  {
    needText: APARTMENT_FARAMEZ,
    detailsText: '',
    categorySlug: 'repairs',
    subcategorySlug: 'repairs',
    city: '\u0645\u0634\u0647\u062F',
    neighborhood: '\u0641\u0631\u0627\u0645\u0631\u0632 \u0639\u0628\u0627\u0633\u06CC',
  },
  { categoryLockedByUser: false }
);
const syncedCat = synced.entities.categorySlug ?? '';
assert(
  isRealEstateCategorySlug(syncedCat),
  `syncNeedDraftFromForm category: ${syncedCat}`
);

const hoodFromDraft = resolveIntakeNeighborhoodFromDraft(synced);
assert(
  hoodFromDraft.includes('\u0641\u0631\u0627\u0645\u0631\u0632') || hoodFromDraft.includes('\u0639\u0628\u0627\u0633\u06CC'),
  `neighborhood from draft should prefer text fragment: ${hoodFromDraft}`
);

const legacy = draftToLegacyPayload(staleDraft);
assert(
  isRealEstateCategorySlug(legacy.parsedIntent.categorySlug),
  `draftToLegacyPayload category: ${legacy.parsedIntent.categorySlug}`
);

const userLockedDraft: NeedDraft = {
  ...staleDraft,
  answers: { _userSetCategory: true },
};
const legacyLocked = draftToLegacyPayload(userLockedDraft);
assert(
  legacyLocked.parsedIntent.categorySlug === 'repairs' ||
    legacyLocked.parsedIntent.categorySlug.includes('repair'),
  `user-locked category should stay repairs: ${legacyLocked.parsedIntent.categorySlug}`
);

const shopAreaSlots = extractPropertySlotsFromText('\u0645\u063A\u0627\u0632\u0647 30 \u0645\u062A\u0631\u06CC \u062F\u0631 \u062A\u0647\u0631\u0627\u0646');
assert(shopAreaSlots.areaMin === '30', `shop 30 metri area: ${shopAreaSlots.areaMin}`);

const locationMetriSlots = extractPropertySlotsFromText(
  '\u0641\u0631\u0648\u0634 \u0645\u063A\u0627\u0632\u0647 \u062F\u0631 30 \u0645\u062A\u0631\u06CC\u060C \u062A\u0647\u0631\u0627\u0646'
);
assert(locationMetriSlots.areaMin == null, `location 30 metri should not be area: ${locationMetriSlots.areaMin}`);

const ponSadRahn = extractPropertySlotsFromText(
  '\u0645\u063A\u0627\u0632\u0647 100 \u0645\u062A\u0631\u06CC \u067E\u0648\u0646\u0635\u062F \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0631\u0647\u0646 \u0648 \u062F\u0648\u0627\u0632\u062F\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646 \u0627\u062C\u0627\u0631\u0647'
);
assert(
  ponSadRahn.rahnAmount === '500000000',
  `pon sad rahn expected 500M got ${ponSadRahn.rahnAmount}`
);
assert(
  ponSadRahn.monthlyRent === '12000000',
  `pon sad rent expected 12M got ${ponSadRahn.monthlyRent}`
);

console.log('intake-invariants self-test OK');
