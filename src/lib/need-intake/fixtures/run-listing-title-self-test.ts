import type { IntakeEntities } from '@/intake/types';
import { composeListingFromDraft } from '@/lib/need-intake/listing-composer';
import { generateListingTitle } from '@/lib/need-intake/generate-listing-title';
import {
  entitiesToRecord,
  legacyNeedDraftFromParsed,
  legacyNeedDraftFromParsed as draftFromParsed,
  recomputeNeedDraft,
} from '@/intake/aggregate/needDraftAggregate';
import { parseFromText } from '@/lib/need-intake/internal-orchestrator.server';
import { seedAnswersFromParsed } from '@/lib/need-intake/seed-answers';
import { LISTING_TITLE_MAX_LENGTH } from '@/lib/need-intake/listing-title';
import { parseAreaFromText } from '@/lib/need-intake/vertical-classifier';
import {
  buildVehicleTitle,
  extractVehicleSubjectFromText,
  buildVerticalTitleFromDraft,
  buildHeuristicListingTitle,
  extractTitleSnippetFromSourceText,
} from '@/lib/need-intake/vertical-title';
import {
  isAcceptableListingTitle,
  normalizeListingTitle,
  parseTitleFromModelOutput,
  rejectListingTitleReason,
  truncateListingTitle,
  dedupeRedundantDealPhrases,
} from '@/lib/need-intake/listing-title-sanitize';
import type { ParsedIntent } from '@/contracts/need-intake';

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

function testVehicleExtraction(): string[] {
  const failed: string[] = [];
  const text = 'یک کارواش در حد نو میخوام';
  failed.push(
    assert(extractVehicleSubjectFromText(text) === 'کارواش', 'extract: کارواش') ?? ''
  );
  failed.push(
    assert(extractVehicleSubjectFromText('یک ۲۰۷ در حد نو میخوام') === 'پژو ۲۰۷', 'extract: 207') ?? ''
  );
  const deauvilleText =
    'من یک دوو سیلو میخوام موتوری سالم باشه در حد نو\nمحدوده: آپارتمان های مرتفع، مشهد';
  failed.push(
    assert(extractVehicleSubjectFromText(deauvilleText) === 'دوو سیلو', 'extract: دوو سیلو') ?? ''
  );
  failed.push(
    assert(parseAreaFromText(deauvilleText) === 'آپارتمان های مرتفع', 'area: محدوده colon') ?? ''
  );
  const title = buildVehicleTitle({ rawText: text, deal: 'buy', city: 'مشهد' });
  failed.push(assert(title.includes('کارواش'), 'vehicle title: includes کارواش') ?? '');
  failed.push(assert(title.includes('مشهد'), 'vehicle title: includes مشهد') ?? '');
  failed.push(
    assert(!title.match(/^خرید\s*[—\-]\s*مشهد$/u), 'vehicle title: not deal-city only') ?? ''
  );
  failed.push(
    assert(isAcceptableListingTitle(title, { sourceText: text }), 'vehicle title: acceptable') ?? ''
  );
  failed.push(
    assert(rejectListingTitleReason('خودرو ۲۰۷ نوحد مشهد تا ۱ میلیارد') === 'corrupted_fragment', 'reject: corrupted نوحد') ?? ''
  );
  failed.push(
    assert(rejectListingTitleReason('جستجوی خودرو') === 'generic_parser_title', 'reject: parser default title') ?? ''
  );
  return failed.filter(Boolean);
}

