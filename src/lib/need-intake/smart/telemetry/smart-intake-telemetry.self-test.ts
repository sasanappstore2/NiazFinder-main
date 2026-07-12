/**
 * Smart intake telemetry self-test
 * Run: npx tsx src/lib/need-intake/smart/telemetry/smart-intake-telemetry.self-test.ts
 */

import {
  trackSmartExtractionRequest,
  trackSmartExtractionResponse,
  trackDisambiguationShown,
  trackDisambiguationApplied,
  trackSmartTitleShown,
  trackSmartTitleApplied,
} from './smart-intake-telemetry';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// Without analytics consent these no-op — ensure API shape doesn't throw
trackSmartExtractionRequest({ textLength: 42, modelId: 'rules' });
trackSmartExtractionResponse({
  result: {
    category: { value: 'apartment-rent', subcategory: null, confidence: 0.8 },
    location: {
      city: 'مشهد',
      citySlug: 'mashhad',
      neighborhood: 'فردوسی',
      neighborhoodSlug: null,
      confidence: 0.8,
      disambiguationNeeded: true,
      alternatives: [
        { neighborhood: 'فردوسی', neighborhoodSlug: 'a' },
        { neighborhood: 'توس فردوسی', neighborhoodSlug: 'b' },
      ],
    },
    transaction: { type: 'RENT', confidence: 0.9 },
    budget: { min: null, max: null, confidence: 0 },
    property: { area: null, rooms: 2, confidence: 0.9 },
    metadata: {},
    validation: { isComplete: false, missingFields: [], warnings: [], suggestions: [] },
  },
  latencyMs: 15,
});
trackDisambiguationShown({ alternativesCount: 3, city: 'مشهد' });
trackDisambiguationApplied({
  selectedOption: 'فردوسی',
  optionIndex: 0,
  totalOptions: 3,
});
trackSmartTitleShown({ hasTitle: true, hasDescription: false });
trackSmartTitleApplied({ field: 'title', generatedLength: 24 });

assert(typeof trackSmartExtractionRequest === 'function', 'export request');
assert(typeof trackSmartExtractionResponse === 'function', 'export response');

console.log('smart-intake-telemetry self-test OK (no-throw + API shape)');
