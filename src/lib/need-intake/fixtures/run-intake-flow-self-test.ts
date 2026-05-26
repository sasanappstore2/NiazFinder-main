import type { NeedDraft } from '@/contracts/need-intake';
import { extractSlotsFromRules } from '@/lib/need-intake/extract-slots-rules';
import {
  buildReadiness,
  getNextStep,
  parseFromText,
} from '@/lib/need-intake/internal-orchestrator';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';

interface FlowFixture {
  id: string;
  text: string;
  minConfidence?: number;
}

const FLOW_FIXTURES: FlowFixture[] = [
  { id: 'real-estate', text: 'آپارتمان دو خواب رهن کامل غرب تهران تا ۲ میلیارد' },
  { id: 'vehicles', text: 'دنبال پژو ۲۰۶ سفید کارکرده در اصفهان' },
  { id: 'products', text: 'گوشی آیفون ۱۳ کارکرده میخرم تهران' },
  { id: 'services', text: 'تعمیرکار کولر گازی فوری غرب تهران' },
  { id: 'jobs', text: 'استخدام برنامه نویس فرانت‌اند ریموت' },
  { id: 'social', text: 'گم کردم کیف پول در مترو تجریش' },
  { id: 'pre-sale', text: 'پیش فروش آپارتمان در پروژه جدید کرج' },
];

function runFixture(f: FlowFixture): string | null {
  const parsed = parseFromText(f.text);
  if (f.minConfidence && parsed.confidence < f.minConfidence) {
    return `${f.id}: confidence ${parsed.confidence} below ${f.minConfidence}`;
  }
  if (!parsed.intentType || !parsed.categorySlug) {
    return `${f.id}: missing intentType or categorySlug`;
  }

  const answers = seedAnswersFromParsed(parsed);
  const slots = extractSlotsFromRules(parsed, answers);
  const mergedAnswers: NeedDraft['answers'] = {
    ...answers,
    ...(slots as NeedDraft['answers']),
  };

  const draft: NeedDraft = {
    parsedIntent: parsed,
    answers: mergedAnswers,
    turns: [],
  };

  const step = getNextStep(draft);
  if (!step.progress || step.progress.total < 1) {
    return `${f.id}: invalid question progress`;
  }

  const readiness = buildReadiness(draft);
  if (readiness.readinessScore <= 0) {
    return `${f.id}: readiness score not computed`;
  }

  const listing = composeListingFromDraft(draft);
  if (!listing.title || listing.title.length < 4) {
    return `${f.id}: empty listing title`;
  }
  if (!listing.description || listing.description.length < 10) {
    return `${f.id}: empty listing description`;
  }

  return null;
}

export function runIntakeFlowSelfTest(): { passed: number; failed: string[] } {
  const failed: string[] = [];
  for (const f of FLOW_FIXTURES) {
    const err = runFixture(f);
    if (err) failed.push(err);
  }
  return { passed: FLOW_FIXTURES.length - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-intake-flow-self-test'));

if (isDirectRun) {
  process.env.NEED_INTAKE_SKIP_PROCESSING_DELAY = 'true';
  const { passed, failed } = runIntakeFlowSelfTest();
  if (failed.length) {
    console.error('Intake flow fixtures FAILED:\n', failed.join('\n'));
    process.exit(1);
  }
  console.log(`Intake flow fixtures OK: ${passed}/${FLOW_FIXTURES.length}`);
}
