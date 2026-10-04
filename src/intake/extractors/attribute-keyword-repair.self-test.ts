/**
 * Targeted self-test for the attribute-keyword repair class (خواب/خوابه/متر/طبقه).
 *
 * Failure class: a single-edit typo INSIDE an attribute keyword (مت، تمر، خاب،
 * عخوابه، خواابه، طبه، واب) is not fixed by the upstream fuzzy corrector
 * (tokens <3 chars are skipped, 3-letter tokens only take same-length fixes,
 * «خوابه» is not in its vocab), so the rooms/area/floor rules miss it.
 *
 * Fix under test: repairAttributeKeywords() — a context-anchored repair rule
 * that rewrites a token only when it is an unambiguous OSA-distance-1 variant
 * of exactly one keyword family AND sits next to a number/ordinal.
 *
 * Run: npx tsx src/intake/extractors/attribute-keyword-repair.self-test.ts
 */
import { applyAdvancedRules } from '@/intake/smart-extractor/rules/advanced-rules-engine';
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import {
  evaluateScenario,
  hashString,
  injectTypo,
  mulberry32,
} from '@/intake/smart-extractor/tests/typo-sim';
import {
  extractArea,
  extractRooms,
  repairAttributeKeywords,
} from './attributeExtractors';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail !== undefined ? ` — got ${JSON.stringify(detail)}` : ''}`);
  }
}

// ---------- 1. repairAttributeKeywords: corrupted keyword forms ----------

console.log('\n[1] corrupted keyword forms are repaired (context-anchored)');
const REPAIR_CASES: Array<[string, string]> = [
  // rooms family (digit / word-number anchor)
  ['آپارتمان 2 خاب 90 متر اجاره', 'آپارتمان 2 خواب 90 متر اجاره'],
  ['خونه 1 خواابه میخوام', 'خونه 1 خوابه میخوام'],
  ['خونه 3 عخوابه میخوام', 'خونه 3 خوابه میخوام'],
  ['دو خواو برای اجاره', 'دو خواب برای اجاره'],
  // upstream-corrector collision: واب (خواب minus خ) folded into وام
  ['خرید آپارتمان 4 واب با بودجه 8 میلیارد', 'خرید آپارتمان 4 خواب با بودجه 8 میلیارد'],
  // area family
  ['ویلا 300 مت بنا در 500 متر زمین', 'ویلا 300 متر بنا در 500 متر زمین'],
  ['آپارتمان 3 خواب 90 تمر برای اجاره', 'آپارتمان 3 خواب 90 متر برای اجاره'],
  ['زمین مترا 300 در کردان', 'زمین متراژ 300 در کردان'],
  ['90 متری در سجاد', '90 متری در سجاد'], // exact keyword — untouched
  // floor family
  ['آپارتمان طبه 1 از 4 طبقه', 'آپارتمان طبقه 1 از 4 طبقه'],
  ['آپارتمان 4 طبق با نورگیر', 'آپارتمان 4 طبقه با نورگیر'],
  // glued-digit forms («3خوااب» = scenario-31 class) — digits stay, letters repaired
  ['اپارتمان 3خوااب دروکیل اباد مشهد', 'اپارتمان 3خواب دروکیل اباد مشهد'],
  ['ویلا 300مت بنا در 500 متر زمین', 'ویلا 300متر بنا در 500 متر زمین'],
  ['خونه 2خوابه میخوام اجاره', 'خونه 2خوابه میخوام اجاره'], // clean glued — untouched
];
for (const [input, expected] of REPAIR_CASES) {
  const got = repairAttributeKeywords(input);
  check(`repair("${input}")`, got === expected, got);
}

// ---------- 2. repairAttributeKeywords: clean text is never touched ----------

console.log('\n[2] clean/ambiguous text passes through unchanged');
const UNTOUCHED = [
  'آپارتمان 2 خواب 90 متر طبقه 3 از 5 برای اجاره',
  'خونه 3 خوابه میخوام اجاره نیاوران',
  'اجاره تا 13 مهر در سجاد', // calendar word + digits must never fold to متر
  'خرید با وام 200 میلیونی در ونک', // loan amount after the word — untouched
  'طبق ماده 5 قانون', // طبق without digit adjacency — untouched
  'در 500 متر زمین',
];
for (const text of UNTOUCHED) {
  const got = repairAttributeKeywords(text);
  check(`untouched("${text}")`, got === text, got);
}

// ---------- 3. extractors on corrupted input ----------

console.log('\n[3] extractors survive corrupted keywords');
check(
  'extractArea: «ویلا 300 مت بنا در 500 متر زمین» → 300 (earliest mention wins)',
  extractArea('ویلا 300 مت بنا در 500 متر زمین در کردان').value === 300,
  extractArea('ویلا 300 مت بنا در 500 متر زمین در کردان')
);
check(
  'extractArea: «3 خواب 90 تمر» → 90',
  extractArea('آپارتمان 3 خواب 90 تمر برای اجاره در فردوسی مشهد').value === 90,
  extractArea('آپارتمان 3 خواب 90 تمر برای اجاره در فردوسی مشهد')
);
check(
  'extractRooms: «2 خاب» → 2',
  extractRooms('آپارتمان 2 خاب 90 متر اجاره در مرکز اهواز').value === 2,
  extractRooms('آپارتمان 2 خاب 90 متر اجاره در مرکز اهواز')
);
check(
  'extractRooms: «3 عخوابه» → 3',
  extractRooms('خونه 3 عخوابه میخوام اجاره امامت').value === 3,
  extractRooms('خونه 3 عخوابه میخوام اجاره امامت')
);
check(
  'extractRooms: «1 خواابه» → 1',
  extractRooms('خونه 1 خواابه میخوام اجاره نیاوران').value === 1,
  extractRooms('خونه 1 خواابه میخوام اجاره نیاوران')
);
check(
  'extractRooms: glued «3خوااب» → 3',
  extractRooms('اپارتمان 3خوااب دروکیل اباد مشهد برای اجاره').value === 3,
  extractRooms('اپارتمان 3خوااب دروکیل اباد مشهد برای اجاره')
);
{
  const floor = applyAdvancedRules('آپارتمان طبه 1 از 4 طبقه برای اجاره در فرمانیه');
  check(
    'applyAdvancedRules: «طبه 1 از 4 طبقه» → floor=1, totalFloors=4',
    floor.patch.floor === 1 && floor.patch.totalFloors === 4,
    floor.patch
  );
  const clean = applyAdvancedRules('آپارتمان 2 خواب 90 متر برای اجاره در سجاد');
  check(
    'applyAdvancedRules clean: rooms=2, area=90',
    clean.patch.rooms === 2 && clean.patch.area === 90,
    clean.patch
  );
}

// ---------- 4. replay of the assigned eval-slice failures ----------

console.log('\n[4] replay of assigned eval-slice failures (seeds deep:id:variant)');
// [id, variant, corrupted word] — exactly the failures assigned to this fixer.
const ASSIGNED: Array<[string, number, string]> = [
  ['17', 1, 'متر'],
  ['54', 0, 'خواب'], ['55', 0, 'خواب'], ['68', 2, 'خواب'], ['106', 2, 'خواب'],
  ['112', 2, 'خواب'], ['116', 1, 'خواب'], ['131', 0, 'خواب'], ['132', 1, 'خواب'],
  ['147', 0, 'متر'], ['153', 1, 'خواب'], ['202', 2, 'خواب'], ['203', 0, 'متر'],
  ['203', 2, 'خواب'], ['209', 2, 'خواب'], ['212', 2, 'متر'], ['218', 0, 'متر'],
  ['233', 1, 'خواب'], ['264', 0, 'خواب'], ['269', 1, 'خواب'], ['284', 2, 'خواب'],
  ['292', 1, 'خواب'], ['306', 1, 'خواب'], ['312', 1, 'خواب'], ['317', 1, 'خواب'],
  ['404', 1, 'خواب'], ['405', 0, 'خواب'], ['407', 0, 'خواب'], ['410', 2, 'خواب'],
  ['411', 0, 'خواب'], ['413', 2, 'خواب'], ['414', 0, 'خواب'], ['417', 0, 'خواب'],
  ['424', 1, 'خواب'], ['432', 1, 'خواب'], ['442', 1, 'خواب'], ['459', 2, 'خواب'],
  ['462', 1, 'خواب'], ['477', 1, 'خواب'], ['480', 0, 'خواب'], ['594', 1, 'خواب'],
  ['595', 2, 'خواب'], ['612', 1, 'خواب'], ['893', 0, 'خواب'],
  ['946', 1, 'طبقه'],
  ['953', 1, 'خوابه'], ['955', 1, 'خوابه'], ['957', 1, 'خوابه'], ['966', 0, 'خوابه'],
  ['967', 0, 'خوابه'], ['967', 2, 'خوابه'], ['968', 1, 'خوابه'], ['970', 0, 'خوابه'],
  ['971', 1, 'خوابه'], ['972', 0, 'خوابه'], ['973', 2, 'خوابه'], ['976', 1, 'خوابه'],
  ['981', 2, 'خوابه'], ['984', 2, 'خوابه'], ['985', 1, 'خوابه'], ['986', 0, 'خوابه'],
  ['988', 1, 'خوابه'], ['989', 0, 'خوابه'], ['990', 2, 'خوابه'],
];
/**
 * Known upstream residual: the corrupted keyword is rewritten by the fuzzy
 * corrector (NOT owned here) into a different legitimate word before the
 * extractors run, and the rewrite is not context-reversible:
 *   986 v0 — «خابه» (خوابه minus و) → «خانه»; «3 خانه» can genuinely mean
 *   "three houses", so folding it back would corrupt real text.
 */
const UPSTREAM_RESIDUALS = new Set(['986:0']);

const byId = new Map(ALL_SMART_INTAKE_SCENARIOS.map((s) => [s.id, s]));
const replayFails: string[] = [];
async function replayAssigned(): Promise<void> {
  for (const [id, variant] of ASSIGNED) {
    const scenario = byId.get(id);
    if (!scenario) {
      replayFails.push(`${id} v${variant}: scenario missing`);
      continue;
    }
    const rng = mulberry32(hashString(`deep:${id}:${variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      replayFails.push(`${id} v${variant}: no typo injected`);
      continue;
    }
    const out = await evaluateScenario(scenario, typo.text);
    const key = `${id}:${variant}`;
    if (!out.ok && !UPSTREAM_RESIDUALS.has(key)) {
      replayFails.push(`${id} v${variant} word="${typo.word}" → ${out.failures.join(', ')}`);
    }
  }
}

// ---------- summary ----------

async function main(): Promise<void> {
  await replayAssigned();
  check(
    `all assigned failures fixed except documented upstream residuals (${UPSTREAM_RESIDUALS.size}/${ASSIGNED.length})`,
    replayFails.length === 0,
    replayFails.join(' | ')
  );

  console.log(`\n=== attribute-keyword repair self-test: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
  console.log('✅ targeted test passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
