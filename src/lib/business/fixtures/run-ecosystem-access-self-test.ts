/**
 * Self-test: owner-access predicate shared by the matching-insights and
 * request-hub routes (audit fix C3 — public id is userId, not profile id).
 * Run: npx --yes tsx src/lib/business/fixtures/run-ecosystem-access-self-test.ts
 */
import { isOwnerByPublicId } from '@/lib/business/ecosystem/owner-access';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

const profile = { id: 'profile_cuid_123', userId: 'user_abc' };

// Owner viewing their own profile: URL id is the userId → allowed.
assert(isOwnerByPublicId(profile, 'user_abc'), 'owner access granted when publicId === userId');

// Regression for C3: comparing against the profile cuid must FAIL (the old bug).
assert(!isOwnerByPublicId(profile, 'profile_cuid_123'), 'profile cuid is NOT the public id (regression)');

// Non-owner / unknown ids rejected.
assert(!isOwnerByPublicId(profile, 'user_other'), 'different user rejected');
assert(!isOwnerByPublicId(null, 'user_abc'), 'null profile rejected');
assert(!isOwnerByPublicId(undefined, 'user_abc'), 'undefined profile rejected');
assert(!isOwnerByPublicId(profile, ''), 'empty publicId rejected');

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: ecosystem owner-access self-test passed (matching-insights + request-hub share this predicate)');
