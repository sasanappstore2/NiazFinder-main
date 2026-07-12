/**
 * Unit checks for smart → UI location ambiguity wiring
 * Run: npx tsx src/components/need-intake/fixtures/run-smart-location-ambiguity-self-test.ts
 */

import {
  buildSmartLocationOptions,
  buildLocationAmbiguityOptions,
} from '../IntakeLocationAmbiguityPrompt';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const emptyBase: SmartExtractionResult = {
  category: { value: null, subcategory: null, confidence: 0 },
  location: {
    city: 'مشهد',
    citySlug: 'mashhad',
    neighborhood: 'فردوسی',
    neighborhoodSlug: null,
    confidence: 0.8,
    disambiguationNeeded: true,
    alternatives: [
      { neighborhood: 'فردوسی', neighborhoodSlug: 'فردوسی' },
      { neighborhood: 'توس فردوسی', neighborhoodSlug: 'توس-فردوسی' },
      { neighborhood: 'فردوسی ۱۰', neighborhoodSlug: 'osm:فردوسی۱۰', district: 'street' },
    ],
  },
  transaction: { type: 'RENT', confidence: 0.85 },
  budget: { min: null, max: null, confidence: 0 },
  property: { area: null, rooms: 2, confidence: 0.9 },
  metadata: {},
  validation: { isComplete: false, missingFields: [], warnings: [], suggestions: [] },
};

const smartOpts = buildSmartLocationOptions(emptyBase);
assert(smartOpts.length >= 2, `expected >=2 smart options, got ${smartOpts.length}`);
assert(
  smartOpts.some((o) => o.label.includes('فردوسی')),
  'should include فردوسی labels'
);
assert(
  smartOpts.every((o) => o.value.startsWith('neighborhood:')),
  'values should be neighborhood:*'
);

const legacyNone = buildLocationAmbiguityOptions(undefined);
assert(legacyNone.length === 0, 'legacy empty without parsedIntent');

const mergedCount = new Set([
  ...smartOpts.map((o) => o.value),
  ...legacyNone.map((o) => o.value),
]).size;
assert(mergedCount === smartOpts.length, 'dedupe should keep smart options');

console.log('smart-location-ambiguity self-test OK', {
  options: smartOpts.map((o) => o.label),
});
