/** TEMP probe — replays ALL assigned eval-slice failures. Delete after use. */
import { ALL_SMART_INTAKE_SCENARIOS } from '@/intake/smart-extractor/tests/scenarios';
import {
  evaluateScenario,
  hashString,
  injectTypo,
  mulberry32,
} from '@/intake/smart-extractor/tests/typo-sim';

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

async function main(): Promise<void> {
  const byId = new Map(ALL_SMART_INTAKE_SCENARIOS.map((s) => [s.id, s]));
  let ok = 0;
  const stillFailing: string[] = [];
  for (const [id, variant, word] of ASSIGNED) {
    const scenario = byId.get(id);
    if (!scenario) {
      stillFailing.push(`${id} v${variant} ${word}: scenario missing`);
      continue;
    }
    const rng = mulberry32(hashString(`deep:${id}:${variant}`));
    const typo = injectTypo(scenario.needText, rng);
    if (!typo) {
      stillFailing.push(`${id} v${variant} ${word}: no typo injected`);
      continue;
    }
    const out = await evaluateScenario(scenario, typo.text);
    if (out.ok) {
      ok++;
    } else {
      stillFailing.push(
        `${id} v${variant} word="${typo.word}" → ${JSON.stringify(out.failures)} | "${typo.text}"`
      );
    }
  }
  console.log(`\nreplayed ${ASSIGNED.length}: ok=${ok}, stillFailing=${stillFailing.length}`);
  for (const f of stillFailing) console.log('  ✗ ' + f);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
