/**
 * Sync golden metadata from successful replay (category, city, dealType).
 * Run: npx tsx scripts/v2-conv-qa/sync-golden-metadata.ts [--write]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { orchestrateIntakeV2Turn } from '@/lib/intake-v2/orchestrate-turn';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';
import type { GoldenConversation } from '@/lib/intake-v2/sim/conversation-transcript';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

const GOLDEN_DIR = join(process.cwd(), 'src/lib/intake-v2/fixtures/v2-conv-golden');
const writeMode = process.argv.includes('--write');

async function replayToDraft(golden: GoldenConversation) {
  let draft = legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;

  for (const msg of golden.userMessages) {
    const r = await orchestrateIntakeV2Turn(draft, turns, msg, {
      confirmedFields: confirmed,
      lastAskedField: lastAsked,
    });
    draft = r.needDraft;
    turns = draft.turns ?? [];
    confirmed = r.confirmedFields ?? [];
    lastAsked = r.activeFieldKey ?? null;
  }
  return draft;
}

async function main(): Promise<void> {
  const files = readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json'));
  let scanned = 0;
  let updated = 0;

  for (const file of files) {
    const path = join(GOLDEN_DIR, file);
    const golden = JSON.parse(readFileSync(path, 'utf8')) as GoldenConversation;
    const draft = await replayToDraft(golden);
    const publish = validateNeedDraftForPublish(draft);
    if (!publish.success) continue;
    scanned++;

    const next: GoldenConversation = {
      ...golden,
      expectedCategorySlug: draft.parsedIntent.categorySlug || golden.expectedCategorySlug,
      expectedCity:
        draft.parsedIntent.city ??
        String(draft.answers.location ?? '').split('،').pop()?.trim() ??
        golden.expectedCity,
      expectedDealType: String(draft.answers.dealType ?? golden.expectedDealType),
    };

    const changed =
      next.expectedCategorySlug !== golden.expectedCategorySlug ||
      next.expectedCity !== golden.expectedCity ||
      next.expectedDealType !== golden.expectedDealType;

    if (changed && writeMode) {
      writeFileSync(path, JSON.stringify(next, null, 2), 'utf8');
      updated++;
    } else if (changed) {
      updated++;
    }
  }

  console.log(
    `Metadata sync: ${scanned} publish-valid / ${files.length} total, ${updated} ${writeMode ? 'written' : 'would update'}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
