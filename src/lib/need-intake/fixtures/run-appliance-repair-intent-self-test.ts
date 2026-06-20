import {
  detectRepairServiceCategory,
  isHomeApplianceProductTransaction,
} from '@/lib/need-intake/service-repair-intent';

let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('FAIL:', msg);
    failed++;
  }
}

const SELL_FRIDGE = '\u0641\u0631\u0648\u0634 \u06CC\u062E\u0686\u0627\u0644 \u062F\u0631 \u062A\u0647\u0631\u0627\u0646 \u062F\u0631 \u062D\u062F\u0648\u062F \u0639\u0627\u0644\u06CC';
const BROKEN_FRIDGE =
  '\u06CC\u062E\u0686\u0627\u0644 \u06AF\u0627\u0632 \u062F\u0627\u062F\u0647 \u0646\u06CC\u0627\u0632 \u0628\u0647 \u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u062A\u0647\u0631\u0627\u0646';
const BUY_MOTO =
  '\u0646\u06CC\u0627\u0632 \u0628\u0647 \u0645\u0648\u062A\u0648\u0631\u0633\u06CC\u06A9\u0644\u062A \u062F\u0631 \u062A\u0647\u0631\u0627\u0646 \u0647\u0645\u06CC\u0646 \u0647\u0641\u062A\u0647';
const VEHICLE_REPAIR =
  '\u0645\u0646 \u06CC\u06A9 \u062A\u0639\u0645\u06CC\u0631\u06A9\u0627\u0631 \u062E\u0648\u062F\u0631\u0648 \u0645\u06CC\u062E\u0648\u0627\u0645 \u0628\u0631\u0627\u06CC \u067E\u0698\u0648 \u06F2\u06F0\u06F7 \u062E\u0648\u062F\u0645 \u0645\u0648\u062A\u0648\u0631\u0634 \u0645\u0634\u06A9\u0644 \u062F\u0627\u0631\u0647';

assert(isHomeApplianceProductTransaction(SELL_FRIDGE), 'sell fridge is product transaction');
assert(detectRepairServiceCategory(SELL_FRIDGE) === null, 'sell fridge not repair');
assert(
  detectRepairServiceCategory(BROKEN_FRIDGE) === 'refrigerator-repair',
  'broken fridge is repair'
);
assert(detectRepairServiceCategory(BUY_MOTO) === null, 'buy motorcycle not repair');
assert(detectRepairServiceCategory(VEHICLE_REPAIR) === 'vehicle-repair', 'vehicle repair');

if (failed > 0) process.exit(1);
console.log('appliance-repair intent self-test: OK');
