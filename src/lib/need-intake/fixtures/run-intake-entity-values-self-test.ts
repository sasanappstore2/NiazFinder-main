/**
 * Entity value + compose source text self-test.
 * Run: npm run test:intake-entity-values
 */
import { hasEntityValue } from '@/intake/entities/entityRegistry';
import {
  canProceedToIntakeLocation,
  composeIntakeSourceText,
} from '@/lib/need-intake/compose-source-text';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import type { NeedDraft } from '@/contracts/need-intake';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const baseEntities = {
  vertical: 'services',
  category: 'plumbing',
  categorySlug: 'plumbing',
  subcategorySlug: null,
  city: 'مشهد',
  citySlug: null,
  province: null,
  neighborhood: null,
  neighborhoodSlug: 'سید-رضی',
  area: null,
  budgetMin: null,
  budgetMax: null,
  rooms: null,
  transactionType: null,
};

assert(
  hasEntityValue(baseEntities, 'neighborhood'),
  'neighborhood via slug'
);

assert(
  hasEntityValue(baseEntities, 'description', {
    sourceText: 'لوله‌کشی آشپزخانه نشتی دارد و فوری است',
  }),
  'description via sourceText'
);

assert(
  composeIntakeSourceText('نیاز اصلی', 'جزئیات بیشتر') ===
    'نیاز اصلی\n\nتوضیحات:\nجزئیات بیشتر',
  'compose format'
);

assert(canProceedToIntakeLocation('x'.repeat(40), ''), 'skip details when need long');
assert(!canProceedToIntakeLocation('کوتاه', ''), 'require details when need short');

const plumbingDraft: NeedDraft = {
  needType: 'plumbing-service-seeking',
  schemaVersion: 1,
  vertical: 'services',
  category: 'plumbing',
  entities: {
    categorySlug: 'plumbing',
    city: 'مشهد',
    neighborhood: 'سید رضی',
    neighborhoodSlug: 'سید-رضی',
  },
  completionScore: 80,
  matchabilityScore: 50,
  completionState: 'ALMOST_READY',
  sections: [],
  missingFields: [],
  nextQuestion: null,
  sourceText: 'لوله‌کشی آشپزخانه در مشهد سید رضی — نشتی شدید',
  updatedAt: new Date().toISOString(),
  parsedIntent: {
    rawText: 'لوله‌کشی',
    categorySlug: 'plumbing',
    intentType: 'service_request',
    confidence: 0.8,
    entities: {},
  },
  answers: {},
  turns: [],
};

assert(
  validateNeedDraftForPublish(plumbingDraft).success,
  'plumbing draft publishable with sourceText'
);

console.log('intake-entity-values self-test: OK');
