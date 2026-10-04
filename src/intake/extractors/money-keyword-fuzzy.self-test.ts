/**
 * Targeted self-test for the money-keyword single-typo repair class.
 *
 * Failure class: monetary keywords (رهن / ودیعه / خرید) lost to ONE single-edit
 * typo — the global fuzzy corrector deliberately leaves short tokens untouched
 * (3-letter words only take same-length fixes; ambiguous candidates are
 * rejected) — so «رنه کامل ۶۵۰ میلیون» lost its FULL_DEPOSIT intent to the
 * budget-magnitude BUY inference, «۲۰۰ میلیون رنه ۱۱ میلیون اجاره» collapsed to
 * RENT with the deposit amount spilling into rent, and «خری آپارتمان» lost BUY.
 *
 * Generic repair under test:
 *  - findKeywordIndicesWithFuzzyRepair: exact-first keyword lookup with a
 *    UNIQUE (single distinct near-token) OSA ≤1 repair fallback.
 *  - transactionExtractor: fuzzy FULL_DEPOSIT / DEPOSIT_AND_RENT / BUY repair
 *    rules gated by adjacency, money proximity and rent-signal context.
 *  - parse-persian-amount: deposit keyword proximity + same-mention guard
 *    (one money mention cannot be both deposit and rent).
 *
 * Run: npx tsx src/intake/extractors/money-keyword-fuzzy.self-test.ts
 */
