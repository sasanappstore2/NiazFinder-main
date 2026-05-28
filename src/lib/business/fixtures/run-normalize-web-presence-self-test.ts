/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-normalize-web-presence-self-test.ts
 */
import {
  normalizeBaleUrl,
  normalizeInstagramUrl,
  normalizeTelegramUrl,
  normalizeWebsiteUrl,
} from '../normalize-web-presence';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

assert(normalizeWebsiteUrl('tizkharid.com') === 'https://tizkharid.com', 'bare domain');
assert(
  normalizeWebsiteUrl('www.tizkharid.com') === 'https://www.tizkharid.com',
  'www domain'
);
assert(
  normalizeWebsiteUrl('https://tizkharid.com/') === 'https://tizkharid.com',
  'strip trailing slash'
);
assert(normalizeInstagramUrl('@shop') === 'https://instagram.com/shop', 'instagram handle');
assert(normalizeTelegramUrl('t.me/mychannel') === 'https://t.me/mychannel', 'telegram');
assert(normalizeBaleUrl('ble.ir/myshop') === 'https://ble.ir/myshop', 'bale');

if (failed === 0) {
  console.log('OK: normalize web presence self-test passed');
} else {
  process.exit(1);
}
