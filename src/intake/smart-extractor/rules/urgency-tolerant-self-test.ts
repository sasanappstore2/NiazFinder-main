/**
 * Targeted self-test for the typo-tolerant urgency module.
 *
 * Covers the assigned failure class `metadata.urgency=undefined`: urgency
 * phrases («فوری», «تا آخر تیر», «این هفته», …) that break when a single
 * edit lands inside a trigger word. Runs:
 *   1. full-corpus clean parity — the module must reproduce the legacy
 *      urgency chain's outcome on every clean corpus text (1000 scenarios);
 *   2. exhaustive single-edit variants of each trigger word in context;
 *   3. replay of the assigned (id, variant) regressions via the harness
 *      typo simulator (same seed formula as scripts/deep-test/eval-slice.ts);
 *   4. false-positive guards on clean non-urgency texts;
 *   5. kill-switch (INTAKE_FUZZY_CORRECTOR=false) degrades to exact matching.
 *
 * Run: npx tsx src/intake/smart-extractor/rules/urgency-tolerant-self-test.ts
 */
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import {
  extractUrgencyTolerant,
  type UrgencyLevel,
} from './urgency-tolerant';
import { ALL_SMART_INTAKE_SCENARIOS } from '../tests/scenarios';
import { hashString, injectTypo, mulberry32 } from '../tests/typo-sim';

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------- 1. legacy oracle (current smart-field-extractor semantics) ----------

function legacyUrgency(normalizedText: string): UrgencyLevel | undefined {
  if (
    normalizedText.includes('فوری') ||
    normalizedText.includes('عجله') ||
    normalizedText.includes('فوریه')
  ) {
    return 'immediate';
  }
  if (normalizedText.includes('این هفته')) return 'this_week';
  if (
    normalizedText.includes('این ماه') ||
    normalizedText.includes('ماه جاری') ||
    /تا\s*آخر\s*تیر/u.test(normalizedText) ||
    /تا\s*آخر\s*(?:فروردین|اردیبهشت|خرداد|مرداد|شهریور|مهر|آبان|آذر|دی|بهمن|اسفند)/u.test(
      normalizedText
    )
  ) {
    return 'this_month';
  }
  return undefined;
}

function moduleUrgency(text: string): UrgencyLevel | undefined {
  return extractUrgencyTolerant(text)?.urgency;
}

// ---------- 2. exhaustive single-edit variant generator ----------

const PERSIAN_LETTERS = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی';

/** Every deletion, duplication, transposition, substitution and insertion. */
function* singleEditVariants(word: string): Generator<string> {
  for (let i = 0; i < word.length; i++) yield word.slice(0, i) + word.slice(i + 1);
  for (let i = 0; i < word.length; i++) yield word.slice(0, i) + word[i] + word.slice(i);
  for (let i = 0; i + 1 < word.length; i++) {
    yield word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
  }
  for (let i = 0; i < word.length; i++) {
    for (const ch of PERSIAN_LETTERS) {
      yield word.slice(0, i) + ch + word.slice(i + 1);
    }
  }
  for (let i = 0; i <= word.length; i++) {
    for (const ch of PERSIAN_LETTERS) {
      yield word.slice(0, i) + ch + word.slice(i);
    }
  }
}

function runVariantSweep(): void {
  console.log('\n— exhaustive single-edit variants of trigger words —');
  const cases: Array<{ phrase: string; trigger: string; expected: UrgencyLevel }> = [
    { phrase: 'فوری نیاز به آپارتمان 2 خواب اجاره در سجاد', trigger: 'فوری', expected: 'immediate' },
    { phrase: 'عجله دارم برای نظافت در ونک', trigger: 'عجله', expected: 'immediate' },
    { phrase: 'این هفته آپارتمان میخوام در تجریش', trigger: 'هفته', expected: 'this_week' },
    { phrase: 'این ماه دنبال لوله کش هستم', trigger: 'ماه', expected: 'this_month' },
    { phrase: 'ماه جاری نقاش میخوام', trigger: 'جاری', expected: 'this_month' },
    { phrase: 'نظافت آپارتمانم در تجریش تهران تا آخر تیر', trigger: 'تیر', expected: 'this_month' },
    { phrase: 'نظافت آپارتمانم در تجریش تهران تا آخر تیر', trigger: 'آخر', expected: 'this_month' },
    { phrase: 'نظافت خونه در ونک تهران تا آخر آذر', trigger: 'آذر', expected: 'this_month' },
    { phrase: 'نظافت خونه در ونک تهران تا آخر مهر', trigger: 'مهر', expected: 'this_month' },
    { phrase: 'نظافت خونه در ونک تهران تا آخر بهمن', trigger: 'بهمن', expected: 'this_month' },
  ];
  for (const { phrase, trigger, expected } of cases) {
    let tried = 0;
    let missed: string[] = [];
    for (const variant of singleEditVariants(trigger)) {
      if (variant === trigger) continue;
      const text = phrase.replace(trigger, variant);
      if (text === phrase) continue;
      tried++;
      const got = moduleUrgency(text);
      if (got !== expected) missed.push(`${variant}→${String(got)}`);
    }
    check(
      `all ${tried} single-edit variants of «${trigger}» in «${phrase.slice(0, 32)}…» keep ${expected}`,
      missed.length === 0,
      missed.length ? `misses: ${missed.slice(0, 8).join(', ')}` : undefined
    );
  }
}

