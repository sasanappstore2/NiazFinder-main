/**
 * Self-test: training capture + correction detection (no DB).
 */
import { detectCorrections } from '@/intake/training/detectCorrections';
import { stripTrainingPii, hashSourceText } from '@/intake/training/sanitizeTrainingData';
import type { IntakeAnalysisSnapshot } from '@/intake/training/types';
import type { FieldChangeEvent } from '@/intake/telemetry/postIntakeEvents';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const snapshot: IntakeAnalysisSnapshot = {
  predictedAt: new Date().toISOString(),
  sourceText: 'پی اس فایو در تهران',
  normalizedText: 'پی اس فایو در تهران',
  intentGist: 'خرید PS5 در تهران',
  fieldMeta: {
    categorySlug: {
      value: 'electronics',
      confidence: 0.6,
      source: 'ai',
    },
    city: {
      value: 'تهران',
      confidence: 0.9,
      source: 'rule',
    },
  },
  recommendedQuestions: ['بودجه؟'],
  missingFields: [],
  engine: 'hybrid-intake+gemma4',
  aiInvoked: true,
};

const telemetry: FieldChangeEvent[] = [
  {
    type: 'field_change',
    sessionId: 'sess-1',
    templateId: 'general',
    timestamp: new Date().toISOString(),
    step: 'details',
    fieldKey: 'categorySlug',
    fieldType: 'category',
    changedFrom: 'electronics',
    changedTo: 'gaming-consoles',
    timeSpentOnFieldMs: 1200,
  },
];

const finalEntities = {
  categorySlug: 'gaming-consoles',
  city: 'تهران',
};

const result = detectCorrections({
  finalEntities,
  analysisSnapshot: snapshot,
  telemetryEvents: telemetry,
});

assert(result.hasUserCorrections, 'expected corrections');
assert(result.correctionFields.includes('categorySlug'), 'category correction');
assert(result.qualityFlags.includes('user_corrected_category'), 'category flag');
assert(result.qualityFlags.includes('ai_invoked'), 'ai flag');
assert(result.qualityFlags.includes('human_verified'), 'human verified flag');

const stripped = stripTrainingPii('تماس 09123456789');
assert(stripped.includes('[PHONE]'), 'PII strip phone');
assert(hashSourceText('abc') === hashSourceText('abc'), 'hash stable');

console.log('training-capture-self-test: OK');
console.log(JSON.stringify({ corrections: result.corrections, flags: result.qualityFlags }, null, 2));
