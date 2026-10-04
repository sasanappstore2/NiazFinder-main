import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import { hashString, injectTypo, mulberry32 } from '@/intake/smart-extractor/tests/typo-sim';

const IDS = ['62','65','323','325','332','333','341','342','347','348','354','355','357','361','363','373','377','389','390','394','73','821','588','802','806'];
for (const id of IDS) {
  const s = ALL_SMART_INTAKE_SCENARIOS.find((x) => x.id === id);
  if (!s) { console.log(`${id}: NOT FOUND`); continue; }
  const variants: string[] = [];
  for (let v = 0; v < 3; v++) {
    const rng = mulberry32(hashString(`deep:${s.id}:${v}`));
    const t = injectTypo(s.needText, rng);
    if (t) variants.push(`v${v}:«${t.word}»→${t.text}`);
  }
  console.log(`[${id}] clean="${s.needText}"`);
  console.log(`   expected: ${s.expected.map((e) => JSON.stringify(e)).join(' | ')}`);
}
