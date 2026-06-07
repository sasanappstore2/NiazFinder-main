/**
 * Smoke test V2 intake orchestrator (mirrors scenario self-test, no HTTP server).
 * Run: npm run test:v2-api-smoke
 */
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { orchestrateIntakeV2Turn } from '@/lib/intake-v2/orchestrate-turn';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

async function main(): Promise<void> {
  let draft = legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  const r1 = await orchestrateIntakeV2Turn(draft, turns, 'می‌خواهم ملک اجاره کنم', {
    confirmedFields: confirmed,
  });
  if (r1.offTopic) throw new Error('smoke: rent intent marked off-topic');
  draft = r1.needDraft;
  turns = draft.turns ?? [];
  confirmed = r1.confirmedFields ?? [];

  const r2 = await orchestrateIntakeV2Turn(
    draft,
    turns,
    'من یک انباری در فرامرز عباسی میخوام',
    { confirmedFields: confirmed, lastAskedField: r1.activeFieldKey }
  );
  if (r2.offTopic) throw new Error('smoke: storage intent marked off-topic');
  if (String(r2.needDraft.answers.location ?? '').includes('عباسی، تهران')) {
    throw new Error('smoke: partial location عباسی تهران');
  }

  console.log('V2 API smoke OK');
}

main().catch((e) => {
  console.error('V2 API smoke FAILED:', e instanceof Error ? e.message : e);
  process.exit(1);
});