function testPeugeot207Draft(): string[] {
  const failed: string[] = [];
  const sourceText =
    'یک ۲۰۷ در حد نو میخوام مدلش هم فرقی نداره ۹۹ تا ۱۴۰۱ حدود ۱ میلیارد هم بودجه دارم';
  const details =
    'ماشین روغن سوزی نداشته باشه ٫ واشر نزده باشه حدالمکان هم تصادف و ضربه نداشته باشه';

  let draft = draftFromParsed(
    {
      intentType: 'vehicle_search',
      categorySlug: 'car-ride',
      city: 'مشهد',
      entities: { dealType: 'buy' },
      rawText: sourceText,
      confidence: 0.8,
    } as ParsedIntent,
    { dealType: 'buy', location: 'مشهد', budget: 1_000_000_000 },
    []
  );
  draft.sourceText = `${sourceText}\n${details}`;
  draft.entities = entitiesToRecord({
    categorySlug: 'car-ride',
    vertical: 'vehicles',
    city: 'مشهد',
    transactionType: 'BUY',
    budgetMax: 1_000_000_000,
  } as IntakeEntities);
  draft = recomputeNeedDraft(draft);

  const title = buildVerticalTitleFromDraft(draft);
  failed.push(assert(title.includes('پژو'), '207: includes پژو') ?? '');
  failed.push(assert(title.includes('۲۰۷'), '207: includes model') ?? '');
  failed.push(assert(title.includes('در حد نو'), '207: includes condition') ?? '');
  failed.push(assert(title.includes('مشهد'), '207: includes city') ?? '');
  failed.push(assert(title.includes('میلیارد'), '207: includes budget') ?? '');
  failed.push(
    assert(rejectListingTitleReason('خودرو ۲۰۷ نوحد مشهد تا ۱ میلیارد') === 'corrupted_fragment', '207: reject bad ai title') ?? ''
  );
  failed.push(
    assert(
      rejectListingTitleReason(title) !== 'generic_deal_city_only',
      '207: title not generic'
    ) ?? ''
  );
  return failed.filter(Boolean);
}

function testDaewooDraftTitle(): string[] {
  const failed: string[] = [];
  const sourceText =
    'من یک دوو سیلو میخوام موتوری سالم باشه در حد نو ٫ تعمیرات انجام شده باشه\nمیخوام کم کار باشه و تمیز ترجیحا بدون رنگ\nمحدوده: آپارتمان های مرتفع، مشهد';
  const parsed: ParsedIntent = {
    intentType: 'vehicle_search',
    categorySlug: 'car-classic',
    city: 'مشهد',
    entities: { dealType: 'buy', brand: 'دوو سیلو', area: 'آپارتمان های مرتفع' },
    rawText: sourceText,
    confidence: 0.85,
  };
  const answers = seedAnswersFromParsed(parsed);
  answers.location = 'آپارتمان های مرتفع، مشهد';
  let draft = draftFromParsed(parsed, answers, []);
  draft.sourceText = sourceText;
  draft.entities = entitiesToRecord({
    categorySlug: 'car-classic',
    vertical: 'vehicles',
    city: 'مشهد',
    neighborhood: 'آپارتمان های مرتفع',
    transactionType: 'BUY',
  } as IntakeEntities);
  draft = recomputeNeedDraft(draft);
  const title = buildVerticalTitleFromDraft(draft);
  failed.push(assert(title.includes('دوو سیلو'), 'daewoo: subject') ?? '');
  failed.push(assert(title.includes('در حد نو'), 'daewoo: condition') ?? '');
  failed.push(assert(title.includes('مشهد'), 'daewoo: city only') ?? '');
  failed.push(assert(!title.includes('آپارتمان'), 'daewoo: no neighborhood in title') ?? '');
  return failed.filter(Boolean);
}

function testCarwashDraftCompose(): string[] {
  const failed: string[] = [];
  const parsed: ParsedIntent = {
    intentType: 'vehicle_search',
    categorySlug: 'car-ride',
    subcategorySlug: undefined,
    city: 'مشهد',
    entities: { dealType: 'buy' },
    rawText: 'یک کارواش در حد نو میخوام\nددد',
    confidence: 0.8,
  };
  const answers = seedAnswersFromParsed(parsed);
  answers.dealType = 'buy';
  answers.location = 'مشهد';
  let draft = draftFromParsed(parsed, answers, []);
  draft.sourceText = 'یک کارواش در حد نو میخوام';
  draft.entities = entitiesToRecord({
    categorySlug: 'car-ride',
    vertical: 'vehicles',
    city: 'مشهد',
    transactionType: 'BUY',
  } as IntakeEntities);
  draft = recomputeNeedDraft(draft);

  const composed = composeListingFromDraft(draft);
  failed.push(assert(composed.title.includes('کارواش'), 'compose: کارواش in title') ?? '');
  failed.push(
    assert(rejectListingTitleReason(composed.title) !== 'generic_deal_city_only', 'compose: not generic') ??
      ''
  );

  const vertical = buildVerticalTitleFromDraft(draft);
  failed.push(assert(vertical.includes('کارواش'), 'vertical: کارواش') ?? '');

  return failed.filter(Boolean);
}

