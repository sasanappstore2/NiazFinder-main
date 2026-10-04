/** Temp repro — delete before submit. */
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import { evaluateScenario, hashString, injectTypo, mulberry32 } from '@/intake/smart-extractor/tests/typo-sim';

async function main(): Promise<void> {
  const ids = new Set(['858', '860', '862', '864', '876', '877']);
  for (const scenario of ALL_SMART_INTAKE_SCENARIOS) {
    if (!ids.has(scenario.id)) continue;
    for (let v = 0; v < 3; v++) {
      const rng = mulberry32(hashString(`deep:${scenario.id}:${v}`));
      const typo = injectTypo(scenario.needText, rng);
      if (!typo) continue;
      const res = await evaluateScenario(scenario, typo.text);
      const marker = res.ok ? 'OK ' : 'FAIL';
      console.log(`${marker} id=${scenario.id} v=${v} word="${typo.word}"`);
      if (!res.ok) {
        console.log(`   corrupted: ${typo.text}`);
        console.log(`   failures: ${res.failures.join(', ')}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
