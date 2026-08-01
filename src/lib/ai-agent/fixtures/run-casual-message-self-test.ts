/**
 * Run: npx --yes tsx src/lib/ai-agent/fixtures/run-casual-message-self-test.ts
 */
import { isCasualAgentMessage } from '@/lib/ai-agent/casual-message';

function assert(cond: unknown, m: string) {
  if (!cond) throw new Error(m);
}

assert(isCasualAgentMessage('سلام'), 'سلام');
assert(isCasualAgentMessage('  سلام!  '), 'سلام with punctuation');
assert(isCasualAgentMessage('مرسی'), 'مرسی');
assert(!isCasualAgentMessage('سلام، دنبال آپارتمان در تهران هستم'), 'need text');
assert(!isCasualAgentMessage('دسته خودرو کجاست؟'), 'real question');

console.log('PASS casual-message self-test');