import { extractTransactionType } from './transactionExtractor';
import {
  extractPropertyMoneyFromText,
  findKeywordIndicesWithFuzzyRepair,
} from '@/lib/need-intake/parse-persian-amount';
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function checkTrue(name: string, cond: boolean, detail = ''): void {
  if (cond) passed++;
  else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------- every single-edit variant of a word (same ops as the stress harness) ----------

const LETTERS = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';

function singleEditVariants(word: string): string[] {
  const out = new Set<string>();
  for (let pos = 0; pos < word.length; pos++) {
    out.add(word.slice(0, pos) + word.slice(pos + 1)); // delete
    out.add(word.slice(0, pos) + word[pos] + word.slice(pos)); // duplicate
    for (const l of LETTERS) {
      out.add(word.slice(0, pos) + l + word.slice(pos)); // insert
      out.add(word.slice(0, pos) + l + word.slice(pos + 1)); // substitute
    }
    if (pos < word.length - 1) {
      out.add(word.slice(0, pos) + word[pos + 1] + word[pos] + word.slice(pos + 2)); // transpose
    }
  }
  out.delete(word);
  return [...out];
}

// ---------- 1. findKeywordIndicesWithFuzzyRepair unit behavior ----------

{
  // Exact spelling always wins and never reports fuzzy.
  const exact = findKeywordIndicesWithFuzzyRepair('رهن کامل ۶۵۰ میلیون', 'رهن');
  check('exact rahn not fuzzy', exact.fuzzy, false);
  checkTrue('exact rahn found', exact.indices.length === 1);

  // Unique single-edit token is repaired.
  const fuzzy = findKeywordIndicesWithFuzzyRepair('رنه کامل ۶۵۰ میلیون', 'رهن');
  check('unique fuzzy repaired', fuzzy.fuzzy && fuzzy.token === 'رنه', true);

  // Two DIFFERENT near-tokens reject the repair (ambiguity guard).
  const ambiguous = findKeywordIndicesWithFuzzyRepair('رن ۲۰۰ و رنه ۱۱', 'رهن');
  check('ambiguous rejected', ambiguous.fuzzy, false);
  checkTrue('ambiguous no indices', ambiguous.indices.length === 0);

  // Lookalikes that are NOT within one edit are untouched (فرهنگ/رهنگیری/رنت).
  for (const safe of ['فرهنگ شهر', 'کد رهگیری', 'اینترنت رنت', 'گره کامل']) {
    const hit = findKeywordIndicesWithFuzzyRepair(safe, 'رهن');
    checkTrue(`no false rahn in "${safe}"`, hit.indices.length === 0, JSON.stringify(hit));
  }
}

// ---------- 2. FULL_DEPOSIT survives a single typo in رهن or کامل ----------

{
  const typeOf = (t: string): string | null => extractTransactionType(t)?.type ?? null;

  // Exact spellings unchanged.
  check('clean رهن کامل', typeOf('آپارتمان رهن کامل 650 میلیون در الهیه'), 'FULL_DEPOSIT');
  check('clean فقط رهن', typeOf('فقط رهن 300 میلیون در ونک'), 'FULL_DEPOSIT');

  // Every single-edit variant of رهن inside «آپارتمان _ کامل 650 میلیون».
  let rahnVariantsOk = 0;
  let rahnVariantsTotal = 0;
  for (const v of singleEditVariants('رهن')) {
    const t = typeOf(`آپارتمان ${v} کامل 650 میلیون در الهیه`);
    rahnVariantsTotal++;
    if (t === 'FULL_DEPOSIT') rahnVariantsOk++;
    else failures.push(`rahn variant "${v}" → ${t}`);
  }
  checkTrue(
    'all single-edit رهن variants keep FULL_DEPOSIT',
    rahnVariantsOk === rahnVariantsTotal,
    `${rahnVariantsOk}/${rahnVariantsTotal}`
  );

  // Every single-edit variant of کامل (typo'd کامل، intact رهن).
  let kamelVariantsOk = 0;
  let kamelVariantsTotal = 0;
  for (const v of singleEditVariants('کامل')) {
    const t = typeOf(`آپارتمان رهن ${v} 650 میلیون در الهیه`);
    kamelVariantsTotal++;
    if (t === 'FULL_DEPOSIT') kamelVariantsOk++;
    else failures.push(`kamel variant "${v}" → ${t}`);
  }
  checkTrue(
    'all single-edit کامل variants keep FULL_DEPOSIT',
    kamelVariantsOk === kamelVariantsTotal,
    `${kamelVariantsOk}/${kamelVariantsTotal}`
  );

  // Repaired phrase must be anchored by money: no amount nearby → no repair.
  check('no money anchor → no fuzzy full', typeOf('گره رنه کامل با آشپزخانه'), null);
  checkTrue('no money anchor stays null-ish', typeOf('رنه کامل بدون مبلغ') !== 'BUY');
}

// ---------- 3. DEPOSIT_AND_RENT survives a single typo in رهن/ودیعه ----------

{
  const typeOf = (t: string): string | null => extractTransactionType(t)?.type ?? null;

  check('clean rahn+ejare amounts', typeOf('خونه 2 خواب 200 میلیون رهن 11 میلیون اجاره در فردوسی'), 'DEPOSIT_AND_RENT');

  let ok = 0;
  let total = 0;
  for (const v of singleEditVariants('رهن')) {
    const t = typeOf(`خونه 2 خواب 200 میلیون ${v} 11 میلیون اجاره در فردوسی`);
    total++;
    if (t === 'DEPOSIT_AND_RENT') ok++;
    else failures.push(`deposit variant "${v}" → ${t}`);
  }
  checkTrue('all رهن variants keep DEPOSIT_AND_RENT', ok === total, `${ok}/${total}`);

  // ودیعه repair path (deposit keyword corrupted, rent word intact).
  check('ودیعه exact', typeOf('ودیعه 200 میلیون و اجاره 10 میلیون ماهانه'), 'DEPOSIT_AND_RENT');
  check('ودیعه typo', typeOf('ودیع 200 میلیون و اجاره 10 میلیون ماهانه'), 'DEPOSIT_AND_RENT');

  // A lone rent price next to a spurious رهن-like token stays RENT
  // (same-mention guard: one money mention cannot be deposit AND rent).
  check(
    'single mention stays RENT',
    typeOf('اجاره آپارتمان در رهن آسانسور 15 میلیون اجاره'),
    'RENT'
  );
}

// ---------- 4. parse-persian-amount: deposit proximity + same-mention guard ----------

{
  const money = extractPropertyMoneyFromText('خونه 2 خواب 200 میلیون رنه 11 میلیون اجاره در فردوسی');
  check('typo rahn amount recovered', money.rahnAmount, 200_000_000);
  check('rent amount stays rent', money.monthlyRent, 11_000_000);

  const clean = extractPropertyMoneyFromText('خونه 3 خواب 100 میلیون رهن 15 میلیون اجاره نزدیک دانشگاه');
  check('clean rahn untouched', clean.rahnAmount, 100_000_000);
  check('clean rent untouched', clean.monthlyRent, 15_000_000);

  const guarded = extractPropertyMoneyFromText('اجاره آپارتمان در رهن آسانسور 15 میلیون اجاره');
  checkTrue(
    'same mention not double-booked',
    guarded.rahnAmount === 15_000_000 && guarded.monthlyRent == null,
    JSON.stringify(guarded)
  );

  const rentOnly = extractPropertyMoneyFromText('اجاره آپارتمان 15 میلیون در جردن');
  check('rent-only text has no rahn', rentOnly.rahnAmount ?? null, null);
  check('rent-only keeps rent', rentOnly.monthlyRent, 15_000_000);

  // Explicit compound keeps both slots even when amounts are equal.
  const compound = extractPropertyMoneyFromText('رهن و اجاره 100 میلیون توی سجاد');
  check('compound keeps deposit', compound.rahnAmount, 100_000_000);
  check('compound keeps rent', compound.monthlyRent, 100_000_000);
}

// ---------- 5. BUY survives a single typo in خرید ----------

{
  const typeOf = (t: string): string | null => extractTransactionType(t)?.type ?? null;

  check('clean خرید', typeOf('خرید آپارتمان بالای 240 میلیون در جردن'), 'BUY');

  let ok = 0;
  let total = 0;
  for (const v of singleEditVariants('خرید')) {
    const t = typeOf(`${v} آپارتمان بالای 240 میلیون در جردن`);
    total++;
    if (t === 'BUY') ok++;
    else failures.push(`kharid variant "${v}" → ${t}`);
  }
  checkTrue('all خرید variants give BUY', ok === total, `${ok}/${total}`);

  // No property/price context → fuzzy خرید must not fire.
  checkTrue('fuzzy خرید needs context', typeOf('خری بدون هیچ چیز دیگری') !== 'BUY');
}

// ---------- 6. end-to-end through extractSmartFields (rules-only) ----------

async function endToEnd(): Promise<void> {
  const run = async (text: string) =>
    extractSmartFields(text, '', {
      preferredCity: 'مشهد',
      preferredCitySlug: 'mashhad',
      useAI: false,
      useRules: true,
    });

  // Full deposit with typo'd رهن — transaction AND deposit amount recover.
  const full = await run('آپارتمان رنه کامل 650 میلیون در الهیه');
  check('e2e typo رهن کامل → FULL_DEPOSIT', full.transaction.type, 'FULL_DEPOSIT');
  check('e2e typo رهن کامل deposit amount', full.budget.depositAmount, 650_000_000);
  check('e2e no spurious BUY category sync', full.category.subcategory, 'apartment-rent');

  // Deposit+rent with typo'd رهن — transaction recovers (budget amounts are
  // owned by the rules-engine deposit patterns, out of this module's scope).
  const combo = await run('خونه 2 خواب 200 میلیون رنه 11 میلیون اجاره در فردوسی');
  check('e2e typo رهن اجاره → DEPOSIT_AND_RENT', combo.transaction.type, 'DEPOSIT_AND_RENT');

  // Spurious رهن from neighborhood correction must not flip rent-only deals.
  const rent = await run('اجاره آپارتمان در ردن، آسانسور، 15 میلیون اجاره');
  check('e2e spurious رهن stays RENT', rent.transaction.type, 'RENT');
  check('e2e spurious رهن rent amount', rent.budget.rentAmount, 15_000_000);

  // Typo'd خرید.
  const buy = await run('خری آپارتمان بالای 240 میلیون در جردن');
  check('e2e typo خرید → BUY', buy.transaction.type, 'BUY');
}

// ---------- main ----------

endToEnd()
  .then(() => {
    for (const f of failures) console.error('  ❌ ' + f);
    console.log(`\n=== money-keyword-fuzzy self-test: ${passed} passed, ${failed} failed ===`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
