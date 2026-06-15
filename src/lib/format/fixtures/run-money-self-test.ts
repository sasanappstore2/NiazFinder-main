import { formatMoneyToman, formatPriceText, formatTomanAmount } from '@/lib/format/money';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(formatPriceText('434000') === '۴۳۴٬۰۰۰', 'plain ascii price');
assert(formatPriceText('از 290000 تومان') === 'از ۲۹۰٬۰۰۰ تومان', 'price with prefix/suffix');
assert(
  formatPriceText('100000 - 200000') === '۱۰۰٬۰۰۰ - ۲۰۰٬۰۰۰',
  'price range with dash'
);
assert(formatPriceText('۲۹۰٬۰۰۰') === '۲۹۰٬۰۰۰', 'already formatted idempotent');
assert(formatPriceText('123') === '۱۲۳', 'short run Persian digits only');
assert(formatPriceText('') === '', 'empty string');
assert(formatPriceText(null) === '', 'null');
assert(formatPriceText(undefined) === '', 'undefined');
assert(formatPriceText('توافقی') === 'توافقی', 'no digits unchanged');
assert(formatMoneyToman(434000) === '۴۳۴٬۰۰۰', 'formatMoneyToman');

assert(formatTomanAmount(10_000_000) === '۱۰ میلیون تومان', '10M');
assert(formatTomanAmount(110_000_000_000) === '۱۱۰ میلیارد تومان', '110B not million');
assert(formatTomanAmount(8_000_000_000) === '۸ میلیارد تومان', '8B');
assert(formatTomanAmount(1_500_000_000_000) === '۱٫۵ همت تومان', '1.5 hemmat');
assert(formatTomanAmount(2_000_000_000_000) === '۲ همت تومان', '2 hemmat');
assert(formatTomanAmount(500_000) === '۵۰۰٬۰۰۰ تومان', 'sub-million');

console.log('money self-test: ok');
