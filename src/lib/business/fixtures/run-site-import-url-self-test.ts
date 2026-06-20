/**
 * Run: npx --yes tsx src/lib/business/fixtures/run-site-import-url-self-test.ts
 */
import { validateImportUrl } from '../site-import/validate-url';

let failed = 0;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

async function run() {
  const empty = await validateImportUrl('');
  assert(empty.ok === false, 'empty url rejected');

  const localhost = await validateImportUrl('http://localhost/shop');
  assert(localhost.ok === false, 'localhost blocked');

  const loopback = await validateImportUrl('http://127.0.0.1');
  assert(loopback.ok === false, '127.0.0.1 blocked');

  const privateIp = await validateImportUrl('http://192.168.0.1');
  assert(privateIp.ok === false, '192.168.x blocked');

  const normalized = await validateImportUrl('tizkharid.com');
  assert(normalized.ok === true, 'public domain normalizes');
  if (normalized.ok) {
    assert(normalized.url.startsWith('https://'), 'adds https scheme');
  }

  const example = await validateImportUrl('https://example.com');
  assert(example.ok === true, 'example.com allowed');
}

void run()
  .then(() => {
    if (failed === 0) {
      console.log('OK: site-import URL self-test passed');
    } else {
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error('FAIL: unexpected error', e);
    process.exit(1);
  });
