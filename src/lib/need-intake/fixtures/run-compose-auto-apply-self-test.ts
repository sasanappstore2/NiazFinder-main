/**
 * Compose auto-apply discipline self-test (RFC-0004).
 * Run: npx tsx src/lib/need-intake/fixtures/run-compose-auto-apply-self-test.ts
 */
import assert from 'node:assert/strict';
import type { NeedDraft, ParsedIntent } from '@/contracts/need-intake';
import {
  COMPOSE_AUTO_APPLY_MIN_CONFIDENCE,
  mayAutoApplyLocation,
  mayPrefillNeighborhood,
  sanitizeDraftForComposeAutoApply,
} from '@/lib/need-intake/compose-auto-apply';
import { pickNeighborhoodSoftFill } from '@/lib/need-intake/intake-merge-policy';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

function baseDraft(over: Partial<NeedDraft> = {}): NeedDraft {
  const parsed: ParsedIntent = {
    intentType: 'buy',
    confidence: 0.5,
    entities: {},
    rawText: 'تست',
    ...(over.parsedIntent ?? {}),
  };
  return {
    schemaVersion: 1,
    sourceText: 'تست',
    parsedIntent: parsed,
    answers: {},
    entities: {},
    sections: [],
    completeness: 0,
    missingRequired: [],
    nextQuestion: null,
    ...over,
  } as NeedDraft;
}

function testRefuseWeakCategory() {
  const draft = baseDraft({
    entities: { categorySlug: 'residential-rent', subcategorySlug: 'apartment-rent' },
    fieldMeta: {
      categorySlug: { value: 'residential-rent', confidence: 0.7, source: 'rule' },
      subcategorySlug: { value: 'apartment-rent', confidence: 0.7, source: 'rule' },
    },
    parsedIntent: {
      intentType: 'rent',
      confidence: 0.7,
      entities: {},
      rawText: 'اجاره آپارتمان',
      categorySlug: 'residential-rent',
      subcategorySlug: 'apartment-rent',
    },
  });
  const out = sanitizeDraftForComposeAutoApply(draft);
  assert.equal((out.entities as Record<string, unknown>)?.categorySlug, undefined);
  assert.equal(out.parsedIntent.categorySlug, undefined);
}

function testKeepStrongCategory() {
  const draft = baseDraft({
    entities: { categorySlug: 'residential-rent', subcategorySlug: 'apartment-rent' },
    fieldMeta: {
      categorySlug: {
        value: 'residential-rent',
        confidence: COMPOSE_AUTO_APPLY_MIN_CONFIDENCE,
        source: 'rule',
        evidence: 'rules-clear',
      },
      subcategorySlug: {
        value: 'apartment-rent',
        confidence: 0.9,
        source: 'rule',
        evidence: 'rules-clear',
      },
    },
    parsedIntent: {
      intentType: 'rent',
      confidence: 0.9,
      entities: {},
      rawText: 'اجاره آپارتمان در تهران',
      categorySlug: 'residential-rent',
      subcategorySlug: 'apartment-rent',
    },
  });
  const out = sanitizeDraftForComposeAutoApply(draft);
  assert.equal((out.entities as Record<string, unknown>).categorySlug, 'residential-rent');
}

function testRefuseAmbiguousNeighborhood() {
  const draft = baseDraft({
    entities: { neighborhood: 'ونک', neighborhoodSlug: 'vanak-1', city: 'تهران' },
    fieldMeta: {
      neighborhood: { value: 'ونک', confidence: 0.9, source: 'resolver', evidence: 'fuse' },
      neighborhoodSlug: { value: 'vanak-1', confidence: 0.9, source: 'resolver', evidence: 'fuse' },
      city: { value: 'تهران', confidence: 0.9, source: 'dictionary', evidence: 'parseCity' },
    },
    parsedIntent: {
      intentType: 'buy',
      confidence: 0.9,
      entities: { area: 'ونک' },
      rawText: 'آپارتمان در ونک',
      city: 'تهران',
      neighborhoodCandidates: [
        { slug: 'vanak-1', label: 'ونک', city: 'تهران' },
        { slug: 'vanak-2', label: 'ونک', city: 'تهران' },
      ],
    },
  });
  assert.equal(mayAutoApplyLocation(draft, 'neighborhood'), false);
  const out = sanitizeDraftForComposeAutoApply(draft);
  assert.equal((out.entities as Record<string, unknown>).neighborhood, undefined);
  assert.equal((out.entities as Record<string, unknown>).neighborhoodSlug, undefined);
}

function testRefuseWeakLocationApply() {
  const draft = baseDraft({
    entities: { city: 'تهران', neighborhood: 'ونک' },
    fieldMeta: {
      city: { value: 'تهران', confidence: 0.65, source: 'resolver' },
      neighborhood: { value: 'ونک', confidence: 0.65, source: 'resolver' },
    },
  });
  assert.equal(mayAutoApplyLocation(draft, 'city'), false);
  assert.equal(mayAutoApplyLocation(draft, 'neighborhood'), false);
}

function testKeepMidNeighborhoodForPrefill() {
  const draft = baseDraft({
    entities: { city: 'مشهد', neighborhood: 'سیدی' },
    fieldMeta: {
      city: { value: 'مشهد', confidence: 0.9, source: 'dictionary' },
      neighborhood: { value: 'سیدی', confidence: 0.5, source: 'resolver' },
    },
  });
  assert.equal(mayAutoApplyLocation(draft, 'neighborhood'), false);
  assert.equal(mayPrefillNeighborhood(draft), true);
  const out = sanitizeDraftForComposeAutoApply(draft);
  assert.equal((out.entities as Record<string, unknown>).neighborhood, 'سیدی');
}

function testSoftFillAligned() {
  const result = {
    location: {
      neighborhood: 'پاسداران',
      neighborhoodSlug: 'pasdaran',
      confidence: 0.4,
      disambiguationNeeded: false,
      alternatives: [],
    },
  } as unknown as SmartExtractionResult;
  assert.equal(pickNeighborhoodSoftFill(result), null);
  const strong = {
    location: {
      neighborhood: 'پاسداران',
      neighborhoodSlug: 'pasdaran',
      confidence: 0.55,
      disambiguationNeeded: false,
      alternatives: [],
    },
  } as unknown as SmartExtractionResult;
  assert.ok(pickNeighborhoodSoftFill(strong));
}

testRefuseWeakCategory();
testKeepStrongCategory();
testRefuseAmbiguousNeighborhood();
testRefuseWeakLocationApply();
testKeepMidNeighborhoodForPrefill();
testSoftFillAligned();
console.log('test:compose-auto-apply OK');
