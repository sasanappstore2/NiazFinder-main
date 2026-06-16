/**
 * Truth reconciler unit test (no live LLM).
 */
import { createEmptyFieldBag, setField } from '@/intake/intelligence-engine/types';
import { applyTruthVerdicts } from '@/intake/intelligence-engine/ai/truth-reconciler';

let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error(`FAIL ${msg}`);
    failed += 1;
  }
}

const bag = createEmptyFieldBag();
setField(bag, 'rahnAmount', { value: 50_000_000, confidence: 0.9, source: 'rule' });
setField(bag, 'monthlyRent', { value: 50_000_000, confidence: 0.9, source: 'rule' });
setField(bag, 'area', { value: 190, confidence: 0.88, source: 'rule' });

const result = applyTruthVerdicts(bag, [
  { field: 'rahnAmount', status: 'incorrect', value: 300_000_000, confidence: 0.92, reasonFa: 'test' },
  { field: 'monthlyRent', status: 'incorrect', value: 50_000_000, confidence: 0.9 },
  { field: 'area', status: 'correct', confidence: 0.95 },
]);

assert(result.corrected.includes('rahnAmount'), 'rahn should be corrected');
assert(result.bag.rahnAmount?.value === 300_000_000, 'rahn value updated');
assert(result.bag.rahnAmount?.source === 'ai', 'rahn source ai');
assert(result.confirmed.includes('area'), 'area confirmed');
assert(!result.corrected.includes('monthlyRent'), 'rent unchanged value not re-corrected');

if (failed) {
  console.error(`truth-reconciler: ${failed} failures`);
  process.exit(1);
}
console.log('truth-reconciler self-test OK');
