/**
 * Self-test for goldenCaseToTruthSnapshot — CCQS adapter (`PLAN/ccqs-architecture.md` §4).
 * Run via: npm run test:ccqs-golden-adapter
 */
import { goldenCaseToTruthSnapshot } from '@/ccqs/adapters/golden-case-to-snapshot';
import { semanticSnapshotSchema } from '@/semantic-evaluation-engine/types';
import type { GoldenCase } from '@/ccqs/types';

function fail(id: string, msg: string): string {
  return `${id}: ${msg}`;
}

function goldenCase(overrides: Partial<GoldenCase>): GoldenCase {
  return {
    caseId: 'test-case',
    rawText: 'موتور سیکلت هوندا میخوام',
    expectedCategory: 'motorcycle',
    expectedLocationCity: null,
    tags: [],
    addedAt: 't',
    reason: 'test',
    deprecated: false,
    ...overrides,
  };
}

const OPTS = { snapshotId: 'snap-1', producedAt: '2026-07-08T00:00:00.000Z' };

function testResolvedCategory(): string[] {
  const errors: string[] = [];
  const snap = goldenCaseToTruthSnapshot(goldenCase({}), OPTS);
  const valid = semanticSnapshotSchema.safeParse(snap);
  if (!valid.success) errors.push(fail('schema', valid.error.message));
  const cat = snap.fields.find((f) => f.fieldId === 'category');
  if (cat?.state !== 'resolved' || cat.confidence !== 1) errors.push(fail('resolved-category', JSON.stringify(cat)));
  return errors;
}

function testMissingCategory(): string[] {
  const errors: string[] = [];
  const snap = goldenCaseToTruthSnapshot(goldenCase({ expectedCategory: null }), OPTS);
  const cat = snap.fields.find((f) => f.fieldId === 'category');
  if (cat?.state !== 'missing' || cat.value !== null) errors.push(fail('missing-category', JSON.stringify(cat)));
  return errors;
}

function testLocationRawInputContainsValueTrue(): string[] {
  const errors: string[] = [];
  const snap = goldenCaseToTruthSnapshot(goldenCase({ rawText: 'آپارتمان در مشهد', expectedLocationCity: 'مشهد' }), OPTS);
  const loc = snap.fields.find((f) => f.fieldId === 'location');
  if (loc?.provenance.rawInputContainsValue !== true) errors.push(fail('rawInputContainsValue-true', JSON.stringify(loc)));
  return errors;
}

function testLocationRawInputContainsValueFalse(): string[] {
  const errors: string[] = [];
  // Same class of case as inv-01..inv-30 style fixtures where city is a separate concept, not in rawText.
  const snap = goldenCaseToTruthSnapshot(goldenCase({ rawText: 'لپ تاپ گیمینگ نو میخوام', expectedLocationCity: 'رشت' }), OPTS);
  const loc = snap.fields.find((f) => f.fieldId === 'location');
  if (loc?.provenance.rawInputContainsValue !== false) errors.push(fail('rawInputContainsValue-false', JSON.stringify(loc)));
  return errors;
}

function testNoLocationExpected(): string[] {
  const errors: string[] = [];
  const snap = goldenCaseToTruthSnapshot(goldenCase({ expectedLocationCity: null }), OPTS);
  const loc = snap.fields.find((f) => f.fieldId === 'location');
  if (loc?.state !== 'missing' || loc.provenance.rawInputContainsValue !== null) errors.push(fail('no-location', JSON.stringify(loc)));
  return errors;
}

export function runGoldenCaseToSnapshotSelfTest(): { passed: number; failed: string[] } {
  const suites = [testResolvedCategory, testMissingCategory, testLocationRawInputContainsValueTrue, testLocationRawInputContainsValueFalse, testNoLocationExpected];
  const failed = suites.flatMap((fn) => fn());
  return { passed: suites.length - failed.length, failed };
}

const isDirectRun = typeof process !== 'undefined' && Boolean(process.argv[1]?.includes('run-golden-case-to-snapshot-self-test'));

if (isDirectRun) {
  const { passed, failed } = runGoldenCaseToSnapshotSelfTest();
  if (failed.length) {
    console.error('CCQS golden-case-to-snapshot self-test FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`CCQS golden-case-to-snapshot self-test OK: ${passed}/5`);
}
