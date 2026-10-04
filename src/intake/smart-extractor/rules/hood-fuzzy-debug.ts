/** TEMP debug — why does the matcher fail/misfire on these? */
import { matchHoodInText } from './hood-fuzzy';
import { ALL_SMART_INTAKE_SCENARIOS } from '../tests/scenarios';
import { hashString, injectTypo, mulberry32 } from '../tests/typo-sim';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { osaDistanceBounded } from '@/intake/intelligence-engine/normalizer/fuzzy-corrector';

const HOODS: readonly string[] = [
  'سجاد', 'احمدآباد', 'وکیل آباد', 'کوهسنگی', 'قاسم آباد', 'الهیه', 'نیاوران',
  'ونک', 'جردن', 'زعفرانیه', 'پاسداران', 'فرمانیه', 'تجریش', 'سعادت آباد',
  'شهرک غرب', 'فردوسی', 'بنفشه', 'خیام', 'امامت', 'امام رضا', 'ابن سینا', 'حرم',
];

function hitsFor(text: string, list: readonly string[]): string {
  const normalized = normalizePersian(text);
  const tokens = normalized.split(' ');
  const out: string[] = [];
  for (const hood of list) {
    const hn = normalizePersian(hood);
    const parts = hn.split(' ');
    const phraseLen = parts.join('').length;
    const maxD = phraseLen >= 7 ? 2 : 1;
    for (let k = 1; k <= Math.min(3, parts.length); k++) {
      for (let i = 0; i + k <= tokens.length; i++) {
        const w = tokens.slice(i, i + k);
        if (w.some((t) => t.length < 3 || /[\d\u06F0-\u06F9]/.test(t))) continue;
        const cand = w.join(' ');
        if (Math.abs(cand.length - hn.length) > maxD) continue;
        const d = osaDistanceBounded(cand, hn, maxD);
        if (d <= maxD) out.push(`${hood} ← "${cand}" d=${d}`);
      }
    }
  }
  return out.join(' | ');
}

for (const id of ['22', '97']) {
  const s = ALL_SMART_INTAKE_SCENARIOS.find((x) => x.id === id)!;
  const norm = normalizePersian(applyTypoAliases(s.needText));
  console.log(`\n[id ${id}] ${s.needText.slice(0, 80)}`);
  console.log(`  norm: ${norm.slice(0, 100)}`);
  console.log(`  hits: ${hitsFor(s.needText, HOODS)}`);
}

const s211 = ALL_SMART_INTAKE_SCENARIOS.find((x) => x.id === '211')!;
const rng = mulberry32(hashString('deep:211:0'));
const typo = injectTypo(s211.needText, rng)!;
console.log(`\n[211 v0] clean: ${s211.needText}`);
console.log(`[211 v0] typo:  ${typo.text} (word=${typo.word})`);
console.log(`  hits on typo text: ${hitsFor(typo.text, HOODS)}`);
const corrupted = normalizePersian(applyTypoAliases(typo.text)).split(' ').find((t) => !normalizePersian(s211.needText).split(' ').includes(t));
console.log(`  corrupted token: ${corrupted}`);
if (corrupted) {
  for (const hood of HOODS) {
    const hn = normalizePersian(hood);
    const d = osaDistanceBounded(corrupted, hn, 2);
    if (d <= 2) console.log(`    vs ${hood}: d=${d}`);
  }
}
