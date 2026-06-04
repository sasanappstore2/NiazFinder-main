import { slugifyBlogTitle } from '@/lib/blog/slug';

let failed = 0;
function assert(c: boolean, m: string) {
  if (!c) {
    console.error(`FAIL: ${m}`);
    failed++;
  }
}

assert(slugifyBlogTitle('  Hello World  ') === 'hello-world', 'ascii slug');
assert(slugifyBlogTitle('') === '', 'empty');

if (failed) process.exit(1);
console.log('OK: blog slug self-test passed');
