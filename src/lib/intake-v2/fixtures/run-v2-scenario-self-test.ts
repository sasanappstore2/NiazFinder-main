/**
 * V2 intake scenario self-test — alignment, transcripts, off-topic, /post regression.
 * Run: NEED_INTAKE_LLM_ENABLED=false npm run test:v2-scenarios
 */
import type { ConversationTurn, NeedDraft } from '@/contracts/need-intake';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { buildReadiness } from '@/lib/need-intake/internal-orchestrator';
import { orchestrateIntakeV2Turn } from '@/lib/intake-v2/orchestrate-turn';
import { buildV2Readiness } from '@/lib/intake-v2/v2-readiness';
import { validateNeedDraftForPublish } from '@/intake/validation/publishValidator';
import { mapDealTypeToTransaction } from '@/lib/need-intake/deal-type-transaction';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';
import {
  depositPresetChips,
  areaPresetChips,
  monthlyRentPresetChips,
} from '@/lib/intake-v2/v2-chip-presets';

import { runV2ScenarioMatrix } from '@/lib/intake-v2/fixtures/v2-scenario-matrix';

process.env.NEED_INTAKE_LLM_ENABLED = 'false';

function freshDraft(): NeedDraft {
  return legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
}

async function turn(
  draft: NeedDraft,
  turns: ConversationTurn[],
  userMessage: string,
  opts?: {
    confirmedFields?: string[];
    chipFieldKey?: string;
    chipValue?: string;
    lastAskedField?: string | null;
    preferredCityId?: string | null;
    preferredCityName?: string | null;
  }
) {
  return orchestrateIntakeV2Turn(draft, turns, userMessage, opts);
}

function hasPreviewChip(chips: { value?: string; label?: string }[] | undefined): boolean {
  return (
    chips?.some(
      (c) =>
        /preview|پیش‌نمایش|پیش نمایش/i.test(String(c.value ?? c.label ?? ''))
    ) ?? false
  );
}

function assert(name: string, ok: boolean, detail?: string): string | null {
  if (ok) return null;
  return `${name}${detail ? `: ${detail}` : ''}`;
}

function assertChipAlignment(
  prefix: string,
  activeFieldKey: string | null | undefined,
  chips: { value?: string; label?: string }[] | undefined
): string | null {
  if (!activeFieldKey || !chips?.length) return null;
  if (activeFieldKey === 'deposit') {
    const depositLabels = new Set(depositPresetChips().map((c) => c.label));
    const ok = chips.some((c) => Boolean(c.label && depositLabels.has(c.label)));
    return assert(`${prefix}-chips-deposit`, ok, `active=${activeFieldKey} chips=${chips.map((c) => c.label).join(',')}`);
  }
  if (activeFieldKey === 'areaMin') {
    const areaLabels = new Set(areaPresetChips().map((c) => c.label));
    const ok = chips.some((c) => Boolean(c.label && areaLabels.has(c.label)));
    return assert(`${prefix}-chips-area`, ok, `active=${activeFieldKey}`);
  }
  if (activeFieldKey === 'monthlyRent') {
    const rentLabels = new Set(monthlyRentPresetChips().map((c) => c.label));
    const ok = chips.some((c) => Boolean(c.label && rentLabels.has(c.label)));
    return assert(`${prefix}-chips-rent`, ok, `active=${activeFieldKey}`);
  }
  return null;
}

