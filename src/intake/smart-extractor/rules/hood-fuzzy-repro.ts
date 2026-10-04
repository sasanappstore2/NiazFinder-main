/** TEMP repro — deleted before finishing. Reproduces assigned typo failures deterministically. */
import { ALL_SMART_INTAKE_SCENARIOS } from '../tests/scenarios';
import { evaluateScenario, hashString, injectTypo, mulberry32 } from '../tests/typo-sim';

const FAILURES: Array<{ id: string; variant: number; word: string; failures: string[] }> = [
  { id: '3', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '6', variant: 2, word: 'الهیه', failures: ['location.neighborhood.includes'] },
  { id: '7', variant: 1, word: 'کوهسنگی', failures: ['location.neighborhood.includes'] },
  { id: '10', variant: 2, word: 'بنفشه', failures: ['location.neighborhood.includes', 'disambiguation'] },
  { id: '13', variant: 1, word: 'زعفرانیه', failures: ['location.neighborhood.includes'] },
  { id: '101', variant: 0, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '107', variant: 1, word: 'فردوسی', failures: ['location.neighborhood.includes'] },
  { id: '108', variant: 1, word: 'آباد', failures: ['location.neighborhood.includes'] },
  { id: '108', variant: 2, word: 'سعادت', failures: ['location.neighborhood.includes'] },
  { id: '109', variant: 0, word: 'خیام', failures: ['location.neighborhood.includes'] },
  { id: '113', variant: 1, word: 'وکیل', failures: ['location.neighborhood.includes'] },
  { id: '122', variant: 2, word: 'جردن', failures: ['location.neighborhood.includes'] },
  { id: '155', variant: 0, word: 'قاسم', failures: ['location.neighborhood.includes'] },
  { id: '201', variant: 0, word: 'سجاد', failures: ['location.neighborhood.includes'] },
  { id: '218', variant: 2, word: 'سعادت', failures: ['location.neighborhood.includes'] },
];

async function main(): Promise<void> {
  for (const f of FAILURES) {
    const scenario = ALL_SMART_INTAKE_SCENARIOS.find((s) => s.id === f.id);
    if (!scenario) {
      console.log(`[${f.id}] scenario not found`);
      continue;
    }
    const rng = mulberry32(hashString(`deep:${f.id}:${f.variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      console.log(`[${f.id} v${f.variant}] injectTypo returned null`);
      continue;
    }
    const wordOk = typo.word === f.word ? 'word=OK' : `word=MISMATCH(${typo.word})`;
    const out = await evaluateScenario(scenario, typo.text);
    const status = out.ok ? 'NOW-PASSES' : `fails:${out.failures.join(',')}`;
    console.log(`[${f.id} v${f.variant}] ${wordOk} | ${status}`);
    console.log(`    text: ${typo.text.slice(0, 90)}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
