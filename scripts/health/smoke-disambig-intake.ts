/**
 * Smoke: rules-first disambiguation intake (pick / suggest / UI candidates).
 *
 * Run: npm run smoke:disambig-intake
 */
import '../stress/intake-marathon/stub-server-only';
import { clearIntelligenceCache } from '@/lib/need-intake/intake-parse-cache-store';
import { runHybridIntakePipeline } from '@/intake/intelligence-engine/hybrid/hybrid-pipeline';
import { isCategoryAmbiguous } from '@/intake/rules/registry-match';
import {
  matchCategoryCandidatesFromRules,
  pickClearCategoryFromRules,
} from '@/intake/rules/registry.server';

const AMBIGUOUS_TEXT = '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u0648\u0646\u06A9 \u062A\u0647\u0631\u0627\u0646';
const CLEAR_TEXT =
  '\u0622\u067E\u0627\u0631\u062A\u0645\u0627\u0646 \u062F\u0648 \u062E\u0648\u0627\u0628\u0647 \u062F\u0631 \u062A\u0647\u0631\u0627\u0646 \u0628\u0631\u0627\u06CC \u0627\u062C\u0627\u0631\u0647 \u0645\u0627\u0647\u0627\u0646\u0647';

async function main(): Promise<void> {
  process.env.NEED_INTAKE_HYBRID_ENABLED = 'true';
  process.env.NEED_INTAKE_RULES_ONLY = 'true';
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA = 'true';
  process.env.NEED_INTAKE_INTENT_SLICE_ENABLED = 'false';
  process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'false';
  await clearIntelligenceCache();

  const candidates = matchCategoryCandidatesFromRules(AMBIGUOUS_TEXT);
  if (candidates.length < 2) {
    console.error('FAIL expected >=2 rule candidates for ambiguous text');
    process.exit(1);
  }
  if (!isCategoryAmbiguous(candidates)) {
    console.error('FAIL expected isCategoryAmbiguous=true');
    process.exit(1);
  }
  if (pickClearCategoryFromRules(AMBIGUOUS_TEXT)) {
    console.error('FAIL expected no clear winner for ambiguous text');
    process.exit(1);
  }
  console.log('ok rules hypothesis ambiguous', candidates.slice(0, 3).map((c) => c.slug).join(','));

  const clear = pickClearCategoryFromRules(CLEAR_TEXT);
  const clearSlug = clear?.subcategorySlug ?? clear?.categorySlug;
  if (!clearSlug) {
    console.error('FAIL expected clear winner for rent text');
    process.exit(1);
  }
  console.log('ok rules clear winner', clearSlug);

  const hybridAmbiguous = await runHybridIntakePipeline({ text: AMBIGUOUS_TEXT });
  const uiCandidates = hybridAmbiguous.categoryCandidates ?? hybridAmbiguous.parsedIntent.categoryCandidates;
  if ((uiCandidates?.length ?? 0) < 2) {
    console.error('FAIL hybrid should expose categoryCandidates for ambiguous text');
    process.exit(1);
  }
  if (hybridAmbiguous.fields.categorySlug?.value || hybridAmbiguous.fields.subcategorySlug?.value) {
    console.error('FAIL hybrid should not auto-fill category for ambiguous text');
    process.exit(1);
  }
  console.log('ok hybrid UI candidates', uiCandidates?.length);

  const hybridClear = await runHybridIntakePipeline({ text: CLEAR_TEXT });
  const slug = String(
    hybridClear.fields.subcategorySlug?.value ?? hybridClear.fields.categorySlug?.value ?? ''
  );
  if (!slug.includes('apartment-rent')) {
    console.error('FAIL hybrid clear path slug=', slug);
    process.exit(1);
  }
  console.log('ok hybrid clear path', slug);

  if (process.env.NEED_INTAKE_LLM_ENABLED === 'true') {
    process.env.NEED_INTAKE_DISAMBIG_AI_ENABLED = 'true';
    process.env.NEED_INTAKE_RULES_ONLY = 'false';
    const { checkLocalModelHealth } = await import('@/lib/need-intake/local-chat-client');
    const health = await checkLocalModelHealth();
    if (health.ok) {
      const withAi = await runHybridIntakePipeline({ text: AMBIGUOUS_TEXT });
      console.log(
        'ok AI disambig path',
        'ai=',
        withAi.meta.aiInvoked,
        'slug=',
        withAi.fields.categorySlug?.value ?? withAi.fields.subcategorySlug?.value ?? 'unresolved'
      );
    } else {
      console.log('skip AI disambig (no local model)');
    }
  } else {
    console.log('skip AI disambig (NEED_INTAKE_LLM_ENABLED not set)');
  }

  console.log('smoke:disambig-intake OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
