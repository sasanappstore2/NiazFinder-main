import {
  formatDeliveryDeadlineLabel,
  whenToDeliveryDays,
  whenToUrgency,
} from '@/lib/need-intake/intake-timing-options';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const WEEK = '\u062A\u0627 \u06CC\u06A9 \u0647\u0641\u062A\u0647';
const URGENT = '\u0641\u0648\u0631\u06CC';

assert(whenToDeliveryDays('today') === 1, 'today -> 1 day');
assert(whenToDeliveryDays('week') === 7, 'week -> 7 days');
assert(whenToUrgency('today') === 'URGENT', 'today -> URGENT');
assert(whenToUrgency('flexible') === 'LOW', 'flexible -> LOW');

const DAY = '\u0631\u0648\u0632';

assert(formatDeliveryDeadlineLabel({ when: 'week' }) === WEEK, 'format when label');
assert(
  formatDeliveryDeadlineLabel({ deliveryTime: 14 }).includes(DAY),
  'format delivery days'
);
assert(formatDeliveryDeadlineLabel({ priority: 'URGENT' }) === URGENT, 'format priority fallback');

console.log('intake-timing-options self-test OK');
