import { normalizePostNaturalText } from '@/lib/need-intake/laya/post-natural-normalization';
function compactLocationLabel(v: string) {
  return normalizePostNaturalText(v).toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
}
const d = require('@/../src/data/neighborhoods/catalog/isfahan-city.json');
const candidate = compactLocationLabel('امام');
const candidateCompact = candidate.replace(/\s+/gu, '');
const hit = (d.neighborhoods as Array<{ name: string; areas?: string[] }>).some((n) =>
  [n.name, ...(n.areas ?? [])].some((label) => {
    const nl = compactLocationLabel(label);
    if (!nl) return false;
    const lc = nl.replace(/\s+/gu, '');
    return lc === candidateCompact || nl.split(' ').includes(candidate) || (candidateCompact.length >= 3 && lc.includes(candidateCompact));
  })
);
console.log('helper-would-return:', hit, 'candidate:', candidate);
