import { applyTypoAliases } from '@/intake/intelligence-engine/normalizer/typo-aliases';
import { normalizePersian } from '@/intake/normalizer/normalizePersian';
import { extractPropertyMoneyFromText, moneyMentionsInText, findKeywordIndicesWithFuzzyRepair } from '@/lib/need-intake/parse-persian-amount';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { extractTransactionType } from '@/intake/extractors/transactionExtractor';

const raw = 'اجاره آپارتمان در ردن، آسانسور، 15 میلیون اجاره';
const afterAliases = applyTypoAliases(raw);
const norm = normalizePersian(afterAliases);
console.log('afterAliases:', JSON.stringify(afterAliases));
console.log('norm        :', JSON.stringify(norm));
console.log('money(norm): ', JSON.stringify(extractPropertyMoneyFromText(norm)));
console.log('mentions(raw):', JSON.stringify(moneyMentionsInText(raw)));
console.log('money(raw)  :', JSON.stringify(extractPropertyMoneyFromText(raw)));
console.log('slots(raw)  :', JSON.stringify(extractPropertySlotsFromText(raw)));
console.log('rahnHit(norm):', JSON.stringify(findKeywordIndicesWithFuzzyRepair(norm, 'رهن')));
console.log('tx(norm)    :', JSON.stringify(extractTransactionType(norm)));
