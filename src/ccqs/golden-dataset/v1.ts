/**
 * Golden dataset v1 — CCQS §1.1/§11 (`PLAN/ccqs-architecture.md`). Permanent, git-tracked ground
 * truth. The first 30 entries are this session's own investigation fixtures (their
 * categorySlug/city values were already human-verified ground truth for the original drift
 * investigation, `PLAN/phase7-drift-investigation-report.md`) — reused rather than re-authored, so
 * this dataset is evidence-based from day one, not invented. The entries after that are explicit
 * regression guards for the Priority 1-3 fixes shipped this session — each one encodes a real bug
 * this session found and fixed, permanently protected from silently recurring.
 *
 * Never delete an entry — deprecate it (`deprecated: true`) if it's ever found to be wrong, and add
 * a corrected entry with a new `caseId`, so historical ReplayRuns that reference the old caseId
 * remain interpretable (mirrors SEE's reason-code lifecycle, §14.5 of the SEE architecture doc).
 */
import type { GoldenCase } from '../types';

const ADDED_AT = '2026-07-08T00:00:00.000Z';

const INVESTIGATION_FIXTURES: GoldenCase[] = [
  { caseId: 'inv-01', rawText: 'آپارتمان دو خواب اجاره در مشهد', expectedCategory: 'apartment-rent', expectedLocationCity: 'مشهد', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture (verified ground truth).', deprecated: false },
  { caseId: 'inv-02', rawText: 'آپارتمان دو خواب اجاره در تهران', expectedCategory: 'apartment-rent', expectedLocationCity: 'تهران', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-03', rawText: 'آپارتمان یک خواب فروش در شیراز', expectedCategory: 'apartment-sale', expectedLocationCity: 'شیراز', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-04', rawText: 'آپارتمان سه خواب اجاره در اصفهان', expectedCategory: 'apartment-rent', expectedLocationCity: 'اصفهان', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-05', rawText: 'لپ تاپ گیمینگ نو میخوام بخرم', expectedCategory: 'laptop', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture', 'location-not-in-text'], addedAt: ADDED_AT, reason: 'Original fixture — city was a structured field only, not in rawText (the location/sourceText comparator bug case).', deprecated: false },
  { caseId: 'inv-06', rawText: 'لپ تاپ دست دوم برای برنامه نویسی', expectedCategory: 'laptop', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-07', rawText: 'گوشی موبایل نو میخوام', expectedCategory: 'mobile-phone', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-08', rawText: 'گوشی موبایل دست دوم سالم', expectedCategory: 'mobile-phone', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-09', rawText: 'پلی استیشن پنج دست دوم میخوام', expectedCategory: 'game-console', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-10', rawText: 'پلی استیشن پنج نو با دو دسته', expectedCategory: 'game-console', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-11', rawText: 'خودرو پراید مدل بالا میخوام بخرم', expectedCategory: 'car', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-control-case'], addedAt: ADDED_AT, reason: 'Original fixture; ALSO used as the Priority 3 control case — must stay "car" and never be suppressed by the spare-parts/motorcycle collision guards added this session.', deprecated: false },
  { caseId: 'inv-12', rawText: 'خودرو پژو دست دوم سالم', expectedCategory: 'car', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-13', rawText: 'موتور سیکلت هوندا میخوام', expectedCategory: 'motorcycle', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture — the exact "هوندا→car" collision case fixed this session (Priority 3). Must resolve to motorcycle, never car, forever.', deprecated: false },
  { caseId: 'inv-14', rawText: 'موتور سیکلت دست دوم فوری میخوام', expectedCategory: 'motorcycle', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture — exercises the same موتور-negative-rule path fixed this session.', deprecated: false },
  { caseId: 'inv-15', rawText: 'آپارتمان دو خواب اجاره در رشت', expectedCategory: 'apartment-rent', expectedLocationCity: 'رشت', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-16', rawText: 'آپارتمان یک خواب اجاره در تبریز', expectedCategory: 'apartment-rent', expectedLocationCity: 'تبریز', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-17', rawText: 'لپ تاپ اپل مک بوک میخوام', expectedCategory: 'laptop', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-18', rawText: 'گوشی سامسونگ نو یا دست دوم', expectedCategory: 'mobile-phone', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-19', rawText: 'خودرو سواری اقتصادی برای کارکرد شهری', expectedCategory: 'car', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-20', rawText: 'موتور سیکلت اسپرت میخوام', expectedCategory: 'motorcycle', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture, bare "موتور سیکلت" phrase — exercises the exact zero-candidate bug fixed this session.', deprecated: false },
  { caseId: 'inv-21', rawText: 'کنسول بازی ایکس باکس دست دوم', expectedCategory: 'game-console', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-22', rawText: 'آپارتمان فروش در مشهد', expectedCategory: 'apartment-sale', expectedLocationCity: 'مشهد', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-23', rawText: 'آپارتمان اجاره کوتاه مدت در تهران', expectedCategory: 'suite-apartment-rent', expectedLocationCity: 'تهران', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-24', rawText: 'لپ تاپ ارزان برای دانشجو', expectedCategory: 'laptop', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture', 'p2-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture; ALSO doubles as a Priority 2 guard — "دانشجو" must never be mistaken for a location fragment.', deprecated: false },
  { caseId: 'inv-25', rawText: 'گوشی آیفون دست دوم سالم', expectedCategory: 'mobile-phone', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-26', rawText: 'خودرو وانت سنگین برای باربری', expectedCategory: 'car-heavy', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-27', rawText: 'قطعه یدکی گیربکس خودرو پراید', expectedCategory: 'spare-parts', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture — the exact "car wins over spare-parts" collision fixed this session (Priority 3). Must resolve to spare-parts, never car, forever.', deprecated: false },
  { caseId: 'inv-28', rawText: 'آپارتمان دو خواب اجاره در اصفهان', expectedCategory: 'apartment-rent', expectedLocationCity: 'اصفهان', tags: ['real-estate', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-29', rawText: 'کنسول بازی پلی استیشن قدیمی', expectedCategory: 'game-console', expectedLocationCity: null, tags: ['electronics', 'investigation-fixture'], addedAt: ADDED_AT, reason: 'Original drift-investigation batch fixture.', deprecated: false },
  { caseId: 'inv-30', rawText: 'موتور سیکلت نو کارکرد کم', expectedCategory: 'motorcycle', expectedLocationCity: null, tags: ['vehicles', 'investigation-fixture', 'p3-regression-guard'], addedAt: ADDED_AT, reason: 'Original fixture, bare motorcycle phrase — regression guard.', deprecated: false },
];

/** New cases added directly for this session's fixes — not from the original batch. */
const REGRESSION_GUARD_CASES: GoldenCase[] = [
  {
    caseId: 'p3-guard-01',
    rawText: 'موتور سیکلت',
    expectedCategory: 'motorcycle',
    expectedLocationCity: null,
    tags: ['vehicles', 'p3-regression-guard', 'bare-phrase'],
    addedAt: ADDED_AT,
    reason: 'The exact reproduction case for the original "زero candidates" bug: matchCategoryCandidatesFromRules("موتور سیکلت") returned [] before the Priority 3 fix.',
    deprecated: false,
  },
  {
    caseId: 'p3-guard-02',
    rawText: 'موتور سیکلت هوندا میخوام بخرم فوری',
    expectedCategory: 'motorcycle',
    expectedLocationCity: null,
    tags: ['vehicles', 'p3-regression-guard'],
    addedAt: ADDED_AT,
    reason: 'Extended reproduction of the "هوندا→car" collision with additional trailing words, confirming the fix is not brittle to surrounding text.',
    deprecated: false,
  },
  {
    caseId: 'p2-guard-01',
    rawText: 'یک وسیله برای خونه میخوام فوری',
    expectedCategory: null,
    expectedLocationCity: null,
    tags: ['location-false-positive-guard', 'p2-regression-guard'],
    addedAt: ADDED_AT,
    reason: 'Generic, category-less, location-less text — must never auto-resolve a location via nationwide weak token-overlap matching (Priority 2 fix).',
    deprecated: false,
  },
];

export const GOLDEN_DATASET_V1: readonly GoldenCase[] = [...INVESTIGATION_FIXTURES, ...REGRESSION_GUARD_CASES];
export const GOLDEN_DATASET_REF = 'golden-dataset@v1';
