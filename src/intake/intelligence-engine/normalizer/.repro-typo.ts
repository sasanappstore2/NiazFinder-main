import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import { evaluateScenario, hashString, injectTypo, mulberry32 } from '@/intake/smart-extractor/tests/typo-sim';

async function main(): Promise<void> {
  const targets = new Set(['858','860','862','864','876','877']);
  for (const s of ALL_SMART_INTAKE_SCENARIOS) {
    if (!targets.has(s.id)) continue;
    for (const v of [0,1,2]) {
      const rng = mulberry32(hashString(`deep:${s.id}:${v}`));
      const typo = injectTypo(s.needText, rng);
      if (!typo) continue;
      if (typo.word !== 'پیش‌فروش') continue;
      const on = await evaluateScenario(s, typo.text);
      console.log(JSON.stringify({ id: s.id, v, ok: on.ok, failures: on.failures }));
      const a = s.needText.split(' '); const b = typo.text.split(' ');
      for (let i=0;i<a.length;i++) if (a[i]!==b[i]) {
        console.log(`  word[${i}]: "${a[i]}" (${[...a[i]!].map(c=>c.codePointAt(0)!.toString(16)).join(' ')}) -> "${b[i]}" (${[...b[i]!].map(c=>c.codePointAt(0)!.toString(16)).join(' ')})`);
      }
    }
  }
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});
