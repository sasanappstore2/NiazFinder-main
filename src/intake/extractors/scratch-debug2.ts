import { extractPropertyMoneyFromText } from '@/lib/need-intake/parse-persian-amount';
import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import { extractTransactionType } from '@/intake/extractors/transactionExtractor';
import { hasExplicitRahnAndRentAmounts, textHasRahnSignal, textHasRentSignal } from '@/lib/need-intake/deal-type-helpers';

const t = 'ودیعه 200 میلیون و اجاره 10 میلیون ماهانه';
console.log('money   :', JSON.stringify(extractPropertyMoneyFromText(t)));
console.log('slots   :', JSON.stringify(extractPropertySlotsFromText(t)));
console.log('hasExpl :', hasExplicitRahnAndRentAmounts(t), 'rahnSig:', textHasRahnSignal(t), 'rentSig:', textHasRentSignal(t));
console.log('tx      :', JSON.stringify(extractTransactionType(t)));
