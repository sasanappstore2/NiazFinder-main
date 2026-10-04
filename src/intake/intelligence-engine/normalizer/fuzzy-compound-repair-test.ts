/**
 * Targeted self-test for the ZWNJ-compound repair class in fuzzy-corrector.
 *
 * Failure class (round-1 eval): a single-edit typo inside a category-critical
 * ZWNJ compound («پیش‌فروش» → پی‌فروش / پیش‌فوش / …) was never repaired — the
 * fuzzy corrector skipped every ZWNJ token — so the pre-sale category hint
 * regex missed and the need fell back to residential-sale.
 *
 * Run: npx tsx src/intake/intelligence-engine/normalizer/fuzzy-compound-repair-test.ts
 *
 * Asserts:
 *  1. unit — every corrupted form repairs to the canonical compound; clean,
 *     derived and protected words pass through byte-identical;
 *  2. invariant — NO single-edit corruption of a compound is ever rewritten
 *     into an unrelated word (it either repairs or is left untouched);
 *  3. harness — the six assigned eval failures (typo-sim seeds) now pass;
 *  4. clean text — the whole pre-sale corpus section extracts correctly
 *     without typos.
 */
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import { evaluateScenario, hashString, injectTypo, mulberry32 } from '@/intake/smart-extractor/tests/typo-sim';

const COMPOUND = 'پیش\u200cفروش';
const ZWNJ = '\u200c';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`);
  }
}

const join = (s: string): string => s.replace(/[\s\u200c]+/g, '');

// ---------- 1) unit: corrupted forms repair ----------

function unitChecks(): void {
  /** (corrupted, source) pairs straight from the round-1 eval repro. */
  const OBSERVED: Array<[string, string]> = [
  ['پی\u200cفروش', 'delete ش'],
  ['پیثش\u200cفروش', 'insert ث'],
  ['پشی\u200cفروش', 'transpose یش'],
  ['پیش\u200cفوش', 'delete ر'],
  ['پیش\u200cروش', 'delete ف'],
  ['پیشافروش', 'substitute ZWNJ→ا'],
];

for (const [corrupted, why] of OBSERVED) {
  const out = applyTypoAliases(corrupted).trim();
  check(`repair ${why}: ${corrupted}`, out === COMPOUND, `got ${JSON.stringify(out)}`);
}

// ---------- 1b) unit: clean text must not change ----------
const KEEP: string[] = [
  // the compound itself, both spellings
  COMPOUND,
  'پیشفروش',
  // other dictionary compounds
  'لوله\u200cکشی',
  'اسباب\u200cکشی',
  'لپ\u200cتاپ',
  'اجاره\u200cای',
  'برق\u200cکاری',
  'گم\u200cشده\u200cها',
  'کوتاه\u200cمدت',
  // ZWNJ-less compound spellings already in the dictionaries
  'برقکاری',
  'لولهکشی',
  // derived forms must not fold into the base
  'پیش\u200cفروشی',
  'پیشفروشی',
  'لپتاپی',
  'لوله\u200cکشیها',
  // unrelated clean words incl. ZWNJ verbs and guarded classes
  'می\u200cخوام',
  'رهن\u200cنشین\u200cام',
  'می\u200cدم',
  'اجاره',
  'میلیون',
  'کوهسنگی',
  'مشهد',
  'فروردین',
  'واحد',
  'بخرم',
];

for (const word of KEEP) {
  const out = applyTypoAliases(word).trim();
  check(`keep ${word}`, out === word, `got ${JSON.stringify(out)}`);
}

// ---------- 2) invariant: single edits never produce a third word ----------

const LETTER = 'ب';
const variants = new Set<string>();
for (let i = 0; i < COMPOUND.length; i++) {
  variants.add(COMPOUND.slice(0, i) + COMPOUND.slice(i + 1)); // delete
  variants.add(COMPOUND.slice(0, i) + LETTER + COMPOUND.slice(i)); // duplicate→insert same
  variants.add(COMPOUND.slice(0, i) + LETTER + COMPOUND.slice(i + 1)); // substitute
  if (i < COMPOUND.length - 1) {
    variants.add(
      COMPOUND.slice(0, i) + COMPOUND[i + 1]! + COMPOUND[i]! + COMPOUND.slice(i + 2) // transpose
    );
  }
}
variants.delete(COMPOUND);

for (const v of variants) {
  const out = applyTypoAliases(v).trim();
  const repaired = join(out) === join(COMPOUND);
  const untouched = out === v;
  check(`single-edit ${JSON.stringify(v)}`, repaired || untouched, `got ${JSON.stringify(out)}`);
}
}

// ---------- 3) harness: the six assigned failures ----------

async function harnessChecks(): Promise<void> {
  const ASSIGNED: Array<[string, number]> = [
    ['858', 2],
    ['860', 2],
    ['862', 0],
    ['864', 0],
    ['876', 0],
    ['877', 2],
  ];

  const byId = new Map(ALL_SMART_INTAKE_SCENARIOS.map((s) => [s.id, s]));

  for (const [id, v] of ASSIGNED) {
    const scenario = byId.get(id);
    if (!scenario) {
      check(`scenario ${id}`, false, 'missing from corpus');
      continue;
    }
    const rng = mulberry32(hashString(`deep:${id}:${v}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      check(`scenario ${id} v${v}`, false, 'no typo produced');
      continue;
    }
    const res = await evaluateScenario(scenario, typo.text);
    check(
      `eval ${id} v${v} word=${typo.word}`,
      res.ok,
      `failures: ${res.failures.join(', ')}`
    );
  }

  // ---------- 4) clean pre-sale section (corpus ids 851–880) ----------

  const presaleScenarios = ALL_SMART_INTAKE_SCENARIOS.filter(
    (s) => s.category === 'corpus-presale'
  );
  check('presale section size', presaleScenarios.length === 30, `got ${presaleScenarios.length}`);

  for (const scenario of presaleScenarios) {
    const res = await evaluateScenario(scenario, scenario.needText);
    check(`clean ${scenario.id}`, res.ok, `failures: ${res.failures.join(', ')}`);
  }
}

async function main(): Promise<void> {
  unitChecks();
  await harnessChecks();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
