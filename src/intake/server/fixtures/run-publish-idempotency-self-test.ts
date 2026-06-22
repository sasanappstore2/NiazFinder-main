/**
 * Self-test for publish idempotency (Phase 1, highest-risk change).
 *
 * Tests the pure control-flow in `@/intake/server/idempotency` — which is the
 * exact logic `publishNeedService` uses to dedupe submits — with in-memory ports
 * (no DB / no server-only imports), asserting:
 *   1. an existing row for a key → deduped, create NOT called;
 *   2. no existing row → create called once, not deduped;
 *   3. a P2002 race (pre-check misses, create throws unique-violation) → re-query
 *      returns the racing row instead of throwing;
 *   4. no key → always creates, never dedupes;
 *   5. a non-P2002 create error propagates.
 */
import {
  createOrDedupe,
  isPrismaUniqueViolation,
} from '@/intake/server/idempotency';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

type Row = { id: string; key: string | null };

async function run() {
  // ── 1. Existing row → deduped, no create ──
  {
    let creates = 0;
    const existing: Row = { id: 'sr-existing', key: 'k1' };
    const out = await createOrDedupe<Row>('k1', {
      findExisting: async () => existing,
      create: async () => {
        creates += 1;
        return { id: 'sr-new', key: 'k1' };
      },
      isUniqueViolation: isPrismaUniqueViolation,
    });
    assert(out.deduped === true, 'existing key should dedupe');
    assert(out.row.id === 'sr-existing', 'should return existing row');
    assert(creates === 0, 'create must not run when row exists');
  }

  // ── 2. No existing → single create ──
  {
    let creates = 0;
    const out = await createOrDedupe<Row>('k2', {
      findExisting: async () => null,
      create: async () => {
        creates += 1;
        return { id: 'sr-2', key: 'k2' };
      },
      isUniqueViolation: isPrismaUniqueViolation,
    });
    assert(out.deduped === false, 'fresh key should not dedupe');
    assert(out.row.id === 'sr-2' && creates === 1, 'should create exactly once');
  }

  // ── 3. P2002 race → re-query wins ──
  {
    let finds = 0;
    const racing: Row = { id: 'sr-race-winner', key: 'k3' };
    const out = await createOrDedupe<Row>('k3', {
      findExisting: async () => {
        finds += 1;
        return finds === 1 ? null : racing; // miss on pre-check, hit on re-query
      },
      create: async () => {
        throw Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
      },
      isUniqueViolation: isPrismaUniqueViolation,
    });
    assert(out.deduped === true, 'P2002 race should resolve to deduped');
    assert(out.row.id === 'sr-race-winner', 'should return the racing winner row');
  }

  // ── 4. No key → always create ──
  {
    let creates = 0;
    const ports = {
      findExisting: async () => {
        throw new Error('findExisting must not be called without a key');
      },
      create: async () => {
        creates += 1;
        return { id: `sr-nokey-${creates}`, key: null };
      },
      isUniqueViolation: isPrismaUniqueViolation,
    };
    const a = await createOrDedupe<Row>(undefined, ports);
    const b = await createOrDedupe<Row>(undefined, ports);
    assert(a.deduped === false && b.deduped === false, 'no-key calls never dedupe');
    assert(creates === 2, 'each no-key call creates');
  }

  // ── 5. Non-P2002 error propagates ──
  {
    let threw = false;
    try {
      await createOrDedupe<Row>('k5', {
        findExisting: async () => null,
        create: async () => {
          throw new Error('db down');
        },
        isUniqueViolation: isPrismaUniqueViolation,
      });
    } catch (err) {
      threw = (err as Error).message === 'db down';
    }
    assert(threw, 'a non-unique-violation error should propagate');
  }

  console.log('publish-idempotency self-test: 5/5 passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