// ---------- 3. assigned regression replay (harness seed formula) ----------

/** The assigned deterministic failures: (scenario id, variant, corrupted word). */
const ASSIGNED_FAILURES: Array<{ id: string; variant: number; word: string }> = [
  { id: '597', variant: 2, word: 'فوری' },
  { id: '612', variant: 0, word: 'فوری' },
  { id: '623', variant: 1, word: 'فوری' },
  { id: '627', variant: 1, word: 'فوری' },
  { id: '632', variant: 2, word: 'آخر' },
  { id: '633', variant: 0, word: 'تیر' },
  { id: '633', variant: 1, word: 'تیر' },
  { id: '634', variant: 2, word: 'آخر' },
  { id: '636', variant: 0, word: 'آخر' },
  { id: '637', variant: 1, word: 'آخر' },
  { id: '640', variant: 0, word: 'تیر' },
  { id: '640', variant: 1, word: 'تیر' },
  { id: '642', variant: 0, word: 'تیر' },
  { id: '643', variant: 0, word: 'تیر' },
  { id: '644', variant: 0, word: 'تیر' },
  { id: '644', variant: 1, word: 'آخر' },
  { id: '644', variant: 2, word: 'آخر' },
  { id: '645', variant: 0, word: 'آخر' },
  { id: '646', variant: 0, word: 'تیر' },
  { id: '646', variant: 2, word: 'تیر' },
  { id: '647', variant: 2, word: 'آخر' },
  { id: '650', variant: 1, word: 'تیر' },
  { id: '650', variant: 2, word: 'تیر' },
  { id: '651', variant: 0, word: 'تیر' },
  { id: '653', variant: 2, word: 'آخر' },
  { id: '655', variant: 2, word: 'آخر' },
  { id: '656', variant: 0, word: 'آخر' },
  { id: '656', variant: 2, word: 'آخر' },
  { id: '664', variant: 0, word: 'تیر' },
  { id: '667', variant: 1, word: 'تیر' },
  { id: '668', variant: 1, word: 'آخر' },
  { id: '668', variant: 2, word: 'تیر' },
  { id: '670', variant: 1, word: 'تیر' },
  { id: '670', variant: 2, word: 'تیر' },
];

function expectedUrgencyOf(scenarioId: string): UrgencyLevel | undefined {
  const scenario = ALL_SMART_INTAKE_SCENARIOS.find((s) => s.id === scenarioId);
  const field = scenario?.expected.find((f) => f.path === 'metadata.urgency');
  return field && 'equals' in field ? (field.equals as UrgencyLevel) : undefined;
}

