/** Scratch bucketing repro — will be deleted. Seed formula: deep:${id}:${v} */
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import { evaluateScenario, getPath, hashString, injectTypo, mulberry32 } from '@/intake/smart-extractor/tests/typo-sim';
import { extractSmartFields } from '@/intake/smart-extractor/smart-field-extractor';

const RAW = '62:1 65:1 73:0 97:0 97:1 98:1 231:2 234:2 242:0 242:2 247:1 259:0 263:0 266:0 270:2 273:1 274:1 277:2 288:0 288:1 289:1 298:2 323:1 325:0 332:0 333:1 341:0 342:2 347:0 348:2 354:0 355:1 357:2 361:1 363:2 373:0 377:1 389:1 390:0 394:0 394:2 588:2 675:1 677:1 680:2 687:1 690:2 691:1 702:0 704:0 709:0 711:2 718:0 718:2 719:1 721:0 724:0 724:2 726:1 729:0 730:0 731:0 732:0 735:0 739:2 740:0 740:1 746:1 747:1 749:1 749:2 751:2 752:1 757:0 757:2 759:0 759:2 760:2 761:0 762:0 762:2 763:2 765:2 766:2 767:1 767:2 768:1 769:1 802:1 802:2 803:2 804:1 806:2 807:1 821:1 824:0 833:0 837:2 855:0 858:0 860:1 863:0 865:2 868:1 875:1 876:1 877:0 879:1 880:1 963:1 987:0 988:0';
const FAILS: Array<[string, string]> = RAW.split(' ').map((p) => p.split(':') as [string, string]);

async function main() {
  const buckets = new Map<string, string[]>();
  for (const [id, v] of FAILS) {
    const scenario = ALL_SMART_INTAKE_SCENARIOS.find((s) => s.id === id);
    if (!scenario) { console.log(`id ${id} NOT FOUND`); continue; }
    const rng = mulberry32(hashString(`deep:${scenario.id}:${v}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) { console.log(`${id} v${v}: no typo`); continue; }
    const res = await evaluateScenario(scenario, typo.text);
    const tx = getPath(res, 'transaction.type');
    const full = await extractSmartFields(typo.text, '', {
      preferredCity: scenario.preferredCity ?? 'مشهد',
      preferredCitySlug: scenario.preferredCitySlug ?? 'mashhad',
      useAI: false, useRules: true,
    });
    const key = [
      (typo.word || '').replace(/[،,]/g, ''),
      `tx=${tx}`,
      res.failures.join('&'),
    ].join(' | ');
    const arr = buckets.get(key) ?? [];
    arr.push(`[${id} v${v}] "${typo.text}"  RULES=${full.trace?.rulesUsed.filter((r) => !r.includes('neighborhood') && !r.includes('multi_')).join(',')}`);
    buckets.set(key, arr);
  }
  for (const [k, arr] of buckets) {
    console.log(`\n### BUCKET (${arr.length}): ${k}`);
    for (const line of arr.slice(0, 3)) console.log('  ' + line);
  }
}
main();
