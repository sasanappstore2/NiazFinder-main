/**
 * Targeted self-test for the «اسم محله» failure class — hood-fuzzy.ts.
 *
 * The assigned failures are single-edit typos in a neighborhood name that
 * exact matchers miss: standalone hoods (سجاد → سجا/جساد) and one corrupted
 * part of a two-part hood (وکیل‌آباد → وکل آباد / وکیل آبااد).
 *
 * Run: npx tsx src/intake/smart-extractor/rules/hood-fuzzy-self-test.ts
 *
 * Sections:
 *  A. Unit tests: matchHoodPhrase / matchHoodInText (exact, ZWNJ, fuzzy,
 *     two-part, three-part, ambiguity, non-hoods, confidence < exact).
 *  B. Class fix: every failure assigned to this package (id/variant/word from
 *     the deterministic deep eval, seed `deep:${id}:${variant}`) must be
 *     recovered by matchHoodInText so `location.neighborhood` includes-check
 *     passes once wired.
 *  C. Clean-text safety: across all 1000 corpus scenarios the matcher must
 *     never invent a hood that is not literally present in the clean text.
 */

import {
  EXACT_HOOD_CONFIDENCE,
  matchHoodInText,
  matchHoodPhrase,
} from './hood-fuzzy';
import { ALL_SMART_INTAKE_SCENARIOS } from '../tests/scenarios';
import { hashString, injectTypo, mulberry32 } from '../tests/typo-sim';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';

/**
 * Mirror of MULTI_HOODS in smart-field-extractor.ts:155 (not exported there);
 * this is the list the wiring step is expected to pass. The module itself is
 * list-agnostic — synthetic lists are used for ambiguity tests below.
 */
const HOODS: readonly string[] = [
  'سجاد',
  'احمدآباد',
  'وکیل آباد',
  'کوهسنگی',
  'قاسم آباد',
  'الهیه',
  'نیاوران',
  'ونک',
  'جردن',
  'زعفرانیه',
  'پاسداران',
  'فرمانیه',
  'تجریش',
  'سعادت آباد',
  'شهرک غرب',
  'فردوسی',
  'بنفشه',
  'خیام',
  'امامت',
  'امام رضا',
  'ابن سینا',
  'حرم',
];

const norm = (s: string): string => normalizePersian(s).replace(/\s+/g, '');

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------- A: unit tests ----------

