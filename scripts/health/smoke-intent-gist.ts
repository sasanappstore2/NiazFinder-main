/**
 * Smoke test — intent gist (≤10 words) for Persian product phrases.
 * Usage: npm run smoke:intent-gist
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function main() {
  const { runIntentGist, buildRulesSourceText, clampIntentGist, shouldRunIntentGist } = await import(
    '../../src/intake/intelligence-engine/hybrid/intent-gist'
  );
  const { buildIntentGistUserPrompt, INTENT_GIST_SYSTEM_PROMPT } = await import(
    '../../src/intake/intelligence-engine/hybrid/intent-gist-prompt'
  );
  const { geminiChatCompletions } = await import('../../src/lib/gemini/chat-completions');
  const { suggestNeedCategoriesFromText } = await import(
    '../../src/lib/need-intake/intent-parser'
  );

  const text =
    process.argv.slice(2).join(' ') ||
    '\u0645\u0646 \u067E\u06CC \u0627\u0633 \u0641\u0627\u06CC\u0648 \u0641\u0648\u0644 \u0628\u0627\u0632\u06CC \u0646\u0648 \u0645\u06CC\u062E\u0648\u0627\u0645';
  console.log('input:', text);
  console.log('shouldRun:', shouldRunIntentGist(text));

  const rawGemini = await geminiChatCompletions(
    [
      { role: 'system', content: INTENT_GIST_SYSTEM_PROMPT },
      { role: 'user', content: buildIntentGistUserPrompt(text, { cityName: '\u0645\u0634\u0647\u062F' }) },
    ],
    { maxTokens: 512 }
  );
  console.log('gemini raw:', rawGemini?.content ?? '(none)');
  console.log('gemini clamped:', rawGemini?.content ? clampIntentGist(rawGemini.content) : '(none)');

  const gist = await runIntentGist(text);
  console.log('gist:', gist?.gist ?? '(none)', '| provider:', gist?.provider, '| cache:', gist?.cacheHit);

  const enriched = buildRulesSourceText(text, gist?.gist);
  const slugs = suggestNeedCategoriesFromText(enriched).slice(0, 3).map((x) => x.slug);
  console.log('categories after enrich:', slugs);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
