/**
 * Confidence discipline self-test (RFC-0004 / Compose Auto-Apply).
 * Replaces obsolete confidence-driven UX + ambiguity-prompt theater checks.
 *
 * Run: npm run test:intake-confidence
 */
import assert from 'node:assert/strict';
import {
  COMPOSE_AUTO_APPLY_MIN_CONFIDENCE,
  COMPOSE_EVIDENCE_REQUIRED_MIN_CONFIDENCE,
  mayAutoApplyField,
  mayAutoApplyLocation,
  sanitizeDraftForComposeAutoApply,
} from '@/lib/need-intake/compose-auto-apply';
import {
  REGISTRY_CATEGORY_OVERRIDE_THRESHOLD,
  RULES_DISAMBIG_MIN_CONFIDENCE,
} from '@/intake/rules/config';
import {
  UNDERSTANDING_CATEGORY_MIN_CONFIDENCE,
  UNDERSTANDING_LOCATION_MIN_CONFIDENCE,
} from '@/lib/need-intake/build-intake-understanding';
import type { NeedDraft } from '@/contracts/need-intake';

function draft(over: Partial<NeedDraft> = {}): NeedDraft {
  return {
    schemaVersion: 1,
    sourceText: 'تست',
    answers: {},
    entities: {},
    sections: [],
    completeness: 0,
    missingRequired: [],
    nextQuestion: null,
    parsedIntent: {
      intentType: 'buy',
      confidence: 0.5,
      entities: {},
      rawText: 'تست',
    },
    ...over,
  } as NeedDraft;
}

function main(): void {
  assert.equal(COMPOSE_AUTO_APPLY_MIN_CONFIDENCE, 0.85);
  assert.equal(RULES_DISAMBIG_MIN_CONFIDENCE, 0.85);
  assert.equal(UNDERSTANDING_CATEGORY_MIN_CONFIDENCE, 0.85);
  assert.equal(UNDERSTANDING_LOCATION_MIN_CONFIDENCE, 0.85);
  assert.equal(REGISTRY_CATEGORY_OVERRIDE_THRESHOLD, 0.85);
  assert.equal(COMPOSE_EVIDENCE_REQUIRED_MIN_CONFIDENCE, 0.75);

  const weak = draft({
    entities: { categorySlug: 'apartment-rent', city: 'تهران', neighborhood: 'ونک' },
    fieldMeta: {
      categorySlug: { value: 'apartment-rent', confidence: 0.7, source: 'rule' },
      city: { value: 'تهران', confidence: 0.7, source: 'dictionary' },
      neighborhood: { value: 'ونک', confidence: 0.65, source: 'resolver' },
    },
  });
  assert.equal(mayAutoApplyField(weak, 'categorySlug'), false);
  assert.equal(mayAutoApplyLocation(weak, 'city'), false);
  assert.equal(mayAutoApplyLocation(weak, 'neighborhood'), false);

  const strong = draft({
    entities: { categorySlug: 'apartment-rent', city: 'تهران' },
    fieldMeta: {
      categorySlug: {
        value: 'apartment-rent',
        confidence: 0.9,
        source: 'rule',
        evidence: 'rules-clear',
      },
      city: {
        value: 'تهران',
        confidence: 0.9,
        source: 'dictionary',
        evidence: 'parseCity',
      },
    },
  });
  assert.equal(mayAutoApplyField(strong, 'categorySlug'), true);
  assert.equal(mayAutoApplyLocation(strong, 'city'), true);

  const cleaned = sanitizeDraftForComposeAutoApply(weak);
  assert.equal((cleaned.entities as Record<string, unknown>).categorySlug, undefined);
  assert.equal((cleaned.entities as Record<string, unknown>).neighborhood, 'ونک');

  console.log(
    JSON.stringify({
      ok: true,
      autoApplyMin: COMPOSE_AUTO_APPLY_MIN_CONFIDENCE,
      registryOverride: REGISTRY_CATEGORY_OVERRIDE_THRESHOLD,
    })
  );
  console.log('test:intake-confidence OK');
}

main();
