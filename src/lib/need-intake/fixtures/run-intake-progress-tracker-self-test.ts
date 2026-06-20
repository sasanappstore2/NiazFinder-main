import assert from 'node:assert/strict';
import type { NeedDraft } from '@/contracts/need-intake';
import { buildIntakeProgressSnapshot } from '@/lib/need-intake/intake-progress-tracker';

function minimalDraft(overrides: Partial<NeedDraft> = {}): NeedDraft {
  return {
    templateId: 'test',
    templateVersion: 1,
    schemaVersion: 1,
    vertical: 'real-estate',
    category: 'apartment-rent',
    entities: {},
    completionScore: 0,
    matchabilityScore: 0,
    completionState: 'NEEDS_INFO',
    sections: [],
    missingFields: [],
    sourceText: '',
    updatedAt: new Date().toISOString(),
    parsedIntent: {
      intentType: 'property_search',
      confidence: 0.5,
      entities: {},
      rawText: '',
    },
    answers: {},
    ...overrides,
  };
}

function testShortTextEnriching() {
  const draft = minimalDraft({
    sourceText: 'آپارتمان',
    parsedIntent: {
      intentType: 'property_search',
      confidence: 0.5,
      entities: {},
      rawText: 'آپارتمان',
    },
  });
  const snap = buildIntakeProgressSnapshot(draft, { enriching: true, needText: 'آپارتمان' });
  assert.equal(snap.core.need, 'running');
  assert.equal(snap.core.category, 'blocked');
}

function testCategoryNoCityEnriching() {
  const draft = minimalDraft({
    sourceText: 'آپارتمان دو خوابه در تهران برای اجاره',
    entities: { categorySlug: 'apartment-rent', subcategorySlug: 'apartment-rent' },
    parsedIntent: {
      intentType: 'property_search',
      confidence: 0.9,
      categorySlug: 'apartment-rent',
      entities: {},
      rawText: 'آپارتمان دو خوابه در تهران برای اجاره',
    },
  });
  const snap = buildIntakeProgressSnapshot(draft, {
    enriching: true,
    needText: 'آپارتمان دو خوابه در تهران برای اجاره',
  });
  assert.equal(snap.core.need, 'done');
  assert.equal(snap.core.category, 'done');
  assert.equal(snap.core.city, 'running');
}

function testApartmentRentFields() {
  const draft = minimalDraft({
    sourceText: 'آپارتمان اجاره تهران',
    entities: {
      categorySlug: 'real-estate',
      subcategorySlug: 'apartment-rent',
      city: 'تهران',
      transactionType: 'rent',
    },
    parsedIntent: {
      intentType: 'property_search',
      confidence: 0.9,
      categorySlug: 'apartment-rent',
      city: 'تهران',
      entities: { dealType: 'rent' },
      rawText: 'آپارتمان اجاره تهران',
    },
    answers: { dealType: 'rent' },
  });
  const snap = buildIntakeProgressSnapshot(draft, { enriching: false });
  assert.ok(snap.fields.length > 0);
  const mapPin = snap.fields.find((f) => f.key === 'mapPin');
  assert.ok(mapPin, 'expected mapPin in field shards for apartment-rent');
  assert.equal(mapPin?.required, true);
}

function testCategoryAmbiguous() {
  const draft = minimalDraft({
    sourceText: 'آپارتمان دو خوابه در ونک تهران',
    parsedIntent: {
      intentType: 'property_search',
      confidence: 0.7,
      entities: {},
      rawText: 'آپارتمان دو خوابه در ونک تهران',
      categoryCandidates: [
        { slug: 'apartment-rent', label: 'اجاره آپارتمان', confidence: 0.9 },
        { slug: 'apartment-sale', label: 'فروش آپارتمان', confidence: 0.88 },
      ],
    },
  });
  const snap = buildIntakeProgressSnapshot(draft, {
    enriching: true,
    needText: 'آپارتمان دو خوابه در ونک تهران',
  });
  assert.notEqual(snap.core.category, 'done');
}

testShortTextEnriching();
testCategoryNoCityEnriching();
testApartmentRentFields();
testCategoryAmbiguous();
console.log('test:intake-progress-tracker OK');
