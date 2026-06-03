import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { generateListingTitle } from '@/lib/need-intake/generate-listing-title';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import {
  isAcceptableListingTitle,
  normalizeListingTitle,
  parseTitleFromModelOutput,
  rejectListingTitleReason,
  truncateListingTitle,
} from '@/lib/need-intake/listing-title-sanitize';

function assert(condition: boolean, message: string): string | null {
  return condition ? null : message;
}

function testSanitizer(): string[] {
  const failed: string[] = [];

  failed.push(
    assert(
      truncateListingTitle('a'.repeat(100)).length <= LISTING_TITLE_MAX_LENGTH,
      'truncate: over max'
    ) ?? ''
  );
  failed.push(
    assert(
      normalizeListingTitle('  «خرید آپارتمان — مشهد»  ') === 'خرید آپارتمان — مشهد',
      'normalize: strip quotes'
    ) ?? ''
  );
  failed.push(
    assert(
      parseTitleFromModelOutput('{"title":"فروش ویلا در شمال"}') === 'فروش ویلا در شمال',
      'parse: json title'
    ) ?? ''
  );
  failed.push(
    assert(rejectListingTitleReason('خرید — مشهد') === 'generic_deal_city_only', 'reject: deal city only') ?? ''
  );
  failed.push(
    assert(rejectListingTitleReason('ثبت نیاز') === 'generic', 'reject: generic') ?? ''
  );
  failed.push(
    assert(
      isAcceptableListingTitle('خرید آپارتمان ۲ خواب — فرامرز عباسی، مشهد'),
      'accept: specific title'
    ) ?? ''
  );

  return failed.filter(Boolean);
}

async function testTemplateFallback(): Promise<string[]> {
  const failed: string[] = [];
  const prev = process.env.NEED_INTAKE_TITLE_AI_ENABLED;
  process.env.NEED_INTAKE_TITLE_AI_ENABLED = 'false';

  try {
    const text = 'آپارتمان دو خواب برای خرید در فرامرز عباسی مشهد بودجه ۱۰ میلیارد';
    const parsed = parseFromText(text);
    const answers = seedAnswersFromParsed(parsed);
    const draft = legacyNeedDraftFromParsed(parsed, answers, []);
    const composed = composeListingFromDraft(draft);
    const result = await generateListingTitle(draft, composed.title);

    failed.push(assert(result.source === 'template', 'fallback: source template') ?? '');
    failed.push(assert(result.title.length <= LISTING_TITLE_MAX_LENGTH, 'fallback: max length') ?? '');
    failed.push(assert(result.title.length >= 8, 'fallback: min length') ?? '');
  } finally {
    if (prev === undefined) delete process.env.NEED_INTAKE_TITLE_AI_ENABLED;
    else process.env.NEED_INTAKE_TITLE_AI_ENABLED = prev;
  }

  return failed.filter(Boolean);
}

export async function runListingTitleSelfTest(): Promise<{ passed: number; failed: string[] }> {
  const failed = [...testSanitizer(), ...(await testTemplateFallback())];
  const total = 6 + 3;
  return { passed: total - failed.length, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-listing-title-self-test'));

if (isDirectRun) {
  runListingTitleSelfTest().then(({ passed, failed }) => {
    if (failed.length) {
      console.error('listing-title self-test FAILED');
      for (const f of failed) console.error(' -', f);
      process.exit(1);
    }
    console.log(`listing-title self-test OK (${passed} checks)`);
  });
}