function unitTests(): void {
  console.log('A. Unit tests — matchHoodPhrase / matchHoodInText');

  // exact (incl. ZWNJ two-part spelling)
  for (const phrase of ['سجاد', 'بنفشه', 'وکیل آباد', 'وکیل‌آباد', 'قاسم آباد', 'کوهسنگی']) {
    const m = matchHoodPhrase(phrase, HOODS);
    check(`phrase exact "${phrase}"`, m?.exact === true && m.distance === 0, JSON.stringify(m));
    check(`phrase exact confidence "${phrase}"`, m?.confidence === EXACT_HOOD_CONFIDENCE);
  }

  // fuzzy standalone (all corrupted forms taken from the assigned failures)
  const fuzzySingle: Array<[string, string]> = [
    ['سجا', 'سجاد'],
    ['جساد', 'سجاد'],
    ['نبفشه', 'بنفشه'],
    ['کوسهنگی', 'کوهسنگی'],
    ['زعفرنیه', 'زعفرانیه'],
    ['الههی', 'الهیه'],
    ['فردهوسی', 'فردوسی'],
    ['جدن', 'جردن'],
    ['خیم', 'خیام'],
    ['جرمانیه', 'فرمانیه'],
  ];
  for (const [corrupt, want] of fuzzySingle) {
    const m = matchHoodPhrase(corrupt, HOODS);
    check(
      `phrase fuzzy "${corrupt}" → ${want}`,
      m?.hood === want && !m.exact,
      JSON.stringify(m)
    );
    check(
      `fuzzy confidence < exact for "${corrupt}"`,
      m != null && m.confidence < EXACT_HOOD_CONFIDENCE,
      String(m?.confidence)
    );
  }

  // fuzzy two-part (corruption in either part)
  const fuzzyTwoPart: Array<[string, string]> = [
    ['وکل آباد', 'وکیل آباد'],
    ['وکیل آبااد', 'وکیل آباد'],
    ['وکیل باد', 'وکیل آباد'],
    ['وکی آبااد', 'وکیل آباد'],
    ['قاسسم آباد', 'قاسم آباد'],
    ['قاسم آبد', 'قاسم آباد'],
    ['سعچدت آباد', 'سعادت آباد'],
    ['سعاخت آباد', 'سعادت آباد'],
    ['سعادت آعباد', 'سعادت آباد'],
    ['وکیل آبد', 'وکیل آباد'],
  ];
  for (const [corrupt, want] of fuzzyTwoPart) {
    const m = matchHoodPhrase(corrupt, HOODS);
    check(
      `two-part fuzzy "${corrupt}" → ${want}`,
      m?.hood === want && !m.exact && m.confidence < EXACT_HOOD_CONFIDENCE,
      JSON.stringify(m)
    );
  }

  // non-hoods and ambiguity must yield null
  for (const phrase of ['مرزداران', 'پارکینگ', 'میدان', '800', '', 'مرکز']) {
    const m = matchHoodPhrase(phrase, HOODS);
    check(`phrase non-hood "${phrase}" → null`, m === null, JSON.stringify(m));
  }
  const amb = matchHoodPhrase('ننک', ['ونک', 'بنک']);
  check('ambiguity tie → null', amb === null, JSON.stringify(amb));
  const ambText = matchHoodInText('اجاره در ننک تهران', ['ونک', 'بنک']);
  check('ambiguity in text → null', ambText === null, JSON.stringify(ambText));

  // in-text: standalone + two-part + three-part + city co-occurrence
  const inText: Array<[string, string]> = [
    ['آپارتمان رهن کامل 800 میلیون تومان در وکیل آبااد', 'وکیل آباد'],
    ['اجاره آپارتمان نوساز یا حداکثر 5 سال ساخت در کوسهنگی', 'کوهسنگی'],
    ['آپارتمان 90 متری خیابان نبفشه برای اجاره', 'بنفشه'],
    ['آپارتمان 1 خواب 60 متر برای اجاره در سجا مشهد', 'سجاد'],
    ['آپارتمان 1 خواب 120 متر برای اجاره در وکل آباد مشهد', 'وکیل آباد'],
    ['خرید آپارتمان 2 خواب با بودجه 3 میلیارد در سعچدت آباد', 'سعادت آباد'],
    ['خرید آپارتمان 2 خواب با بودجه 3 میلیارد در ونک', 'ونک'],
    ['انبار 200 متر با رمپ تخلیه در شهرک صنعتی طوس', 'شهرک صنعتی توس'],
  ];
  for (const [text, want] of inText) {
    const m = matchHoodInText(text, HOODS);
    check(`text "${text.slice(0, 45)}…" → ${want}`, m?.hood === want, JSON.stringify(m));
  }

  // no hood present → null (common words, city names, digits)
  for (const text of [
    'آپارتمان 2 خواب 90 متر اجاره در مرکز تهران',
    'سلام من دنبال یک آپارتمان هستم برای خانواده 4 نفره',
    'فوری نیاز به آپارتمان 1 خواب اجاره در مرکز شهر',
    'ویلا برای خرید در رامسر با ویو دریا',
  ]) {
    const m = matchHoodInText(text, HOODS);
    check(`text no-hood → null: "${text.slice(0, 35)}…"`, m === null, JSON.stringify(m));
  }
}

// ---------- B: assigned failure class must be recovered ----------

/** Exactly the failures assigned to this package (deterministic deep eval). */
const ASSIGNED: Array<{ id: string; variant: number; word: string; failures: string[] }> = [
  { id: '3', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '3', variant: 2, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '6', variant: 2, word: 'الهیه', failures: ['location.neighborhood.includes'] },
  { id: '7', variant: 1, word: 'کوهسنگی', failures: ['location.neighborhood.includes'] },
  { id: '10', variant: 2, word: 'بنفشه', failures: ['location.neighborhood.includes', 'disambiguation'] },
  { id: '13', variant: 1, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '101', variant: 0, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '107', variant: 1, word: 'فردوسی', failures: ['location.neighborhood.includes'] },
  { id: '108', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '108', variant: 2, word: 'سعادت', failures: ['location.neighborhood.includes'] },
  { id: '109', variant: 0, word: 'خیام', failures: ['location.neighborhood.includes'] },
  { id: '113', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '113', variant: 1, word: 'وکیل', failures: ['location.neighborhood.includes'] },
  { id: '114', variant: 2, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '115', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '117', variant: 1, word: 'فردوسی', failures: ['location.neighborhood.includes'] },
  { id: '118', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '122', variant: 2, word: 'جردن', failures: ['location.neighborhood.includes'] },
  { id: '123', variant: 1, word: 'وکیل', failures: ['location.neighborhood.includes'] },
  { id: '126', variant: 0, word: 'فرمانیه', failures: ['location.neighborhood.includes'] },
  { id: '129', variant: 0, word: 'خیام', failures: ['location.neighborhood.includes'] },
  { id: '129', variant: 1, word: 'خیام', failures: ['location.neighborhood.includes'] },
  { id: '129', variant: 2, word: 'خیام', failures: ['location.neighborhood.includes'] },
  { id: '133', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '133', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '135', variant: 2, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '136', variant: 2, word: 'فرمانیه', failures: ['location.neighborhood.includes'] },
  { id: '142', variant: 2, word: 'جردن', failures: ['location.neighborhood.includes'] },
  { id: '143', variant: 0, word: 'وکیل', failures: ['location.neighborhood.includes'] },
  { id: '143', variant: 2, word: 'وکیل', failures: ['location.neighborhood.includes'] },
  { id: '144', variant: 0, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '144', variant: 1, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '145', variant: 2, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '148', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '148', variant: 1, word: 'سعادت', failures: ['location.neighborhood.includes'] },
  { id: '148', variant: 2, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '153', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '155', variant: 0, word: 'قاسم', failures: ['location.neighborhood.includes'] },
  { id: '155', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '201', variant: 0, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '201', variant: 2, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '202', variant: 0, word: 'جردن', failures: ['location.neighborhood.includes'] },
  { id: '205', variant: 0, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '208', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '211', variant: 0, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '214', variant: 1, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '215', variant: 1, word: 'قاسم', failures: ['location.neighborhood.includes'] },
  { id: '218', variant: 2, word: 'سعادت', failures: ['location.neighborhood.includes'] },
  { id: '220', variant: 0, word: 'الهیه', failures: ['location.neighborhood.includes'] },
];

