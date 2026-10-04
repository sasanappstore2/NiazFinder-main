/**
 * Self-test: intake merge policy (dual-pipeline authority + stale discard).
 * Run: npx tsx src/lib/need-intake/fixtures/run-intake-merge-policy-self-test.ts
 */
import type { NeedDraft } from '@/contracts/need-intake';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';
import {
  mergeIntakeSources,
  shouldAcceptSmartResponse,
  smartResultToProposals,
  pickNeighborhoodSoftFill,
  buildSourceSig,
} from '@/lib/need-intake/intake-merge-policy';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function emptySmart(overrides: Partial<SmartExtractionResult> = {}): SmartExtractionResult {
  return {
    category: { value: 'residential-rent', subcategory: 'apartment-rent', confidence: 0.9 },
    location: {
      city: 'مشهد',
      citySlug: 'mashhad',
      neighborhood: 'احمدآباد',
      neighborhoodSlug: 'ahmadabad',
      confidence: 0.85,
    },
    transaction: { type: 'RENT', dealType: 'rent', confidence: 0.9 },
    budget: { min: null, max: 15_000_000, confidence: 0.8 },
    property: { area: 90, rooms: 2, confidence: 0.8 },
    metadata: {},
    validation: { isComplete: false, missingFields: [], warnings: [], suggestions: [] },
    ...overrides,
  };
}

function emptyDraft(overrides: Partial<NeedDraft> = {}): NeedDraft {
  return {
    schemaVersion: 1 as NeedDraft['schemaVersion'],
    sourceText: 'اجاره آپارتمان در احمدآباد مشهد',
    entities: {
      categorySlug: 'real-estate',
      subcategorySlug: 'apartment-rent',
      city: 'مشهد',
      citySlug: 'mashhad',
    },
    answers: {},
    parsedIntent: {
      intentType: 'property_search',
      categorySlug: 'real-estate',
      subcategorySlug: 'apartment-rent',
      city: 'مشهد',
      entities: {},
      rawText: 'اجاره آپارتمان در احمدآباد مشهد',
      confidence: 0.9,
    },
    completionState: {
      canPublish: false,
      missingRequired: [],
      warnings: [],
      score: 0.5,
    },
    ...overrides,
  } as NeedDraft;
}

const sigA = buildSourceSig('اجاره آپارتمان در احمدآباد', '');
const sigB = buildSourceSig('خرید ویلا در تهران', '');

// 1) Stale intelligence discarded
{
  const r = mergeIntakeSources({
    currentSourceSig: sigA,
    intelligence: {
      draft: emptyDraft(),
      sourceSig: sigB,
      receivedAtMs: Date.now(),
    },
  });
  assert(r.draft === null, 'stale intel must not yield draft');
  assert(r.discarded.some((d) => d.source === 'intelligence'), 'must discard intel');
}

// 2) Fresh intelligence is authoritative
{
  const draft = emptyDraft();
  const r = mergeIntakeSources({
    currentSourceSig: sigA,
    intelligence: { draft, sourceSig: sigA, receivedAtMs: 1 },
    smart: {
      result: emptySmart(),
      sourceSig: sigA,
      receivedAtMs: 2,
      requestId: 2,
    },
  });
  assert(r.draft === draft, 'intel draft authoritative');
  assert(r.draftSource === 'intelligence', 'source=intelligence');
  assert(r.proposals.length > 0, 'smart still yields proposals');
  assert(r.smartIsFresh && r.intelligenceIsFresh, 'both fresh');
}

// 3) User locks suppress smart proposals
{
  const proposals = smartResultToProposals(emptySmart(), {
    categoryLockedByUser: true,
    cityLockedByUser: true,
    dealLockedByUser: true,
  });
  assert(
    !proposals.some((p) => p.fieldKey === 'categorySlug'),
    'category locked'
  );
  assert(!proposals.some((p) => p.fieldKey === 'city'), 'city locked');
  assert(!proposals.some((p) => p.fieldKey === 'dealType'), 'deal locked');
  assert(
    proposals.some((p) => p.fieldKey === 'neighborhood'),
    'neighborhood still proposable'
  );
}

// 4) shouldAcceptSmartResponse race guards
{
  assert(
    shouldAcceptSmartResponse({
      incomingRequestId: 5,
      currentRequestId: 5,
      incomingSourceSig: sigA,
      currentSourceSig: sigA,
      isComposeStep: true,
    }),
    'accept matching'
  );
  assert(
    !shouldAcceptSmartResponse({
      incomingRequestId: 4,
      currentRequestId: 5,
      incomingSourceSig: sigA,
      currentSourceSig: sigA,
      isComposeStep: true,
    }),
    'reject stale request id'
  );
  assert(
    !shouldAcceptSmartResponse({
      incomingRequestId: 5,
      currentRequestId: 5,
      incomingSourceSig: sigB,
      currentSourceSig: sigA,
      isComposeStep: true,
    }),
    'reject stale sig'
  );
  assert(
    !shouldAcceptSmartResponse({
      incomingRequestId: 5,
      currentRequestId: 5,
      incomingSourceSig: sigA,
      currentSourceSig: sigA,
      isComposeStep: false,
    }),
    'reject outside compose'
  );
}

// 5) Out-of-order: older smart discarded by sig
{
  const r = mergeIntakeSources({
    currentSourceSig: sigA,
    smart: {
      result: emptySmart(),
      sourceSig: sigB,
      receivedAtMs: Date.now() - 1000,
      requestId: 1,
    },
  });
  assert(r.proposals.length === 0, 'stale smart no proposals');
  assert(r.discarded.some((d) => d.reason === 'stale_source_sig'), 'stale reason');
}

// 6) Neighborhood soft-fill
{
  const hit = pickNeighborhoodSoftFill(emptySmart());
  assert(hit?.neighborhood === 'احمدآباد', 'soft-fill neighborhood');
  const locked = pickNeighborhoodSoftFill(emptySmart(), {
    neighborhoodLockedByUser: true,
  });
  assert(locked === null, 'locked neighborhood');
  const ambiguous = pickNeighborhoodSoftFill(
    emptySmart({
      location: {
        city: 'مشهد',
        citySlug: 'mashhad',
        neighborhood: 'احمدآباد',
        neighborhoodSlug: 'ahmadabad',
        confidence: 0.9,
        disambiguationNeeded: true,
        alternatives: [
          { neighborhood: 'احمدآباد', neighborhoodSlug: 'ahmadabad' },
          { neighborhood: 'آزادشهر', neighborhoodSlug: 'azadshahr' },
        ],
      },
    })
  );
  assert(ambiguous === null, 'no soft-fill when ambiguous');
}

console.log('intake-merge-policy self-test: OK');
