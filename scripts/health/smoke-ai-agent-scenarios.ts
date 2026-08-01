/**
 * Offline smoke: intent routing + leak sanitization for Persian agent scenarios.
 * Does not call the live LLM.
 * Run: npx --yes tsx scripts/health/smoke-ai-agent-scenarios.ts
 */
import { routeAgentIntent } from '@/lib/ai-agent/intent-router';
import { parseToolCallsFromContent } from '@/lib/ai-agent/tool-call-parser';
import {
  containsToolLeakage,
  sanitizeAgentVisibleText,
  sanitizePersistedAgentContent,
} from '@/lib/ai-agent/output-sanitizer';
import { parseAgentJson } from '@/lib/ai-agent/gemma4-agent';
import { buildAiAgentSystemPrompt } from '@/lib/ai-agent/prompt';
import { explainNeedFieldsForVertical, getSiteHelpFaq } from '@/lib/ai-agent/knowledge/site-pack';

function assert(cond: unknown, m: string) {
  if (!cond) throw new Error(m);
}

const scenarios: Array<{ text: string; intent: string }> = [
  { text: 'سلام', intent: 'greeting' },
  { text: 'دسته خودرو کجاست؟', intent: 'category_lookup' },
  { text: 'چطور نیاز ثبت کنم در تهران؟', intent: 'post_guide' },
  { text: 'موجودی کیف پولم چقدره؟', intent: 'account_wallet' },
  { text: 'نیازهای مشابه اجاره آپارتمان پیدا کن', intent: 'need_search' },
  { text: 'کسب‌وکار املاک در تهران پیدا کن', intent: 'business_search' },
  { text: 'راهنمای بخش چت سایت چیست؟', intent: 'section_help' },
];

for (const s of scenarios) {
  const r = routeAgentIntent(s.text);
  assert(r.intent === s.intent, `${s.text} → ${r.intent} (expected ${s.intent})`);
}

const leak =
  'کاربر سوال کرده. <|tool_call>call: search_site_categories{query: "خودرو"}<tool_call|>';
const parsed = parseAgentJson(leak);
assert(parsed.toolCalls[0]?.name === 'search_site_categories', 'leak → tool');
assert(!sanitizeAgentVisibleText(leak).includes('tool_call'), 'no tool_call in UI text');
assert(!containsToolLeakage(sanitizePersistedAgentContent(leak)), 'persisted clean');

const fields = explainNeedFieldsForVertical('vehicles');
assert(fields.deepLink === '/post', 'deepLink');
assert(fields.requiredFields.length > 0, 'required fields');

const help = getSiteHelpFaq('ثبت نیاز');
assert(help.links.some((l) => l.href === '/post'), 'help link');

const prompt = buildAiAgentSystemPrompt({
  memoryBlock: 'حافظه کاربر:\n- شهر ترجیحی: تهران',
  intentHint: 'سوال دسته',
});
assert(prompt.includes('نیازفایندر'), 'prompt identity');
assert(prompt.includes('تهران'), 'memory injected');
assert(prompt.includes('search_site_neighborhoods'), 'new tools in prompt');

const formats = [
  '{"action":"tool","name":"get_site_help","arguments":{"topic":"wallet"}}',
  'call: get_site_help{topic: "wallet"}',
  '```json\n{"action":"tool","name":"search_site_cities","arguments":{"query":"تهران"}}\n```',
];
for (const f of formats) {
  const p = parseToolCallsFromContent(f);
  assert(p.toolCalls.length >= 1, `format failed: ${f.slice(0, 40)}`);
}

console.log('smoke-ai-agent-scenarios OK');
