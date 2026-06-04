import { formatMoneyToman, formatPriceText } from '@/lib/format/money';

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

console.log('money self-test: ok');