function testPropertyRentTitleDedup(): string[] {
  const failed: string[] = [];
  const sourceText = 'اجاره آپارتمان ۱۹۰ متری در صیاد برای اجاره';

  failed.push(
    assert(
      dedupeRedundantDealPhrases('اجاره آپارتمان ۱۹۰ متری در صیاد برای اجاره') ===
        'اجاره آپارتمان ۱۹۰ متری در صیاد',
      'dedupe: trailing برای اجاره'
    ) ?? ''
  );

  const snippet = extractTitleSnippetFromSourceText(sourceText, { dealFa: 'اجاره' });
  failed.push(assert(!snippet.includes('برای اجاره'), 'snippet: no duplicate deal suffix') ?? '');
  failed.push(assert(snippet.startsWith('اجاره'), 'snippet: keeps deal prefix') ?? '');

  const parsed = parseFromText(sourceText);
  const answers = seedAnswersFromParsed(parsed);
  let draft = draftFromParsed(parsed, answers, []);
  draft.sourceText = sourceText;
  draft = recomputeNeedDraft(draft);
  const composed = composeListingFromDraft(draft);
  failed.push(assert(composed.title.includes('190') || composed.title.includes('۱۹۰'), 'compose: includes size') ?? '');
  failed.push(assert(composed.title.includes('صیاد'), 'compose: includes location fragment') ?? '');
  failed.push(assert(!composed.title.includes('برای اجاره'), 'compose: no duplicate deal') ?? '');

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
    const draft = legacyNeedDraftFromParsed(parsed, answers);
    const composed = composeListingFromDraft(draft);
    const result = await generateListingTitle(draft, composed.title);

    failed.push(assert(result.source === 'template', 'fallback: source template') ?? '');
    failed.push(assert(result.title.length <= LISTING_TITLE_MAX_LENGTH, 'fallback: max length') ?? '');
    failed.push(assert(result.title.length >= 8, 'fallback: min length') ?? '');

    const carParsed: ParsedIntent = {
      intentType: 'vehicle_search',
      categorySlug: 'car-ride',
      city: 'مشهد',
      entities: { dealType: 'buy' },
      rawText: 'کارواش در حد نو',
      confidence: 0.8,
    };
    let carDraft = draftFromParsed(carParsed, { dealType: 'buy', location: 'مشهد' }, []);
    carDraft.sourceText = 'یک کارواش در حد نو میخوام';
    carDraft.entities = entitiesToRecord({
      categorySlug: 'car-ride',
      vertical: 'vehicles',
      city: 'مشهد',
      transactionType: 'BUY',
    } as IntakeEntities);
    carDraft = recomputeNeedDraft(carDraft);
    const heuristic = buildHeuristicListingTitle(carDraft);
    failed.push(assert(heuristic.includes('کارواش'), 'heuristic: carwash') ?? '');
    const genCar = await generateListingTitle(carDraft, 'خرید — مشهد');
    failed.push(
      assert(
        rejectListingTitleReason(genCar.title) !== 'generic_deal_city_only',
        'generate: carwash not generic'
      ) ?? ''
    );
  } finally {
    if (prev === undefined) delete process.env.NEED_INTAKE_TITLE_AI_ENABLED;
    else process.env.NEED_INTAKE_TITLE_AI_ENABLED = prev;
  }

  return failed.filter(Boolean);
}

export async function runListingTitleSelfTest(): Promise<{ passed: number; failed: string[] }> {
  const failed = [
    ...testSanitizer(),
    ...testVehicleExtraction(),
    ...testPeugeot207Draft(),
    ...testDaewooDraftTitle(),
    ...testCarwashDraftCompose(),
    ...testPropertyRentTitleDedup(),
    ...(await testTemplateFallback()),
  ];
  const total = 6 + 2 + 10 + 8 + 4 + 4 + 5 + 3 + 2;
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
