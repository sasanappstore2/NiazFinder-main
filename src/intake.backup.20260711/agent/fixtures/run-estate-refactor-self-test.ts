/**
 * Self-test: mergeAnalyzeIntoDraft locks + post-fill validation + required resolver.
 */
import { mergeAnalyzeIntoDraft } from '@/intake/aggregate/needDraftAggregate';
import { validatePostFillFields } from '@/intake/agent/post-fill-validation';
import { createEmptyFieldBag, setField } from '@/intake/intelligence-engine/types';
import { resolveRequiredFields } from '@/intake/template/required-field-resolver';
import type { NeedDraft } from '@/contracts/need-intake';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function baseDraft(partial: Partial<NeedDraft> = {}): NeedDraft {
  return {
    templateId: 'real-estate',
    templateVersion: 1,
    schemaVersion: 1,
    vertical: 'real-estate',
    category: 'apartment',
    entities: {
      categorySlug: 'apartment-rent',
      city: 'تهران',
      neighborhood: 'ونک',
      rooms: 2,
    },
    completionScore: 50,
    matchabilityScore: 50,
    completionState: 'NEEDS_INFO',
    sections: [],
    missingFields: [],
    nextQuestion: null,
    sourceText: 'آپارتمان در ونک',
    updatedAt: new Date().toISOString(),
    parsedIntent: {
      intentType: 'rent',
      rawText: 'آپارتمان در ونک',
      categorySlug: 'apartment-rent',
      city: 'تهران',
      entities: {},
      confidence: 0.8,
    },
    answers: { rooms: 2, dealType: 'rent_rahn_ejare', _userSetDealType: true },
    ...partial,
  };
}

function testMergeLocks() {
  const existing = baseDraft();
  const analyzed = baseDraft({
    entities: {
      categorySlug: 'villa-sale',
      city: 'مشهد',
      neighborhood: 'هاشمیه',
      rooms: 3,
    },
    answers: { rooms: 3, dealType: 'buy' },
    sourceText: 'ویلا در مشهد',
  });

  const merged = mergeAnalyzeIntoDraft(existing, analyzed, {
    categoryLockedByUser: true,
    cityLockedByUser: true,
    dealLockedByUser: true,
    lockedFieldKeys: ['rooms'],
  });

  assert(merged.entities.categorySlug === 'apartment-rent', 'category lock failed');
  assert(merged.entities.city === 'تهران', 'city lock failed');
  assert(merged.answers.dealType === 'rent_rahn_ejare', 'deal lock failed');
  assert(merged.answers.rooms === 2, 'rooms lock failed');
  assert(merged.entities.neighborhood === 'هاشمیه', 'unlocked neighborhood should update');
  console.log('ok merge locks');
}

function testPostFillRejects() {
  const bag = createEmptyFieldBag();
  setField(bag, 'area', { value: 2, confidence: 0.9, source: 'ai' });
  setField(bag, 'rooms', { value: 99, confidence: 0.9, source: 'ai' });
  setField(bag, 'budgetMax', { value: 1e16, confidence: 0.9, source: 'ai' });
  const result = validatePostFillFields(bag);
  assert(result.rejectedKeys.includes('area'), 'area should reject');
  assert(result.rejectedKeys.includes('rooms'), 'rooms should reject');
  assert(result.rejectedKeys.includes('budgetMax'), 'budget should reject');
  console.log('ok post-fill rejects');
}

function testRequiredResolver() {
  const r = resolveRequiredFields({
    categorySlug: 'apartment-rent',
    answers: {},
    entities: { city: 'تهران', categorySlug: 'apartment-rent' },
  });
  assert(r.requiredKeys.includes('dealType'), 'dealType required for estate');
  assert(r.missingFieldKeys.includes('dealType'), 'dealType should be missing');
  console.log('ok required resolver');
}

testMergeLocks();
testPostFillRejects();
testRequiredResolver();
console.log('estate-intake-refactor self-test passed');
