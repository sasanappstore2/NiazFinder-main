/**
 * Self-test: ecosystem owner-PATCH Zod validation (audit fix H2).
 * Run: npx --yes tsx src/lib/business/fixtures/run-ecosystem-validation-self-test.ts
 */
import { ecosystemOwnerPatchSchema } from '@/lib/business/ecosystem/validation';

let failed = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    failed += 1;
  }
}

// ── Valid payload passes
const valid = ecosystemOwnerPatchSchema.safeParse({
  specializations: ['luxury', 'villa'],
  serviceArea: { areas: [{ city: 'تهران', neighborhood: 'سعادت‌آباد', strength: 4 }] },
  knowledge: {
    articles: [
      { id: 'a1', type: 'guide', title: 'راهنما', slug: 'guide', published: true },
    ],
  },
});
assert(valid.success, 'valid payload accepted');

// ── Unknown top-level key rejected (.strict)
assert(
  !ecosystemOwnerPatchSchema.safeParse({ hacker: true }).success,
  'unknown key rejected'
);

// ── Invalid specialization enum rejected
assert(
  !ecosystemOwnerPatchSchema.safeParse({ specializations: ['not-a-tag'] }).success,
  'invalid specialization tag rejected'
);

// ── Oversized arrays rejected (caps bound JSON growth — H1/H2)
assert(
  !ecosystemOwnerPatchSchema.safeParse({
    specializations: Array(20).fill('luxury'),
  }).success,
  'oversized specializations rejected'
);
assert(
  !ecosystemOwnerPatchSchema.safeParse({
    serviceArea: { areas: Array(500).fill({ city: 'x' }) },
  }).success,
  'oversized service areas rejected'
);

// ── Oversized article body rejected
assert(
  !ecosystemOwnerPatchSchema.safeParse({
    knowledge: {
      articles: [
        { id: 'a1', type: 'article', title: 't', slug: 's', published: true, body: 'x'.repeat(20_001) },
      ],
    },
  }).success,
  'oversized article body rejected'
);

// ── Malformed service-area strength rejected
assert(
  !ecosystemOwnerPatchSchema.safeParse({
    serviceArea: { areas: [{ city: 'تهران', strength: 9 }] },
  }).success,
  'out-of-range strength rejected'
);

// ── Invalid verification document type rejected
assert(
  !ecosystemOwnerPatchSchema.safeParse({
    verificationDocuments: [
      { id: 'd1', type: 'bogus', title: 't', fileUrl: 'u', status: 'pending', uploadedAt: 'now' },
    ],
  }).success,
  'invalid verification document type rejected'
);

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log('OK: ecosystem validation self-test passed');
