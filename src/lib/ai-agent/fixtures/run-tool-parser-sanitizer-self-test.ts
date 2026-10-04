/**
 * Self-test: multi-format tool parser + output sanitizer.
 * Run: npx --yes tsx src/lib/ai-agent/fixtures/run-tool-parser-sanitizer-self-test.ts
 */
import { parseToolCallsFromContent, looksLikeToolCallPayload } from '@/lib/ai-agent/tool-call-parser';
import {
  containsToolLeakage,
  sanitizeAgentStreamChunk,
  sanitizeAgentVisibleText,
  sanitizePersistedAgentContent,
} from '@/lib/ai-agent/output-sanitizer';
import { parseAgentJson } from '@/lib/ai-agent/gemma4-agent';
import { routeAgentIntent } from '@/lib/ai-agent/intent-router';

function assert(cond: unknown, m: string) {
  if (!cond) throw new Error(m);
}

// Exact leak from production bug
const LEAK =
  'استدلال کاربر در مورد دسته‌بندی خودرو سوال کرده است. برای یافتن دسته‌بندی مرتبط، از ابزار search_site_categories استفاده می‌کنم. <|tool_call>call: search_site_categories{query: "خودرو"}<tool_call|>';

const parsed = parseToolCallsFromContent(LEAK);
assert(parsed.toolCalls.length === 1, 'expected 1 tool call from leak');
assert(
  parsed.toolCalls[0]!.name === 'search_site_categories',
  `name=${parsed.toolCalls[0]!.name}`,
);
assert(
  String(parsed.toolCalls[0]!.arguments.query) === 'خودرو',
  `query=${JSON.stringify(parsed.toolCalls[0]!.arguments)}`,
);
assert(!containsToolLeakage(sanitizeAgentVisibleText(LEAK)), 'sanitizer must clear leak');
assert(
  sanitizeAgentStreamChunk('سلام ') === 'سلام ',
  'stream chunk must keep trailing space',
);
assert(sanitizeAgentVisibleText(' سلام ') === 'سلام', 'final sanitize may trim');

const jsonTool = '{"action":"tool","name":"get_site_categories","arguments":{"depth":1}}';
const p2 = parseToolCallsFromContent(jsonTool);
assert(p2.toolCalls[0]?.name === 'get_site_categories', 'json tool');

const agent = parseAgentJson(LEAK);
assert(agent.toolCalls.length === 1, 'parseAgentJson must extract tool');
assert(agent.text === '', 'tool round must not expose text');

const cleanPersisted = sanitizePersistedAgentContent(
  `<think>کوتاه</think>\n${LEAK}`,
);
assert(!containsToolLeakage(cleanPersisted), 'persisted sanitize');
assert(looksLikeToolCallPayload(LEAK), 'looksLikeToolCallPayload');

assert(routeAgentIntent('سلام').intent === 'greeting', 'greeting');
assert(routeAgentIntent('دسته خودرو کجاست؟').intent === 'category_lookup', 'category');
assert(routeAgentIntent('موجودی کیف پولم چقدره؟').intent === 'account_wallet', 'wallet');
assert(routeAgentIntent('چطور نیاز ثبت کنم؟').intent === 'post_guide', 'post');

console.log('PASS tool-parser-sanitizer self-test');
