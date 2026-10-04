/**
 * Self-test for ThinkTagStreamParser + parseThinkContent helpers.
 * Run: npx --yes tsx src/lib/ai-agent/fixtures/run-think-tag-parser-self-test.ts
 */
import {
  ThinkTagStreamParser,
  composePersistedThinkContent,
  looksLikeAgentToolJson,
  parseThinkContent,
  stripThinkTags,
} from '@/lib/ai-agent/think-tag-parser';

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

function collect(parser: ThinkTagStreamParser, chunks: string[]) {
  const thinking: string[] = [];
  const tokens: string[] = [];
  for (const c of chunks) {
    for (const d of parser.push(c)) {
      if (d.kind === 'thinking') thinking.push(d.delta);
      else tokens.push(d.delta);
    }
  }
  for (const d of parser.flush()) {
    if (d.kind === 'thinking') thinking.push(d.delta);
    else tokens.push(d.delta);
  }
  return { thinking: thinking.join(''), tokens: tokens.join('') };
}

function main() {
  // Complete think + answer in one chunk
  {
    const p = new ThinkTagStreamParser();
    const r = collect(p, ['<think>استدلال کوتاه</think>\nسلام! چطور می‌تونم کمک کنم؟']);
    assert(r.thinking === 'استدلال کوتاه', `thinking got: ${JSON.stringify(r.thinking)}`);
    assert(r.tokens === 'سلام! چطور می‌تونم کمک کنم؟', `tokens got: ${JSON.stringify(r.tokens)}`);
  }

  // Split open/close tags across chunks
  {
    const p = new ThinkTagStreamParser();
    const r = collect(p, ['<th', 'ink>a', 'bc</th', 'ink>', 'جواب']);
    assert(r.thinking === 'abc', `split thinking: ${JSON.stringify(r.thinking)}`);
    assert(r.tokens === 'جواب', `split tokens: ${JSON.stringify(r.tokens)}`);
  }

  // No think tags — all answer
  {
    const p = new ThinkTagStreamParser();
    const r = collect(p, ['فقط پاسخ']);
    assert(r.thinking === '', 'expected empty thinking');
    assert(r.tokens === 'فقط پاسخ', `plain tokens: ${JSON.stringify(r.tokens)}`);
  }

  // parseThinkContent persisted form
  {
    const parsed = parseThinkContent('<think>فکر</think>\nپاسخ نهایی');
    assert(parsed.thinking === 'فکر', `parse thinking: ${parsed.thinking}`);
    assert(parsed.answer === 'پاسخ نهایی', `parse answer: ${parsed.answer}`);
  }

  // Unclosed think (streaming hydrate)
  {
    const parsed = parseThinkContent('<think>هنوز باز');
    assert(parsed.thinking === 'هنوز باز', `unclosed: ${parsed.thinking}`);
    assert(parsed.answer === '', 'unclosed should have empty answer');
  }

  // strip + compose
  {
    const composed = composePersistedThinkContent('ت', 'پ');
    assert(composed === '<think>ت</think>\nپ', `compose: ${composed}`);
    assert(stripThinkTags(composed) === 'پ', `strip: ${stripThinkTags(composed)}`);
  }

  // tool json detection
  {
    assert(
      looksLikeAgentToolJson('<think>x</think>\n{"action":"tool","name":"search_needs_agent"}'),
      'should detect tool json after think',
    );
    assert(!looksLikeAgentToolJson('<think>x</think>\nسلام'), 'plain answer is not tool');
  }

  console.log('PASS think-tag-parser self-test');
}

main();