async function testUserTranscript(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;

  let r = await turn(draft, turns, 'می‌خواهم ملک اجاره کنم', { lastAskedField: lastAsked });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  let err =
    assert('tx-1-not-preview', !r.readyToPreview) ??
    assertChipAlignment('tx-1', r.activeFieldKey, r.suggestedChips);
  if (err) return err;

  r = await turn(
    draft,
    turns,
    'من یک واحد طبقه همکف در سعادت‌آباد تهران برای مزون لازم دارم',
    { confirmedFields: confirmed, lastAskedField: lastAsked }
  );
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  err =
    assert('tx-2-shop', draft.parsedIntent.categorySlug === 'shop-rent') ??
    assert('tx-2-not-preview', !r.readyToPreview) ??
    assert('tx-2-asks-slot', Boolean(r.activeFieldKey)) ??
    assertChipAlignment('tx-2', r.activeFieldKey, r.suggestedChips);
  if (err) return err;

  const depositField = r.activeFieldKey === 'deposit' ? 'deposit' : undefined;
  r = await turn(draft, turns, 'ودیعه ۱۰۰ تا ۳۰۰ میلیون', {
    confirmedFields: confirmed,
    ...(depositField
      ? { chipFieldKey: depositField, chipValue: 'ودیعه ۱۰۰ تا ۳۰۰ میلیون' }
      : {}),
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  err =
    assert('tx-3-deposit-confirmed', confirmed.includes('deposit')) ??
    assert('tx-3-not-preview', !r.readyToPreview) ??
    assert('tx-3-next-not-deposit', r.activeFieldKey !== 'deposit') ??
    assertChipAlignment('tx-3', r.activeFieldKey, r.suggestedChips);
  if (err) return err;

  const areaField = r.activeFieldKey === 'areaMin' ? 'areaMin' : undefined;
  r = await turn(draft, turns, '۵۰ متر', {
    confirmedFields: confirmed,
    ...(areaField ? { chipFieldKey: areaField, chipValue: '۵۰ متر' } : {}),
    lastAskedField: lastAsked,
  });

  return (
    assert('tx-4-ready', r.readyToPreview === true) ??
    assert('tx-4-preview-chip', hasPreviewChip(r.suggestedChips)) ??
    assert('tx-4-area-in-answers', r.needDraft.answers.areaMin != null)
  );
}

async function testMzoonMashhad(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  const r1 = await turn(
    draft,
    turns,
    'من یک واحد همکف در فردوسی مشهد یا خیابون ریس برای مزون لازم دارم'
  );
  draft = r1.needDraft;
  turns = draft.turns ?? [];
  confirmed = r1.confirmedFields ?? [];

  const slug = draft.parsedIntent.categorySlug;
  let err =
    assert('mzoon-1-category', slug === 'shop-rent', `got ${slug}`) ??
    assert('mzoon-1-not-ready', r1.readyToPreview === false) ??
    assert('mzoon-1-no-preview-chip', !hasPreviewChip(r1.suggestedChips)) ??
    assertChipAlignment('mzoon-1', r1.activeFieldKey, r1.suggestedChips);
  if (err) return err;

  const r2 = await turn(draft, turns, 'ودیعه ۱۰۰ تا ۳۰۰ میلیون', {
    confirmedFields: confirmed,
    ...(r1.activeFieldKey === 'deposit'
      ? { chipFieldKey: 'deposit', chipValue: 'ودیعه ۱۰۰ تا ۳۰۰ میلیون' }
      : {}),
    lastAskedField: r1.activeFieldKey,
  });
  draft = r2.needDraft;
  turns = draft.turns ?? [];
  confirmed = r2.confirmedFields ?? [];

  err =
    assert('mzoon-2-not-ready', r2.readyToPreview === false) ??
    assert('mzoon-2-deposit-confirmed', confirmed.includes('deposit')) ??
    assertChipAlignment('mzoon-2', r2.activeFieldKey, r2.suggestedChips);
  if (err) return err;

  const r3 = await turn(draft, turns, '۵۰ متر', {
    confirmedFields: confirmed,
    ...(r2.activeFieldKey === 'areaMin'
      ? { chipFieldKey: 'areaMin', chipValue: '۵۰ متر' }
      : {}),
    lastAskedField: r2.activeFieldKey,
  });

  return (
    assert('mzoon-3-ready', r3.readyToPreview === true) ??
    assert('mzoon-3-preview-chip', hasPreviewChip(r3.suggestedChips))
  );
}

async function testApartmentRent(): Promise<string | null> {
  const draft = freshDraft();
  const r = await turn(
    draft,
    draft.turns ?? [],
    'آپارتمان ۹۰ متری سعادت‌آباد اجاره'
  );

  const slug = r.needDraft.parsedIntent.categorySlug;
  return (
    assert('apt-category', /apartment|residential/.test(slug), slug) ??
    assert('apt-not-ready', r.readyToPreview === false) ??
    assert('apt-asks-field', Boolean(r.activeFieldKey)) ??
    assertChipAlignment('apt', r.activeFieldKey, r.suggestedChips) ??
    assert('apt-no-preview', !hasPreviewChip(r.suggestedChips))
  );
}

async function testLandSale(): Promise<string | null> {
  const draft = freshDraft();
  const r = await turn(draft, draft.turns ?? [], 'زمین ۵۰۰ متری در مشهد برای خرید');

  return (
    assert('land-category', /land/.test(r.needDraft.parsedIntent.categorySlug)) ??
    assert('land-not-ready', !r.readyToPreview) ??
    assert('land-no-rooms-chip', !r.suggestedChips?.some((c) => /خواب/.test(c.label)))
  );
}

async function testOffTopicVehicle(): Promise<string | null> {
  const fresh = await turn(freshDraft(), freshDraft().turns ?? [], 'ماشین پژو می‌خوام');
  const errFresh =
    assert('offtopic-fresh', fresh.offTopic === true) ??
    assert('offtopic-fresh-msg', /فقط نیازهای ملکی/.test(fresh.assistantMessage));
  if (errFresh) return errFresh;

  let draft = freshDraft();
  let turns = draft.turns ?? [];
  const re = await turn(
    draft,
    turns,
    'من یک واحد همکف در فردوسی مشهد برای مزون لازم دارم'
  );
  draft = re.needDraft;
  turns = draft.turns ?? [];

  const vehicle = await turn(draft, turns, 'ماشین پژو می‌خوام', {
    confirmedFields: re.confirmedFields,
  });
  return (
    assert('offtopic-after-re', vehicle.offTopic === true) ??
    assert('offtopic-after-re-msg', /فقط نیازهای ملکی/.test(vehicle.assistantMessage))
  );
}

async function testShopMashhadIntelligence(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;

  let r = await turn(
    draft,
    turns,
    'مغازه در فرامرز عباسی مشهد می‌خوام',
    { lastAskedField: lastAsked }
  );
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  let err =
    assert('shop-mhd-1-category', draft.parsedIntent.categorySlug === 'shop-rent') ??
    assert('shop-mhd-1-not-ready', !r.readyToPreview);
  if (err) return err;

  r = await turn(draft, turns, 'رهن و اجاره', {
    confirmedFields: confirmed,
    chipFieldKey: r.activeFieldKey === 'dealType' ? 'dealType' : undefined,
    chipValue: r.activeFieldKey === 'dealType' ? 'rent_rahn_ejare' : undefined,
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  err =
    assert('shop-mhd-2-deal-ack', /رهن و اجاره/.test(r.assistantMessage)) ??
    assert('shop-mhd-2-not-ready', !r.readyToPreview);
  if (err) return err;

  r = await turn(draft, turns, 'حدوداً ۳۵ متر', {
    confirmedFields: confirmed,
    ...(r.activeFieldKey === 'areaMin'
      ? { chipFieldKey: 'areaMin', chipValue: 'حدوداً ۳۵ متر' }
      : {}),
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  err =
    assert('shop-mhd-3-area', draft.answers.areaMin === 35) ??
    assert(
      'shop-mhd-3-approx',
      draft.intelligenceProfile?.area?.approximate === true
    ) ??
    assert('shop-mhd-3-not-ready-no-rent', !r.readyToPreview);
  if (err) return err;

  r = await turn(draft, turns, 'پاساژ آناهیتا هم باشه', {
    confirmedFields: confirmed,
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;

  err =
    assert(
      'shop-mhd-4-pasaj',
      draft.intelligenceProfile?.locationPreferences?.some((p) => /آناهیتا/.test(p)) ??
        false
    ) ??
    assert(
      'shop-mhd-4-entities-category',
      Boolean(draft.entities.categorySlug)
    ) ??
    assert('shop-mhd-4-entities-city', Boolean(draft.entities.city));
  if (err) return err;

  r = await turn(draft, draft.turns ?? [], 'ودیعه ۲۰۰ میلیون', {
    confirmedFields: confirmed,
    ...(r.activeFieldKey === 'deposit'
      ? { chipFieldKey: 'deposit', chipValue: 'ودیعه ۲۰۰ میلیون' }
      : {}),
    lastAskedField: r.activeFieldKey,
  });
  draft = r.needDraft;
  confirmed = r.confirmedFields ?? [];

  err =
    assert('shop-mhd-5-still-not-ready', !r.readyToPreview) ??
    assert('shop-mhd-5-deposit', confirmed.includes('deposit'));
  if (err) return err;

  r = await turn(draft, draft.turns ?? [], 'اجاره ۱۵ میلیون', {
    confirmedFields: confirmed,
    ...(r.activeFieldKey === 'monthlyRent'
      ? { chipFieldKey: 'monthlyRent', chipValue: 'اجاره ۱۵ میلیون' }
      : {}),
    lastAskedField: r.activeFieldKey,
  });
  draft = r.needDraft;

  const publish = validateNeedDraftForPublish(draft);
  const tx = mapDealTypeToTransaction(String(draft.answers.dealType));

  return (
    assert('shop-mhd-6-ready', r.readyToPreview === true) ??
    assert('shop-mhd-6-publish', publish.success === true) ??
    assert('shop-mhd-6-tx', tx === 'DEPOSIT_AND_RENT') ??
    assert('shop-mhd-6-preview-chip', hasPreviewChip(r.suggestedChips))
  );
}

async function testLawOfficeKohsangiCorrection(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;

  let r = await turn(draft, turns, 'من یک آپارتمان ۱۲۰ متری برای دفتر وکالت میخوام', {
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  let err =
    assert('law-1-apartment', draft.answers.propertyKind === 'apartment') ??
    assert('law-1-no-location', !draft.answers.location) ??
    assert('law-1-no-false-deposit', !confirmed.includes('deposit')) ??
    assert('law-1-asks-deal', r.activeFieldKey === 'dealType');
  if (err) return err;

  r = await turn(draft, turns, 'رهن و اجاره', {
    confirmedFields: confirmed,
    lastAskedField: lastAsked,
  });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  err =
    assert('law-2-deal', draft.answers.dealType === 'rent_rahn_ejare') ??
    assert('law-2-asks-location', r.activeFieldKey === 'location') ??
    assert('law-2-no-natanz', !String(draft.answers.location ?? '').includes('نطنز'));
  if (err) return err;

  r = await turn(
    draft,
    turns,
    'در ری تهران نمیخوام در کوهسنگی مشهد مد نظرم هست',
    { confirmedFields: confirmed, lastAskedField: lastAsked }
  );

  return (
    assert('law-3-mashhad', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert(
      'law-3-kohsangi',
      /کوه\s*سنگی/i.test(String(r.needDraft.answers.location ?? ''))
    ) ??
    assert('law-3-not-tehran', !/ری،\s*تهران/.test(String(r.needDraft.answers.location ?? ''))) ??
    assert(
      'law-3-asks-money-or-rooms',
      r.activeFieldKey === 'deposit' || r.activeFieldKey === 'rooms'
    )
  );
}

async function testStorageFaramarzAbbasi(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;

  let r = await turn(draft, turns, 'می‌خواهم ملک اجاره کنم', { lastAskedField: lastAsked });
  draft = r.needDraft;
  turns = draft.turns ?? [];
  confirmed = r.confirmedFields ?? [];
  lastAsked = r.activeFieldKey ?? null;

  r = await turn(draft, turns, 'من یک انباری در فرامرز عباسی میخوام', {
    confirmedFields: confirmed,
    lastAskedField: lastAsked,
  });

  const loc = String(r.needDraft.answers.location ?? '');
  const status = r.needDraft.parsedIntent.locationResolutionStatus;

  return (
    assert('storage-not-off-topic', !r.offTopic) ??
    assert('storage-kind', r.needDraft.answers.propertyKind === 'apartment') ??
    assert('storage-no-tehran-abbasi', !/عباسی،\s*تهران/.test(loc)) ??
    assert(
      'storage-city-ambiguous-or-ask',
      status === 'city_ambiguous' ||
        r.activeFieldKey === 'location' ||
        r.needDraft.parsedIntent.city === 'مشهد'
    ) ??
    assert('storage-no-partial-confirm', !confirmed.includes('location') || loc.includes('فرامرز'))
  );
}

async function testImamKhomeiniGenericStreet(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  let r = await turn(draft, turns, 'آپارتمان در خیابان امام خمینی میخوام', {
    confirmedFields: confirmed,
  });

  return (
    assert('imam-not-off-topic', !r.offTopic) ??
    assert(
      'imam-no-auto-resolve',
      !r.confirmedFields?.includes('location') ||
        r.needDraft.parsedIntent.rejectLocationAutoConfirm === true
    ) ??
    assert(
      'imam-asks-city-or-unresolved',
      r.activeFieldKey === 'location' ||
        r.needDraft.parsedIntent.locationResolutionStatus === 'city_ambiguous' ||
        r.needDraft.parsedIntent.locationResolutionStatus === 'unresolved'
    )
  );
}

async function testKohsangiCompactMatch(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  const r = await turn(draft, turns, 'آپارتمان در کوهسنگی مشهد اجاره', {
    confirmedFields: confirmed,
  });

  const loc = String(r.needDraft.answers.location ?? '');
  return (
    assert('kohsangi-mashhad', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert(
      'kohsangi-hood',
      /کوه\s*سنگی/i.test(loc) ||
        r.needDraft.parsedIntent.neighborhoodSlug === 'کوه-سنگی' ||
        /کوه\s*سنگی/i.test(String(r.needDraft.parsedIntent.entities?.area ?? ''))
    )
  );
}

async function testAnahitaOfficeFaramarz(): Promise<string | null> {
  const draft = freshDraft();
  const r = await turn(
    draft,
    draft.turns ?? [],
    'من یک واحد اداری در پاساژ آناهیتا در فرامرز عباسی میخوام'
  );

  const loc = String(r.needDraft.answers.location ?? '');
  const area = String(r.needDraft.parsedIntent.entities?.area ?? '');
  const hoodSlug = String(r.needDraft.parsedIntent.neighborhoodSlug ?? '');

  return (
    assert('anahita-office', r.needDraft.answers.propertyKind === 'office') ??
    assert('anahita-category', r.needDraft.parsedIntent.categorySlug === 'office-rent') ??
    assert('anahita-mashhad', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert('anahita-not-tehran', !/تهران/.test(loc)) ??
    assert(
      'anahita-hood',
      /فرامرز/.test(loc) || /فرامرز/.test(hoodSlug) || /فرامرز/.test(area)
    ) ??
    assert('anahita-preserves-pasaj', /آناهیتا|پاساژ/.test(area)) ??
    assert('anahita-not-apartment-ack', !/^آپارتمان/.test(r.assistantMessage))
  );
}

async function testFaramarzStudentApartment(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  let r = await turn(
    draft,
    turns,
    'اپارتمان تک خواب در فرامرز برای دانشجو میخوام',
    { confirmedFields: confirmed }
  );
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  let err =
    assert('faramarz-t1-no-deal-q', r.activeFieldKey !== 'dealType') ??
    assert('faramarz-t1-rooms', draft.answers.rooms === 1) ??
    assert('faramarz-t1-rooms-confirmed', confirmed.includes('rooms')) ??
    assert('faramarz-t1-mashhad', draft.parsedIntent.city === 'مشهد') ??
    assert(
      'faramarz-t1-hood',
      /فرامرز/i.test(String(draft.answers.location ?? ''))
    );
  if (err) return err;

  r = await turn(draft, turns, 'رهن و اجاره', { confirmedFields: confirmed });
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  err =
    assert('faramarz-t2-deal', draft.answers.dealType === 'rent_rahn_ejare') ??
    assert('faramarz-t2-ask-deposit', r.activeFieldKey === 'deposit');
  if (err) return err;

  r = await turn(draft, turns, '80m', {
    confirmedFields: confirmed,
    lastAskedField: r.activeFieldKey,
  });
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  err =
    assert('faramarz-t3-area', draft.answers.areaMin === 80) ??
    assert('faramarz-t3-no-rent-80', draft.answers.monthlyRent !== 80) ??
    assert('faramarz-t3-still-deposit', r.activeFieldKey === 'deposit');
  if (err) return err;

  r = await turn(draft, turns, 'میخوام ۱۰ میلیون اجاره بدم', {
    confirmedFields: confirmed,
    lastAskedField: r.activeFieldKey,
  });
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  err =
    assert('faramarz-t4-rent', draft.answers.monthlyRent === 10_000_000) ??
    assert('faramarz-t4-no-rooms-q', r.activeFieldKey !== 'rooms') ??
    assert('faramarz-t4-not-preview', !r.readyToPreview);
  if (err) return err;

  r = await turn(draft, turns, '۲ خواب', {
    confirmedFields: confirmed,
    lastAskedField: r.activeFieldKey,
  });

  return (
    assert('faramarz-t5-rooms-unchanged', r.needDraft.answers.rooms === 1) ??
    assert('faramarz-t5-not-preview', !r.readyToPreview)
  );
}

async function testAtlasSaidiOffice(): Promise<string | null> {
  let draft = freshDraft();
  const turns = draft.turns ?? [];

  const r = await turn(
    draft,
    turns,
    'من یک دفتر کار در مجتمع اطلس در سیدی لازم دارم'
  );

  const loc = String(r.needDraft.answers.location ?? '');
  const area = String(r.needDraft.parsedIntent.entities?.area ?? '');

  return (
    assert('atlas-not-off-topic', !r.offTopic) ??
    assert('atlas-office', r.needDraft.answers.propertyKind === 'office') ??
    assert('atlas-mashhad', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert('atlas-not-tehran-erm', !/ارم،\s*تهران/.test(loc)) ??
    assert('atlas-saidi-hood', /سیدی/.test(loc)) ??
    assert('atlas-preserves-complex', /اطلس|مجتمع/.test(area) || /سیدی/.test(area)) ??
    assert('atlas-no-lazem-in-area', !/لازم\s*دارم/.test(area))
  );
}

async function testLandSajjadMashhad(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  let r = await turn(
    draft,
    turns,
    'من یک زمین ۲۵۰ متری با پروانه ساخت لازم دارم در منطقه سجاد',
    { confirmedFields: confirmed, preferredCityId: 'mashhad', preferredCityName: 'مشهد' }
  );
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  let err =
    assert('sajjad-land-sale', draft.parsedIntent.categorySlug === 'land-sale') ??
    assert('sajjad-buy', draft.answers.dealType === 'buy') ??
    assert('sajjad-area', draft.answers.areaMin === 250) ??
    assert('sajjad-not-rent-ack', !/اجاره\s*ماهانه/.test(r.assistantMessage));
  if (err) return err;

  if (r.activeFieldKey === 'location') {
    r = await turn(draft, turns, 'مشهد', {
      confirmedFields: confirmed,
      lastAskedField: r.activeFieldKey,
      preferredCityId: 'mashhad',
      preferredCityName: 'مشهد',
    });
    confirmed = r.confirmedFields ?? [];
    draft = r.needDraft;
    turns = draft.turns ?? [];
  }

  return (
    assert('sajjad-mashhad-city', draft.parsedIntent.city === 'مشهد') ??
    assert('sajjad-hood', draft.parsedIntent.neighborhoodSlug === 'سجاد-شهر') ??
    assert('sajjad-location', /سجاد/.test(String(draft.answers.location ?? ''))) ??
    assert('sajjad-no-deposit', r.activeFieldKey !== 'deposit') ??
    assert('sajjad-still-buy', draft.answers.dealType === 'buy')
  );
}

async function testNesteranMalekAbadMashhad(): Promise<string | null> {
  const draft = freshDraft();
  const msg = 'اپارتمان ۱۹۶ متری در خیابان نسترن ملک آباد';
  const r = await turn(draft, draft.turns ?? [], msg, {
    preferredCityId: 'mashhad',
    preferredCityName: 'مشهد',
  });

  const slug = r.needDraft.parsedIntent.neighborhoodSlug ?? '';
  const area = String(r.needDraft.parsedIntent.entities?.area ?? '');
  return (
    assert('nesteran-mashhad', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert('nesteran-malek-abad', /ملک[\s\u200c-]*آباد/u.test(slug) || /ملک[\s\u200c-]*آباد/u.test(area)) ??
    assert('nesteran-not-rent', r.needDraft.answers.dealType !== 'rent_rahn_full') ??
    assert('nesteran-area-slot', r.needDraft.answers.areaMin === 196)
  );
}

async function testJalalAleAhmadApartmentMashhad(): Promise<string | null> {
  const draft = freshDraft();
  const msg =
    'من یک آپارتمان ۱۳۰ متری در جلال آل احمد میخوام ترجیحا ۲ خواب با ۱۰ میلیارد طبقه ترجیحا ۲-۵ سرمایش و گرمایش چیلر';
  const r = await turn(draft, draft.turns ?? [], msg, {
    preferredCityId: 'mashhad',
    preferredCityName: 'مشهد',
  });

  const loc = String(r.needDraft.answers.location ?? '');
  return (
    assert('jalal-mashhad-city', r.needDraft.parsedIntent.city === 'مشهد') ??
    assert('jalal-said-radi-hood', r.needDraft.parsedIntent.neighborhoodSlug === 'سید-رضی') ??
    assert('jalal-area', /جلال\s*آل\s*احمد/u.test(String(r.needDraft.parsedIntent.entities?.area ?? ''))) ??
    assert('jalal-no-location-loop', r.activeFieldKey !== 'location') ??
    assert('jalal-location-confirmed', Boolean(r.confirmedFields?.includes('location'))) ??
    assert('jalal-slots', r.needDraft.answers.areaMin === 130 && r.needDraft.answers.rooms === 2)
  );
}

async function testShopAnahitaProgressive(): Promise<string | null> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];

  let r = await turn(draft, turns, 'یک مغازه داخل پاساژ اناهیتا میخوام', {
    confirmedFields: confirmed,
  });
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  let err =
    assert('anahita-shop-kind', draft.answers.propertyKind === 'shop') ??
    assert('anahita-shop-mashhad', draft.parsedIntent.city === 'مشهد') ??
    assert(
      'anahita-shop-area',
      /پاساژ\s*[\u200c\s]*(?:آ|ا)ناهیتا/u.test(
        String(draft.parsedIntent.entities?.area ?? '')
      )
    );
  if (err) return err;

  r = await turn(draft, turns, 'رهن و اجاره', {
    confirmedFields: confirmed,
    lastAskedField: r.activeFieldKey,
  });
  confirmed = r.confirmedFields ?? [];
  draft = r.needDraft;
  turns = draft.turns ?? [];

  err =
    assert('anahita-deal', draft.answers.dealType === 'rent_rahn_ejare') ??
    assert(
      'anahita-still-mashhad',
      draft.parsedIntent.city === 'مشهد' &&
        Boolean(draft.parsedIntent.neighborhoodSlug)
    );
  if (err) return err;

  r = await turn(draft, turns, 'مشهد خیابان فرامرز عباسی', {
    confirmedFields: confirmed,
    lastAskedField: r.activeFieldKey,
  });

  const loc = String(r.needDraft.answers.location ?? '');
  const hoodSlug = String(r.needDraft.parsedIntent.neighborhoodSlug ?? '');
  return (
    assert('anahita-final-hood', /فرامرز/.test(loc) || /فرامرز/.test(hoodSlug)) ??
    assert('anahita-final-mashhad', /مشهد/.test(loc)) ??
    assert('anahita-no-repeat-location', r.activeFieldKey !== 'location') ??
    assert('anahita-location-confirmed', Boolean(r.confirmedFields?.includes('location')))
  );
}

function testPostRegression(): string | null {
  const parsed = parseIntentFromText('آپارتمان اجاره در مشهد');
  parsed.city = 'مشهد';
  parsed.intentType = 'property_search';
  parsed.categorySlug = 'apartment-rent';

  const draft = legacyNeedDraftFromParsed(
    parsed,
    {
      dealType: 'rent_monthly',
      propertyKind: 'apartment',
      location: 'مشهد',
    },
    [{ role: 'user', content: 'آپارتمان اجاره در مشهد' }]
  );

  const postReadiness = buildReadiness(draft);
  const v2Readiness = buildV2Readiness(draft, new Set());

  return (
    assert('post-still-early-preview', postReadiness.readyToPreview === true) ??
    assert('v2-stricter', v2Readiness.readyToPreview === false) ??
    assert('v2-has-missing', (v2Readiness.missingFields.length ?? 0) > 0)
  );
}

export async function runV2ScenarioSelfTest(): Promise<{
  passed: number;
  failed: string[];
}> {
  const cases: Array<{ id: string; run: () => Promise<string | null> | string | null }> = [
    { id: 'user-transcript', run: testUserTranscript },
    { id: 'mzoon-mashhad', run: testMzoonMashhad },
    { id: 'apartment-rent', run: testApartmentRent },
    { id: 'land-sale', run: testLandSale },
    { id: 'off-topic-vehicle', run: testOffTopicVehicle },
    { id: 'shop-mashhad-intelligence', run: testShopMashhadIntelligence },
    { id: 'law-office-kohsangi', run: testLawOfficeKohsangiCorrection },
    { id: 'storage-faramarz-abbasi', run: testStorageFaramarzAbbasi },
    { id: 'imam-khomeini-generic', run: testImamKhomeiniGenericStreet },
    { id: 'kohsangi-compact', run: testKohsangiCompactMatch },
    { id: 'atlas-saidi-office', run: testAtlasSaidiOffice },
    { id: 'faramarz-student-apartment', run: testFaramarzStudentApartment },
    { id: 'anahita-office-faramarz', run: testAnahitaOfficeFaramarz },
    { id: 'shop-anahita-progressive', run: testShopAnahitaProgressive },
    { id: 'jalal-ale-ahmad-apartment', run: testJalalAleAhmadApartmentMashhad },
    { id: 'nesteran-malek-abad', run: testNesteranMalekAbadMashhad },
    { id: 'land-sajjad-mashhad', run: testLandSajjadMashhad },
    { id: 'post-regression', run: testPostRegression },
  ];

  const failed: string[] = [];
  for (const c of cases) {
    const err = await c.run();
    if (err) failed.push(`${c.id}: ${err}`);
  }
  const casePassed = cases.length - failed.length;
  const matrix = await runV2ScenarioMatrix(turn);
  failed.push(...matrix.failed);

  return { passed: casePassed + matrix.passed, failed };
}

const isDirectRun =
  typeof process !== 'undefined' &&
  Boolean(process.argv[1]?.includes('run-v2-scenario-self-test'));

if (isDirectRun) {
  runV2ScenarioSelfTest().then(({ passed, failed }) => {
    const total = passed + failed.length;
    if (failed.length) {
      console.error('V2 scenario self-test FAILED');
      for (const f of failed) console.error('  -', f);
      process.exit(1);
    }
    console.log(`V2 scenario self-test OK (${passed}/${total})`);
  });
}