function classFixTests(): void {
  console.log(`B. Assigned failure class — ${ASSIGNED.length} cases (seed deep:id:variant)`);

  let recovered = 0;
  for (const f of ASSIGNED) {
    const scenario = ALL_SMART_INTAKE_SCENARIOS.find((s) => s.id === f.id);
    if (!scenario) {
      check(`[${f.id} v${f.variant}] scenario exists`, false, 'not found');
      continue;
    }
    const rng = mulberry32(hashString(`deep:${f.id}:${f.variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo || typo.word !== f.word) {
      check(
        `[${f.id} v${f.variant}] deterministic repro (word=${f.word})`,
        false,
        `got ${typo?.word ?? 'null'}`
      );
      continue;
    }
    const expectedField = scenario.expected.find(
      (e) => 'includes' in e && e.path === 'location.neighborhood' && e.includes
    );
    if (!expectedField || !('includes' in expectedField) || !expectedField.includes) {
      check(`[${f.id} v${f.variant}] has neighborhood expectation`, false, 'missing');
      continue;
    }
    const normalizedText = normalizePersian(applyTypoAliases(typo.text));
    const m = matchHoodInText(normalizedText, HOODS);
    const ok =
      m != null && norm(m.hood).includes(norm(expectedField.includes)) && m.confidence < EXACT_HOOD_CONFIDENCE;
    if (ok) recovered++;
    else {
      check(
        `[${f.id} v${f.variant}] recovered`,
        false,
        `word=${typo.word} got=${JSON.stringify(m)} want includes=${expectedField.includes}`
      );
    }
  }
  check(`all assigned failures recovered by matcher (${recovered}/${ASSIGNED.length})`, recovered === ASSIGNED.length);

  // The id-10 disambiguation failure is unblocked once the capture is corrected.
  const id10 = matchHoodPhrase('نبفشه', HOODS);
  check('id-10 capture "نبفشه" corrects to بنفشه (unblocks disambiguation)', id10?.hood === 'بنفشه', JSON.stringify(id10));
}

// ---------- C: clean-text safety over the full corpus ----------

function cleanSafetyTests(): void {
  console.log('C. Clean-text safety — matcher must not invent hoods on clean corpus');
  let invented = 0;
  let hits = 0;
  for (const scenario of ALL_SMART_INTAKE_SCENARIOS) {
    const normalizedText = normalizePersian(applyTypoAliases(scenario.needText));
    const m = matchHoodInText(normalizedText, HOODS);
    if (!m) continue;
    hits++;
    if (!normalizedText.includes(norm(m.hood))) {
      invented++;
      console.error(`  ❌ [${scenario.id}] invented "${m.hood}" (d=${m.distance}) from clean text`);
    }
  }
  check(`no invented hoods on ${ALL_SMART_INTAKE_SCENARIOS.length} clean texts (hits=${hits})`, invented === 0);
}

// ---------- main ----------

function main(): void {
  unitTests();
  classFixTests();
  cleanSafetyTests();
  console.log(`\n${failed === 0 ? '✅' : '❌'} hood-fuzzy self-test: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
