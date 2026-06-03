import {
  formatIranMobileDisplay,
  normalizeIranMobile,
  toAsciiDigits,
  toPersianDigits,
} from '@/lib/format/digits';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(toAsciiDigits('۰۹۱۲۳۴۵۶۷۸۹') === '09123456789', 'Persian phone digits');
assert(toAsciiDigits('٠٩١٢٣٤٥٦٧٨٩') === '09123456789', 'Arabic-Indic phone digits');
assert(toAsciiDigits('09 12-34') === '091234', 'strip separators');
assert(toPersianDigits('0912') === '۰۹۱۲', 'toPersianDigits');
assert(normalizeIranMobile('۰۹۱۲۳۴۵۶۷۸۹') === '09123456789', 'normalize Persian');
assert(normalizeIranMobile('9123456789') === '09123456789', 'normalize 10-digit');
assert(normalizeIranMobile('989123456789') === '09123456789', 'normalize 98 prefix');
assert(normalizeIranMobile('123') === null, 'invalid short');
assert(
  formatIranMobileDisplay('09123456789').includes('۰۹۱۲'),
  'mobile display Persian'
);

console.log('digits self-test: ok');
