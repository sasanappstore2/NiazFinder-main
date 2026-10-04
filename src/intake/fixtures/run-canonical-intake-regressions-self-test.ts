/** Regression coverage for root hints, canonical numeric aliases, location separation and snapshots. */
import { normalizeCategoryPair } from '@/config/categories';
import { recordToEntities } from '@/intake/entities/entityRecord';
import {
  buildParsedIntentFromForm,
  patchNeedDraftEntities,
} from '@/intake/aggregate/needDraftAggregate';
import { getCriticalIntakeFields } from '@/intake/template/critical-intake-catalog';
import { createIntakePublishSnapshot } from '@/lib/need-intake/publish-snapshot';
import type { NeedDraft } from '@/contracts/need-intake';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseDraft: NeedDraft = {
  templateId: 'shop-sale',
  templateVersion: 1,
  schemaVersion: 1,
  vertical: 'real-estate',
  category: 'shop',
  entities: {
    categorySlug: 'commercial-sale',
    subcategorySlug: 'shop-sale',
    city: 'تهران',
    neighborhood: 'ونک',
    area: 180,
    budgetMax: 55_000_000_000,
  },
  completionScore: 1,
  matchabilityScore: 1,
  completionState: 'READY_TO_PUBLISH',
  sections: [],
  missingFields: [],
  nextQuestion: null,
  sourceText: 'مزون ۱۸۰ متر در ونک با بودجه ۵۵ میلیارد',
  updatedAt: new Date().toISOString(),
  parsedIntent: {
    intentType: 'property_search',
    categorySlug: 'commercial-sale',
    subcategorySlug: 'shop-sale',
    confidence: 1,
    entities: {},
    rawText: 'مزون ۱۸۰ متر در ونک با بودجه ۵۵ میلیارد',
  },
  answers: {},
};

async function main(): Promise<void> {
  const root = normalizeCategoryPair('services');
  assert(root.categorySlug === 'services', 'root hint must not become repairs');
  assert(!root.subcategorySlug, 'root hint must not invent a child');

  const normalized = recordToEntities({ areaMin: '180', budget: '55000000000' });
  assert(normalized.area === 180, 'areaMin alias must normalize to area');
  assert(normalized.budgetMax === 55_000_000_000, 'budget alias must normalize to budgetMax');

  const noOpPatch = patchNeedDraftEntities(baseDraft, { neighborhood: 'ونک' });
  assert(noOpPatch === baseDraft, 'a no-op entity patch must not create a new draft revision');

  const withStaleLocation = patchNeedDraftEntities(
    { ...baseDraft, answers: { location: 'تهران' } },
    { neighborhood: 'نیاوران', neighborhoodSlug: 'نياوران' }
  );
  assert(
    withStaleLocation.answers.location === 'نیاوران، تهران',
    'canonical neighborhood must override a stale city-only legacy answer'
  );
  assert(
    withStaleLocation.answers._neighborhoodSlug === 'نياوران',
    'canonical neighborhood slug must survive projection'
  );

  const parsed = buildParsedIntentFromForm({
    needText: 'مزون در ونک',
    detailsText: '۱۸۰ متر',
    categorySlug: 'commercial-sale',
    subcategorySlug: 'shop-sale',
    city: 'تهران',
    neighborhood: 'ونک',
    neighborhoodSlug: 'vanak',
  });
  assert(parsed.entities.neighborhood === 'ونک', 'neighborhood must be stored as neighborhood');
  assert(parsed.entities.area !== 'ونک', 'neighborhood must never be stored as area');

  const saleFields = getCriticalIntakeFields('apartment-sale');
  assert(saleFields.includes('areaMin'), 'apartment sale must expose area');
  assert(saleFields.includes('budget'), 'apartment sale must expose budget');

  const snapshot = await createIntakePublishSnapshot(baseDraft, {
    title: 'فروش ملک تجاری در ونک',
    description: baseDraft.sourceText,
    titleSource: 'template',
  });
  assert(snapshot.schemaVersion === 2, 'publish snapshot must use schema v2');
  assert(/^[a-f0-9]{64}$/.test(snapshot.draftHash), 'snapshot hash must be sha256');
  assert(snapshot.idempotencyKey.length >= 16, 'snapshot must carry idempotency key');

  console.log('canonical-intake regressions: OK');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
