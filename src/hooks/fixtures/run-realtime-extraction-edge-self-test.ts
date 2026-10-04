/**
 * Edge-case helpers for realtime extraction (Claude #4)
 * Run: npx tsx src/hooks/fixtures/run-realtime-extraction-edge-self-test.ts
 */

import {
  prepareIntakeTexts,
  resolveRealtimeDebounceMs,
  sanitizeIntakeText,
  truncateIntakeText,
} from '../use-realtime-extraction';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

// Empty / whitespace
assert(prepareIntakeTexts('   \n\t  ').tooShort === true, 'whitespace too short');
assert(prepareIntakeTexts('ab').tooShort === true, '2 chars too short');
assert(prepareIntakeTexts('abc').tooShort === false, '3 chars ok');

// Zero-width strip
const dirty = `آپارتمان\u200B\u200Cاجاره\uFEFF`;
assert(!/[\u200B\u200C\uFEFF]/.test(sanitizeIntakeText(dirty)), 'zw stripped');

// Truncation preserves shorter length + warns
const long = `${'کلمه '.repeat(2000)}پایان`;
const truncated = truncateIntakeText(long, 100);
assert(truncated.length <= 100, `truncated len ${truncated.length}`);
assert(!truncated.includes('پایان') || long.length <= 100, 'should cut long text');

// Word boundary preference
const words = 'one two three four five six seven eight nine ten';
const cut = truncateIntakeText(words, 20);
assert(cut.length <= 20, 'word truncate length');
assert(!cut.endsWith(' '), 'trimmed at boundary ideally');

// Debounce defaults (no window in node → 300)
assert(resolveRealtimeDebounceMs(undefined) === 300, 'default desktop debounce');
assert(resolveRealtimeDebounceMs(450) === 450, 'explicit debounce');

console.log('realtime-extraction-edge self-test OK');
