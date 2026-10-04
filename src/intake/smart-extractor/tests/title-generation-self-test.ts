/**
 * Title/description generator self-test (Claude backlog #2)
 * Run: npx tsx src/intake/smart-extractor/tests/title-generation-self-test.ts
 */

import {
  generateSmartTitle,
  generateSmartDescription,
} from '@/lib/need-intake/smart/utils/title-generator';
import type { SmartExtractionResult } from '@/intake/smart-extractor/types';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function base(over: Partial<SmartExtractionResult> = {}): SmartExtractionResult {
  return {
    category: { value: 'apartment-rent', subcategory: null, confidence: 0.8 },
    location: {
      city: 'مشهد',
      citySlug: 'mashhad',
      neighborhood: 'سجاد',
      neighborhoodSlug: null,
      confidence: 0.9,
    },
    transaction: { type: 'RENT', confidence: 0.9 },
    budget: { min: null, max: null, confidence: 0 },
    property: { area: 100, rooms: 2, confidence: 0.9 },
    metadata: {},
    validation: { isComplete: false, missingFields: [], warnings: [], suggestions: [] },
    ...over,
  };
}

assert(generateSmartTitle(null) === null, 'null → null title');
assert(generateSmartDescription(null) === null, 'null → null desc');

const title = generateSmartTitle(base());
assert(!!title && title.includes('سجاد'), `title has neighborhood: ${title}`);
assert(!!title && /خواب|متر|اجاره|آپارتمان/.test(title), `title content: ${title}`);

const empty = generateSmartTitle(
  base({
    category: { value: null, subcategory: null, confidence: 0 },
    location: {
      city: null,
      citySlug: null,
      neighborhood: null,
      neighborhoodSlug: null,
      confidence: 0,
    },
    transaction: { type: null, confidence: 0 },
    property: { area: null, rooms: null, confidence: 0 },
  })
);
assert(empty === null, 'empty extraction → null title');

const desc = generateSmartDescription(
  base({
    budget: { min: null, max: null, depositAmount: 100_000_000, rentAmount: 10_000_000, confidence: 0.9 },
    property: { area: 100, rooms: 2, hasParking: true, confidence: 0.9 },
    metadata: { urgency: 'immediate' },
  }),
  'خونه میخوام سجاد'
);
assert(!!desc && desc.includes('رهن'), `desc budget: ${desc}`);
assert(!!desc && desc.includes('فوری'), `desc urgency: ${desc}`);
assert(!!desc && /۱۰|10/.test(desc.replace(/٬/g, '')), `fa number format in: ${desc}`);

console.log('title-generation self-test OK', { title, desc: desc?.slice(0, 80) });
