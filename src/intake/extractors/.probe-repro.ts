/** TEMP probe — reproduces assigned eval-slice failures. Delete after use. */
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import {
  evaluateScenario,
  hashString,
  injectTypo,
  mulberry32,
} from '@/intake/smart-extractor/tests/typo-sim';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';

const FAILURES: Array<{ id: string; variant: number; word: string }> = [
  { id: '17', variant: 1, word: 'متر' },
  { id: '54', variant: 0, word: 'خواب' },
  { id: '68', variant: 2, word: 'خواب' },
  { id: '147', variant: 0, word: 'متر' },
  { id: '946', variant: 1, word: 'طبقه' },
  { id: '953', variant: 1, word: 'خوابه' },
  { id: '966', variant: 0, word: 'خوابه' },
];

async function main(): Promise<void> {
  const byId = new Map(ALL_SMART_INTAKE_SCENARIOS.map((s) => [s.id, s]));
  for (const f of FAILURES) {
    const scenario = byId.get(f.id);
    if (!scenario) {
      console.log(`[${f.id}] scenario not found`);
      continue;
    }
    const rng = mulberry32(hashString(`deep:${f.id}:${f.variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      console.log(`[${f.id} v${f.variant}] no typo injected`);
      continue;
    }
    const out = await evaluateScenario(scenario, typo.text);
    const normalized = normalizePersian(applyTypoAliases(typo.text));
    // show tokens around the corrupted word
    const words = typo.text.split(/\s+/);
    const idx = words.findIndex((w) => w !== scenario.needText.split(/\s+/)[words.indexOf(w)]);
    console.log(
      `[${f.id} v${f.variant}] word="${typo.word}" corrupted→ "${words.filter((w) => w.includes(typo.word.slice(0, 2)) && w !== typo.word)[0] ?? '?'}"`,
      `| ok=${out.ok}`,
      `| failures=${JSON.stringify(out.failures)}`
    );
    console.log(`   typoText: ${typo.text}`);
    console.log(`   normalized: ${normalized.slice(0, 160)}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
