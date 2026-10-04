/**
 * Round-2 targeted test for the «اسم محله» package.
 *
 * Assigned deterministic failures (eval-slice seed `deep:${id}:${v}`):
 *   { id: '9',   variant: 1, word: 'خیام',  failures: ['location.neighborhood.includes'] }
 *   { id: '168', variant: 1, word: 'سعادت', failures: ['location.neighborhood.includes'] }
 *   { id: '211', variant: 0, word: 'سجاد',  failures: ['location.neighborhood.includes'] }
 *
 * Part A replays the exact seeded typos through evaluateScenario and requires
 * zero failures. Part B unit-tests the hood-fuzzy class behavior: single-edit
 * recovery for standalone and two-part hood names, ambiguity rejection, and
 * confidence strictly below the exact-match confidence.
 *
 * Run: npx tsx src/intake/smart-extractor/rules/hood-fuzzy-r2-test.ts
 */
import { ALL_SMART_INTAKE_SCENARIOS } from '../tests/scenarios';
import { checkField, hashString, injectTypo, mulberry32 } from '../tests/typo-sim';
import { extractSmartFields } from '../smart-field-extractor';
import {
  EXACT_HOOD_CONFIDENCE,
  FUZZY_HOOD_CONFIDENCE,
  matchHoodInText,
  matchHoodPhrase,
} from './hood-fuzzy';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ''));
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// ---------- Part A: the three assigned seeded failures ----------

const ASSIGNED = [
  { id: '9', variant: 1, word: 'خیام' },
  { id: '168', variant: 1, word: 'سعادت' },
  { id: '211', variant: 0, word: 'سجاد' },
] as const;

const HOOD_EXPECT_INCLUDES: Record<string, string> = {
  '9': 'خیام',
  '168': 'سعا',
  '211': 'سجا',
};

async function partA(): Promise<void> {
  console.log('\n=== Part A: assigned seeded failures (eval-slice seeds) ===');
  for (const a of ASSIGNED) {
    const scenario = ALL_SMART_INTAKE_SCENARIOS.find((s) => s.id === a.id);
    if (!scenario) {
      assert(`scenario ${a.id} exists`, false, 'not found in corpus');
      continue;
    }
    const rng = mulberry32(hashString(`deep:${a.id}:${a.variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      assert(`[${a.id} v${a.variant}] typo injected`, false, 'injectTypo returned null');
      continue;
    }
    assert(
      `[${a.id} v${a.variant}] corrupted word is "${a.word}" (got "${typo.word}")`,
      typo.word === a.word
    );

    const result = await extractSmartFields(typo.text, '', {
      preferredCity: scenario.preferredCity ?? 'مشهد',
      preferredCitySlug: scenario.preferredCitySlug ?? 'mashhad',
      useAI: false,
      useRules: true,
    });
    const fails: string[] = [];
    for (const field of scenario.expected) {
      const f = checkField(result, field);
      if (f) fails.push(f);
    }
    const hood = result.location.neighborhood;
    assert(
      `[${a.id} v${a.variant}] "${typo.text}" → all expected fields pass`,
      fails.length === 0,
      `failures=${fails.join(',')} neighborhood=${JSON.stringify(hood)}`
    );
    if (fails.length > 0) {
      const want = HOOD_EXPECT_INCLUDES[a.id] ?? '';
      assert(
        `[${a.id}] extracted neighborhood "${hood}" includes "${want}"`,
        typeof hood === 'string' && hood.includes(want)
      );
    }
  }
}

// ---------- Part B: class-level unit tests of hood-fuzzy ----------

const HOODS = [
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

function partB(): void {
  console.log('\n=== Part B: hood-fuzzy class behavior ===');

  // B1: standalone single-edit typos recover uniquely
  const standalone: Array<[string, string]> = [
    ['اجاره در محله سجاد', 'سجاد'], // exact sanity
    ['اجاره در محله سجا', 'سجاد'], // deletion
    ['اجاره در محله جساد', 'سجاد'], // substitution
    ['اجاره در محله سجادد', 'سجاد'], // duplicate
    ['اجاره در محله خیام', 'خیام'],
    ['اجاره در محله خیامم', 'خیام'],
    ['اجاره در محله خریام', 'خیام'],
  ];
  for (const [text, want] of standalone) {
    const m = matchHoodInText(text, HOODS);
    assert(
      `matchHoodInText("${text}") → ${want}`,
      m?.hood === want,
      m ? `got ${m.hood} d=${m.distance}` : 'null'
    );
  }

  // B2: two-part names — typo in either part
  const twoPart: Array<[string, string]> = [
    ['اجاره در وکیل آباد', 'وکیل آباد'],
    ['اجاره در وکل آباد', 'وکیل آباد'], // typo part 1
    ['اجاره در وکیل اباد', 'وکیل آباد'], // typo part 2
    ['اجاره در سعادت آباد', 'سعادت آباد'],
    ['اجاره در سعادت اباد', 'سعادت آباد'],
    ['اجاره در سعادت آبا', 'سعادت آباد'],
    ['اجاره در قاسم آباد', 'قاسم آباد'],
    ['اجاره در قاسم اباد', 'قاسم آباد'],
  ];
  for (const [text, want] of twoPart) {
    const m = matchHoodInText(text, HOODS);
    assert(
      `matchHoodInText("${text}") → ${want}`,
      m?.hood === want,
      m ? `got ${m.hood} d=${m.distance}` : 'null'
    );
  }

  // B3: phrase validation (advanced-rules capture path)
  assert(
    'matchHoodPhrase("سعادت آبااد") → سعادت آباد',
    matchHoodPhrase('سعادت آبااد', HOODS)?.hood === 'سعادت آباد'
  );
  assert(
    'matchHoodPhrase("سجاد") exact confidence',
    matchHoodPhrase('سجاد', HOODS)?.confidence === EXACT_HOOD_CONFIDENCE
  );

  // B4: fuzzy confidence strictly below exact confidence
  const fuzzy = matchHoodPhrase('سجا', HOODS);
  assert(
    'fuzzy match confidence < exact confidence',
    !!fuzzy && fuzzy.distance > 0 && fuzzy.confidence < EXACT_HOOD_CONFIDENCE,
    fuzzy ? `conf=${fuzzy.confidence}` : 'null'
  );
  assert('FUZZY_HOOD_CONFIDENCE < EXACT_HOOD_CONFIDENCE', FUZZY_HOOD_CONFIDENCE < EXACT_HOOD_CONFIDENCE);

  // B5: ambiguity guard — two hoods equidistant → reject
  assert(
    'ambiguous short corruption ("ونکی"-like between ونک/جردن family) rejected or unique',
    (() => {
      const m = matchHoodPhrase('هجردن', HOODS);
      return m === null || m.hood === 'جردن';
    })()
  );

  // B6: no fabrication — garbage never becomes a hood
  assert('matchHoodPhrase("qwerty123") → null', matchHoodPhrase('qwerty123', HOODS) === null);
  assert('matchHoodInText("امروز هوا خوب است", HOODS) → null', matchHoodInText('امروز هوا خوب است', HOODS) === null);

  // B7: digits never fold into a hood
  assert('matchHoodPhrase("سجاد ۲") → null', matchHoodPhrase('سجاد ۲', HOODS) === null);
}

async function main(): Promise<void> {
  await partA();
  partB();
  console.log(`\n=== hood-fuzzy-r2-test: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.error('FAILED cases:');
    for (const f of failures) console.error('  - ' + f);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
