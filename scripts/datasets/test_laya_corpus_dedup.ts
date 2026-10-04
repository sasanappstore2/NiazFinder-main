import { LayaCorpusDedupIndex } from './laya-corpus-dedup';
import { containsLayaCorpusPiiPattern, normalizeLayaCorpusText } from './laya-corpus-audit-shape';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const normalizedLatin = normalizeLayaCorpusText('آپارتمان 123 متر');
assert(normalizedLatin === normalizeLayaCorpusText('آپارتمان ۱۲۳ متر'), 'Persian digits should normalize');
assert(normalizedLatin === normalizeLayaCorpusText('آپارتمان ١٢٣ متر'), 'Arabic digits should normalize');
assert(containsLayaCorpusPiiPattern('contact: person@example.test'), 'email patterns should be detected');
assert(!containsLayaCorpusPiiPattern('یک واحد ۱۳۵ متری می‌خواهم'), 'ordinary need text should pass the PII regex');

const index = new LayaCorpusDedupIndex();
assert(index.observe('text-a', 'target-a', 1).firstOccurrence, 'first text occurrence should be retained');
const repeated = index.observe('text-a', 'target-a', 2);
assert(!repeated.firstOccurrence && !repeated.conflictingTarget, 'same text and targets should be deduplicable');
const conflicting = index.observe('text-a', 'target-b', 3);
assert(conflicting.conflictingTarget, 'same text with different targets should be quarantined');
assert(index.uniqueTextGroups === 1, 'one normalized text group should be counted');
assert(index.conflictingTextGroups === 1 && index.rowsInConflictingGroups === 3, 'all conflict-group rows should be quarantined');

console.log('Laya corpus dedup: 9 checks passed');
