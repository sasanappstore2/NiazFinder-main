import type { NeedDraft } from '@/contracts/need-intake';
import { getNextQuestion } from '@/lib/need-intake/question-engine';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';

const USER_TEXT = 'میخوام یک خونه آپارتمانی بخرم تو فرامرز عباسی ۱۵۰ متر حداکثر';

const SKIP_FIRST_QUESTION_KEYS = new Set([
  'dealType',
  'propertyKind',
  'location',
  'areaMin',
  'areaMax',
  'rooms',
]);

export function runPrefillFlowSelfTest(): string | null {
  const parsed = parseFromText(USER_TEXT);

  if (parsed.entities.dealType !== 'buy') {
    return `dealType: ${parsed.entities.dealType}`;
  }
  if (parsed.entities.propertyKind !== 'apartment') {
    return `propertyKind: ${parsed.entities.propertyKind}`;
  }
  if (parsed.entities.areaMax !== '150') {
    return `areaMax: ${parsed.entities.areaMax}`;
  }
  if (parsed.city !== 'مشهد') {
    return `city: ${parsed.city}`;
  }
  if (!parsed.neighborhoodSlug?.includes('فرامرز')) {
    return `neighborhoodSlug: ${parsed.neighborhoodSlug}`;
  }
  if (!parsed.title?.includes('خرید') || parsed.title?.includes(' — ')) {
    return `title not natural: ${parsed.title}`;
  }

  const answers = seedAnswersFromParsed(parsed);
  const step = getNextQuestion(parsed.intentType, parsed, answers);
  const firstKey = step.field?.key;
  if (!firstKey || SKIP_FIRST_QUESTION_KEYS.has(firstKey)) {
    return `first question should not be ${firstKey}, got: ${step.question}`;
  }

  const draft: NeedDraft = { parsedIntent: parsed, answers, turns: [] };
  if (draft.answers.location !== 'شهید فرامرز عباسی، مشهد' && !String(draft.answers.location).includes('مشهد')) {
    return `location seed: ${draft.answers.location}`;
  }

  return null;
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-prefill-flow-self-test'));

if (isDirectRun) {
  const err = runPrefillFlowSelfTest();
  if (err) {
    console.error('prefill flow FAILED:', err);
    process.exit(1);
  }
  console.log('prefill flow OK');
}