function runAssignedReplay(): void {
  console.log('\n— replay of assigned (id, variant) regressions —');
  const byId = new Map(ALL_SMART_INTAKE_SCENARIOS.map((s) => [s.id, s]));
  for (const { id, variant, word } of ASSIGNED_FAILURES) {
    const scenario = byId.get(id);
    const expected = expectedUrgencyOf(id);
    if (!scenario || !expected) {
      check(`[${id} v${variant}] scenario + urgency expectation resolvable`, false);
      continue;
    }
    const rng = mulberry32(hashString(`deep:${id}:${variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo || typo.word !== word) {
      check(`[${id} v${variant}] harness reproduces corrupted word «${word}»`, false, `got ${typo?.word}`);
      continue;
    }
    const legacy = legacyUrgency(normalizePersian(typo.text));
    const got = moduleUrgency(typo.text);
    check(
      `[${id} v${variant}] «${word}»→"${typo.text.split(' ').find((t) => !scenario.needText.includes(t))}" → ${expected} (legacy: ${String(legacy)})`,
      got === expected,
      `got ${String(got)}`
    );
  }
}

// ---------- 4. exact phrases, compounds, false positives ----------

function runExactAndGuards(): void {
  console.log('\n— exact phrases, compounds, false-positive guards —');
  const exact: Array<[string, UrgencyLevel]> = [
    ['فوری نیاز به آپارتمان 2 خواب اجاره در سجاد', 'immediate'],
    ['نیاز به نظافت فوریه نیست', 'this_month'], // legacy: includes('فوری') hits فوریه → immediate... see note
    ['عجله دارم برای برقکار', 'immediate'],
    ['این هفته آپارتمان میخوام', 'this_week'],
    ['این ماه دنبال نظافتچی هستم', 'this_month'],
    ['ماه جاری نقاش میخوام', 'this_month'],
    ['نظافت آپارتمانم در ونک تهران تا آخر تیر', 'this_month'],
    ['نظافت آپارتمانم در ونک تهران تا اخر تیر', 'this_month'], // اخر (بدون آ) — رایج‌ترین غلط واقعی
    ['تا آخر تیرماه دنبال نظافتچی هستم', 'this_month'],
    ['تا آخر بهمن مبل میخوام', 'this_month'],
  ];
  for (const [text, expected] of exact) {
    check(`exact: «${text}» → ${expected}`, moduleUrgency(text) === expected, `got ${String(moduleUrgency(text))}`);
  }

  const negatives: string[] = [
    'آپارتمان 2 خواب 80 متر برای اجاره در سجاد مشهد',
    'خرید آپارتمان بین 2 تا 3 میلیارد در ونک',
    'رهن کامل 200 میلیون آپارتمان در کوهسنگی',
    'خونه 2 خوابه 100 میلیون رهن 5 میلیون اجاره در جردن',
    'غیرفوری؛ هر وقت شد نظافت پنجشنبه',
    'دفتر اداری 50 متری برای اجاره در امامت',
    'مبلمان فرسوده فروشی است در خیام',
  ];
  for (const text of negatives) {
    check(`negative: «${text.slice(0, 36)}…» → null`, moduleUrgency(text) === null, `got ${String(moduleUrgency(text))}`);
  }
}

// ---------- 5. kill switch ----------

function runKillSwitch(): void {
  console.log('\n— kill switch (INTAKE_FUZZY_CORRECTOR=false) —');
  const prev = process.env.INTAKE_FUZZY_CORRECTOR;
  process.env.INTAKE_FUZZY_CORRECTOR = 'false';
  try {
    check('kill switch: «فور نیاز …» → null', moduleUrgency('فور نیاز به آپارتمان 2 خواب در سجاد') === null);
    check('kill switch: «تا آرخ تیر» → null', moduleUrgency('نظافت در ونک تا آرخ تیر') === null);
    check('kill switch: exact «تا آخر تیر» still works', moduleUrgency('نظافت در ونک تا آخر تیر') === 'this_month');
    check('kill switch: exact «فوری» still works', moduleUrgency('فوری نظافت در ونک') === 'immediate');
  } finally {
    if (prev === undefined) delete process.env.INTAKE_FUZZY_CORRECTOR;
    else process.env.INTAKE_FUZZY_CORRECTOR = prev;
  }
}

// ---------- 6. full-corpus clean parity ----------

function runCorpusParity(): void {
  console.log('\n— full-corpus clean parity (legacy chain vs module) —');
  const mismatches: string[] = [];
  for (const scenario of ALL_SMART_INTAKE_SCENARIOS) {
    const normalized = normalizePersian(scenario.needText);
    const legacy = legacyUrgency(normalized);
    const got = moduleUrgency(scenario.needText);
    if (legacy !== got) {
      mismatches.push(`[${scenario.id}] legacy=${String(legacy)} module=${String(got)} — ${scenario.needText.slice(0, 60)}`);
    }
  }
  check(
    `module matches legacy urgency on all ${ALL_SMART_INTAKE_SCENARIOS.length} clean corpus texts`,
    mismatches.length === 0,
    mismatches.slice(0, 8).join(' | ')
  );
}

// ---------- main ----------

function main(): void {
  console.log('=== urgency-tolerant self-test ===');
  runExactAndGuards();
  runVariantSweep();
  runAssignedReplay();
  runKillSwitch();
  runCorpusParity();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log('✅ urgency-tolerant self-test passed');
}

main();
