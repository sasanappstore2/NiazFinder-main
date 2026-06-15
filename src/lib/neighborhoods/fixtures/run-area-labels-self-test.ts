import assert from 'node:assert/strict';
import {
  displayAreaLabels,
  isSyntheticAreaLabel,
  searchAreaLabels,
} from '@/lib/neighborhoods/area-labels';

const TABRISI = '\u0637\u0628\u0631\u0633\u06CC';
const AZAD = '\u0622\u0632\u0627\u062F\u0634\u0647\u0631';
const MADRAS = '\u0645\u062F\u0631\u0633';
const FARHANG = '\u0641\u0631\u0647\u0646\u06AF';
const SHOMAL = '\u0634\u0645\u0627\u0644';
const MARKAZI = '\u0645\u0631\u06A9\u0632\u06CC';
assert.equal(isSyntheticAreaLabel(`${SHOMAL} ${TABRISI}`, TABRISI), true);
assert.equal(isSyntheticAreaLabel(`${TABRISI} ${MARKAZI}`, TABRISI), true);
assert.equal(isSyntheticAreaLabel('\u0628\u0644\u0648\u0627\u0631 \u0627\u0628\u0648\u0630\u0631', '\u0627\u0628\u0648\u0630\u0631'), false);
assert.equal(isSyntheticAreaLabel(MADRAS, AZAD), false);

const mixed = [MADRAS, `${SHOMAL} ${AZAD}`, FARHANG, `${AZAD} ${MARKAZI}`];
assert.deepEqual(displayAreaLabels(mixed, AZAD), [MADRAS, FARHANG]);
assert.ok(searchAreaLabels(mixed, AZAD).includes(MADRAS));

console.log('[ok] area-labels self-test');
