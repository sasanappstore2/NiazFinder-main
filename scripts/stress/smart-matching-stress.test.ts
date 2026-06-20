/**
 * Smart Matching & VIP Leads ? heavy-duty E2E stress suite.
 *
 * Covers:
 *  1. Concurrent accept race (10 parallel ? max 3 ACTIVE sessions)
 *  2. False-claim dispute + self-regulating refund (A reports, B wins)
 *  3. BullMQ need-expiry persistence + PRIVATE ? PUBLIC flip
 *
 * Run (recommended):
 *   npx tsx scripts/stress/smart-matching-stress.test.ts
 *
 * With live Next.js API (default http://127.0.0.1:3000):
 *   npm run dev   # separate terminal
 *   STRESS_API_BASE=http://127.0.0.1:3000 npx tsx scripts/stress/smart-matching-stress.test.ts
 *
 * With Nest backend (proxied paths):
 *   STRESS_API_MODE=nest STRESS_API_BASE=http://127.0.0.1:4000 npx tsx scripts/stress/smart-matching-stress.test.ts
 *
 * Direct lib calls (no HTTP server required):
 *   STRESS_USE_DIRECT=true npx tsx scripts/stress/smart-matching-stress.test.ts
 *
 * Fast TTL simulation (scenario 3, default 2s instead of 3h):
 *   STRESS_TTL_MS=2000 npx tsx scripts/stress/smart-matching-stress.test.ts
 *
 * Requires: DATABASE_URL, Redis for scenario 3 (BULLMQ_REDIS_HOST / REDIS_HOST).
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { PrismaClient } from '@prisma/client';
import { acceptLead } from '@/lib/smart-matching/need-chat-session';
import { reportNeedCompletion, resolveNeed } from '@/lib/smart-matching/need-resolution';
import { flipNeedToPublic } from '@/lib/smart-matching/need-visibility';
import { deductLeadFee } from '@/lib/smart-matching/wallet-lead-fee';
import { handleNeedResolvedEvent } from '@/lib/smart-matching/trust-score';
import { SMART_MATCHING_CODES } from '@/lib/smart-matching/errors';

// ??? BullMQ (from Nest backend node_modules) ???????????????????????????????
const backendRoot = path.join(process.cwd(), 'mini-services/backend');
const requireFromBackend = createRequire(path.join(backendRoot, 'package.json'));
const { Queue, Worker } = requireFromBackend('bullmq') as typeof import('bullmq');

// ??? Terminal styling (chalk-free) ?????????????????????????????????????????
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};
const log = {
  section: (t: string) => console.log(`\n${c.bold}${c.cyan}??→ ${t} ???${c.reset}`),
  info: (t: string) => console.log(`${c.dim}?${c.reset}  ${t}`),
  pass: (t: string) => console.log(`${c.green}?${c.reset}  ${t}`),
  fail: (t: string) => console.log(`${c.red}?${c.reset}  ${t}`),
  warn: (t: string) => console.log(`${c.yellow}?${c.reset}  ${t}`),
  table: (rows: Record<string, unknown>[]) => console.table(rows),
};

// ??? Config ??????????????????????????????????????????????????????????????????
const RUN_ID = `sm-stress-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`;
const LEAD_FEE = Number(process.env.LEAD_FEE_TOMAN ?? '5000');
const STRESS_TTL_MS = Number(process.env.STRESS_TTL_MS ?? '2000');
const API_BASE = (process.env.STRESS_API_BASE ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
const API_MODE = (process.env.STRESS_API_MODE ?? 'next') as 'next' | 'nest';
const USE_DIRECT = process.env.STRESS_USE_DIRECT === 'true' || process.env.STRESS_USE_DIRECT === '1';

const prisma = new PrismaClient();

type CleanupIds = {
  userIds: string[];
  requestIds: string[];
  businessProfileIds: string[];
  outreachIds: string[];
  sessionIds: string[];
  walletIds: string[];
  transactionIds: string[];
  reviewIds: string[];
  disputeIds: string[];
  notificationIds: string[];
  categoryId?: string;
  jobIds: string[];
};

const cleanup: CleanupIds = {
  userIds: [],
  requestIds: [],
  businessProfileIds: [],
  outreachIds: [],
  sessionIds: [],
  walletIds: [],
  transactionIds: [],
  reviewIds: [],
  disputeIds: [],
  notificationIds: [],
  jobIds: [],
};

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    log.fail(message);
    failures += 1;
    throw new Error(message);
  }
  log.pass(message);
}

function apiPath(kind: 'accept' | 'report' | 'resolve', ids: { outreachId?: string; requestId?: string }) {
  if (API_MODE === 'nest') {
    if (kind === 'accept') return `/api/smart-matching/business/leads/${ids.outreachId}/accept`;
    if (kind === 'report') return `/api/smart-matching/business/needs/${ids.requestId}/report-completion`;
    return `/api/smart-matching/needs/${ids.requestId}/resolve`;
  }
  if (kind === 'accept') return `/api/business/leads/${ids.outreachId}/accept`;
  if (kind === 'report') return `/api/business/needs/${ids.requestId}/report-completion`;
  return `/api/needs/${ids.requestId}/resolve`;
}

async function httpPost<T = unknown>(
  route: string,
  token: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: T; ok: boolean }> {
  const res = await fetch(`${API_BASE}${route}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data, ok: res.ok };
}

async function createAuthToken(userId: string): Promise<string> {
  const token = `stress-${RUN_ID}-${crypto.randomBytes(16).toString('hex')}`;
  await prisma.authToken.create({
    data: {
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

async function createCustomer(suffix = 'customer') {
  const user = await prisma.user.create({
    data: {
      email: `${RUN_ID}-${suffix}@stress.test`,
      firstName: 'Stress',
      lastName: 'Customer',
      role: 'CLIENT',
    },
  });
  cleanup.userIds.push(user.id);
  const token = await createAuthToken(user.id);
  return { user, token };
}

async function createBusiness(index: number, walletBalance: number, suffix = 'biz') {
  const user = await prisma.user.create({
    data: {
      email: `${RUN_ID}-${suffix}-${index}@stress.test`,
      firstName: 'Biz',
      lastName: String(index),
      role: 'SPECIALIST',
    },
  });
  cleanup.userIds.push(user.id);

  const profile = await prisma.businessProfile.create({
    data: {
      userId: user.id,
      name: `Stress Business ${index}`,
      slug: `${RUN_ID}-${suffix}-${index}`,
      status: 'ACTIVE',
      leadAlertsEnabled: true,
      trustScore: 5,
    },
  });
  cleanup.businessProfileIds.push(profile.id);

  const wallet = await prisma.wallet.create({
    data: { userId: user.id, balance: walletBalance, frozen: 0 },
  });
  cleanup.walletIds.push(wallet.id);

  const token = await createAuthToken(user.id);
  return { user, profile, wallet, token };
}

async function ensureCategory() {
  const existing = await prisma.category.findFirst({ where: { isActive: true } });
  if (existing) return existing;

  const cat = await prisma.category.create({
    data: {
      name: `Stress Category ${RUN_ID}`,
      slug: `${RUN_ID}-cat`,
      isActive: true,
    },
  });
  cleanup.categoryId = cat.id;
  return cat;
}

async function createPrivateNeed(customerId: string, categoryId: string) {
  const slug = `${RUN_ID}-need-${crypto.randomBytes(4).toString('hex')}`;
  const request = await prisma.serviceRequest.create({
    data: {
      title: `Stress Need ${RUN_ID}`,
      slug,
      description: 'Smart matching stress test need',
      categoryId,
      userId: customerId,
      status: 'OPEN',
      moderationStatus: 'APPROVED',
      needAccessStatus: 'PRIVATE',
      vipExpiresAt: new Date(Date.now() + STRESS_TTL_MS),
    },
  });
  cleanup.requestIds.push(request.id);
  return request;
}

/** Simulate VIP broadcast fee deduction + outreach row (production path). */
async function seedPaidOutreach(params: {
  requestId: string;
  businessUserId: string;
  businessProfileId: string;
  index: number;
}) {
  const idempotencyKey = `lead:${params.requestId}:${params.businessUserId}`;

  const outreach = await prisma.$transaction(async (tx) => {
    const { transaction } = await deductLeadFee(tx, {
      userId: params.businessUserId,
      amount: LEAD_FEE,
      idempotencyKey,
      referenceId: params.requestId,
    });
    cleanup.transactionIds.push(transaction.id);

    return tx.needLeadOutreach.create({
      data: {
        requestId: params.requestId,
        businessProfileId: params.businessProfileId,
        businessUserId: params.businessUserId,
        status: 'SENT',
        accessPhase: 'PRIVATE',
        idempotencyKey,
        leadFeeAmount: LEAD_FEE,
        feeDeductedAt: new Date(),
        walletTransactionId: transaction.id,
        matchScore: 0.9,
        matchReasonFa: `stress match ${params.index}`,
      },
    });
  }, { isolationLevel: 'Serializable' });

  cleanup.outreachIds.push(outreach.id);
  return outreach;
}

async function acceptViaApi(outreachId: string, token: string, businessUserId: string, index: number) {
  const maxAttempts = 6;
  let last: { status: number; data: unknown; ok: boolean; code?: string } = {
    status: 500,
    data: {},
    ok: false,
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (USE_DIRECT) {
      try {
        const session = await acceptLead({
          outreachId,
          businessUserId,
          idempotencyKey: `${RUN_ID}-accept-${outreachId}-${index}`,
        });
        return { status: 200, data: { session }, ok: true, code: undefined as string | undefined };
      } catch (err: unknown) {
        const prismaCode =
          err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : undefined;
        const code =
          err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string'
            ? String((err as { code: string }).code)
            : prismaCode;
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status: number }).status)
            : prismaCode === 'P2034'
              ? 503
              : 500;
        last = { status, data: { code, error: String(err) }, ok: false, code };

        if (code === SMART_MATCHING_CODES.MAX_SESSIONS_REACHED) return { ...last, code };
        if (prismaCode === 'P2034' && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 15 * attempt));
          continue;
        }
        return { ...last, code: code ?? prismaCode };
      }
    }

    const route = apiPath('accept', { outreachId });
    const res = await httpPost(route, token, undefined, {
      'Idempotency-Key': `${RUN_ID}-accept-${outreachId}-${index}`,
    });
    const code = (res.data as { code?: string })?.code;
    last = { ...res, code };

    if (code === SMART_MATCHING_CODES.MAX_SESSIONS_REACHED) return { ...last, code };
    if ((res.status === 503 || res.status >= 500) && attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 15 * attempt));
      continue;
    }
    return { ...last, code };
  }

  return last;
}

async function getWalletBalance(userId: string) {
  const w = await prisma.wallet.findUnique({ where: { userId } });
  return w?.balance ?? 0;
}

async function countPaymentsForUsers(userIds: string[]) {
  return prisma.transaction.count({
    where: { userId: { in: userIds }, type: 'PAYMENT', status: 'COMPLETED' },
  });
}

async function countRefundsForUsers(userIds: string[]) {
  return prisma.transaction.count({
    where: { userId: { in: userIds }, type: 'REFUND', status: 'COMPLETED' },
  });
}

// ??? Scenario 1: Concurrency & ACID race ???????????????????????????????????
async function scenario1_concurrentAcceptRace() {
  log.section('Scenario 1 — Concurrency & ACID Race (10 parallel accepts)');

  const category = await ensureCategory();
  const { user: customer } = await createCustomer('s1');
  const need = await createPrivateNeed(customer.id, category.id);

  const businesses = await Promise.all(
    Array.from({ length: 10 }, (_, i) => createBusiness(i + 1, LEAD_FEE * 20, 's1'))
  );

  const outreaches = [];
  for (let i = 0; i < businesses.length; i++) {
    const b = businesses[i];
    outreaches.push(
      await seedPaidOutreach({
        requestId: need.id,
        businessUserId: b.user.id,
        businessProfileId: b.profile.id,
        index: i + 1,
      })
    );
  }

  const businessUserIds = businesses.map((b) => b.user.id);
  const paymentsBefore = await countPaymentsForUsers(businessUserIds);
  assert(paymentsBefore === 10, `Setup: exactly 10 PAYMENT txs at broadcast (${paymentsBefore})`);

  const balancesBefore = await Promise.all(businesses.map((b) => getWalletBalance(b.user.id)));
  log.info('Wallet balances after broadcast (each should be initial ? lead fee):');
  log.table(
    businesses.map((b, i) => ({
      business: b.profile.name,
      balance: balancesBefore[i],
      expectedMin: LEAD_FEE * 19,
    }))
  );

  for (const bal of balancesBefore) {
    assert(bal >= 0, `Pre-race wallet non-negative (${bal})`);
  }

  log.info('Firing 10 simultaneous accept requests?');
  const startedAt = Date.now();
  const results = await Promise.all(
    outreaches.map((o, i) =>
      acceptViaApi(o.id, businesses[i].token, businesses[i].user.id, i + 1)
    )
  );
  const elapsed = Date.now() - startedAt;
  log.info(`All accepts settled in ${elapsed}ms`);

  const success = results.filter((r) => r.ok && r.status >= 200 && r.status < 300);
  const maxSessions = results.filter(
    (r) => r.status === 409 || r.code === SMART_MATCHING_CODES.MAX_SESSIONS_REACHED
  );

  log.table(
    results.map((r, i) => ({
      business: `#${i + 1}`,
      status: r.status,
      ok: r.ok,
      code: r.code ?? '?',
    }))
  );

  assert(success.length === 3, `Exactly 3 accepts succeed (got ${success.length})`);
  assert(maxSessions.length === 7, `Exactly 7 MAX_SESSIONS_REACHED (got ${maxSessions.length})`);

  const activeSessions = await prisma.needChatSession.count({
    where: { requestId: need.id, status: 'ACTIVE' },
  });
  assert(activeSessions === 3, `DB: exactly 3 ACTIVE NeedChatSession rows (got ${activeSessions})`);

  const paymentsAfter = await countPaymentsForUsers(businessUserIds);
  assert(
    paymentsAfter === paymentsBefore,
    `No extra PAYMENT during accept race (${paymentsBefore} → ${paymentsAfter})`
  );

  log.warn(
    'Note: lead fees are deducted at VIP broadcast (10 PAYMENT), not on accept. ' +
      'Accept race must not double-charge or create negative balances.'
  );

  const balancesAfter = await Promise.all(businesses.map((b) => getWalletBalance(b.user.id)));
  for (let i = 0; i < balancesAfter.length; i++) {
    assert(balancesAfter[i] >= 0, `Post-race wallet #${i + 1} non-negative (${balancesAfter[i]})`);
    assert(
      balancesAfter[i] === balancesBefore[i],
      `Post-race wallet #${i + 1} unchanged by accept (${balancesBefore[i]} → ${balancesAfter[i]})`
    );
  }
}

// ??? Scenario 2: False claim + refund rule ?????????????????????????????????
async function scenario2_disputeAndRefund() {
  log.section('Scenario 2 — False Claim & Self-Regulating Refund');

  const category = await ensureCategory();
  const { user: customer, token: customerToken } = await createCustomer('s2');
  const need = await createPrivateNeed(customer.id, category.id);

  const bizA = await createBusiness(101, LEAD_FEE * 10, 's2a');
  const bizB = await createBusiness(102, LEAD_FEE * 10, 's2b');

  const outreachA = await seedPaidOutreach({
    requestId: need.id,
    businessUserId: bizA.user.id,
    businessProfileId: bizA.profile.id,
    index: 101,
  });
  const outreachB = await seedPaidOutreach({
    requestId: need.id,
    businessUserId: bizB.user.id,
    businessProfileId: bizB.profile.id,
    index: 102,
  });

  // Establish 2 ACTIVE sessions (sequential accepts ? under cap of 3)
  const sessionA = await acceptLead({
    outreachId: outreachA.id,
    businessUserId: bizA.user.id,
    idempotencyKey: `${RUN_ID}-s2-a`,
  });
  const sessionB = await acceptLead({
    outreachId: outreachB.id,
    businessUserId: bizB.user.id,
    idempotencyKey: `${RUN_ID}-s2-b`,
  });
  cleanup.sessionIds.push(sessionA.id, sessionB.id);

  const trustBeforeA = (await prisma.businessProfile.findUniqueOrThrow({ where: { id: bizA.profile.id } })).trustScore;
  const trustBeforeB = (await prisma.businessProfile.findUniqueOrThrow({ where: { id: bizB.profile.id } })).trustScore;
  const walletBeforeA = await getWalletBalance(bizA.user.id);
  const walletBeforeB = await getWalletBalance(bizB.user.id);

  log.table([
    { party: 'Business A', trust: trustBeforeA, wallet: walletBeforeA },
    { party: 'Business B', trust: trustBeforeB, wallet: walletBeforeB },
  ]);

  // Step 1: A reports completion
  if (USE_DIRECT) {
    await reportNeedCompletion({ requestId: need.id, businessUserId: bizA.user.id });
  } else {
    const reportRoute = apiPath('report', { requestId: need.id });
    const reportRes = await httpPost(reportRoute, bizA.token);
    assert(reportRes.ok, `Business A report-completion HTTP ${reportRes.status}`);
  }

  const pending = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: need.id } });
  assert(pending.needAccessStatus === 'PENDING_VERIFICATION', 'Need ? PENDING_VERIFICATION');
  assert(
    pending.pendingVerificationBusinessProfileId === bizA.profile.id,
    'Pending claimant is Business A'
  );

  // Step 2: Customer resolves with Business B as winner
  if (USE_DIRECT) {
    const result = await resolveNeed(customer.id, {
      requestId: need.id,
      businessProfileId: bizB.profile.id,
      rating: 5,
      comment: 'stress test winner B',
    });
    await handleNeedResolvedEvent(result);
  } else {
    const resolveRoute = apiPath('resolve', { requestId: need.id });
    const resolveRes = await httpPost(resolveRoute, customerToken, {
      businessProfileId: bizB.profile.id,
      rating: 5,
      comment: 'stress test winner B',
    });
    assert(resolveRes.ok, `Customer resolve HTTP ${resolveRes.status}`);
    await new Promise((r) => setTimeout(r, 300));
  }

  const refundsA = await prisma.transaction.count({
    where: { userId: bizA.user.id, type: 'REFUND', status: 'COMPLETED' },
  });
  const refundsB = await prisma.transaction.findMany({
    where: { userId: bizB.user.id, type: 'REFUND', status: 'COMPLETED' },
  });

  assert(refundsA === 0, 'Business A: NO refund (false claimant keeps sunk cost)');
  assert(refundsB.length === 1, 'Business B: exactly 1 REFUND transaction');
  assert(refundsB[0].amount === LEAD_FEE, `Business B refund amount = LEAD_FEE (${LEAD_FEE})`);
  cleanup.transactionIds.push(refundsB[0].id);

  const walletAfterA = await getWalletBalance(bizA.user.id);
  const walletAfterB = await getWalletBalance(bizB.user.id);
  assert(walletAfterA === walletBeforeA, 'Business A wallet unchanged (no refund)');
  assert(
    walletAfterB === walletBeforeB + LEAD_FEE,
    `Business B wallet +${LEAD_FEE} (${walletBeforeB} → ${walletAfterB})`
  );

  const outreachBRow = await prisma.needLeadOutreach.findUniqueOrThrow({ where: { id: outreachB.id } });
  assert(outreachBRow.refundTransactionId !== null, 'Business B outreach linked to refundTransactionId');

  const trustAfterA = (await prisma.businessProfile.findUniqueOrThrow({ where: { id: bizA.profile.id } })).trustScore;
  const trustAfterB = (await prisma.businessProfile.findUniqueOrThrow({ where: { id: bizB.profile.id } })).trustScore;

  assert(trustAfterA < trustBeforeA, `Business A trustScore penalized (${trustBeforeA} → ${trustAfterA})`);
  assert(
    Math.abs(trustAfterA - (trustBeforeA - 0.5)) < 0.001,
    `Business A trustScore ?0.5 false-claim penalty`
  );
  assert(trustAfterB >= trustBeforeB, `Business B trustScore applied (${trustBeforeB} → ${trustAfterB})`);
  assert(
    Math.abs(trustAfterB - (0.85 * trustBeforeB + 0.15 * 5)) < 0.001,
    'Business B trustScore formula: 0.85*old + 0.15*rating'
  );

  const dispute = await prisma.needResolutionDispute.findFirst({
    where: { requestId: need.id, outcome: 'DISPUTED' },
  });
  assert(Boolean(dispute), 'NeedResolutionDispute recorded (DISPUTED)');

  const resolved = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: need.id } });
  assert(resolved.needAccessStatus === 'RESOLVED', 'Need ? RESOLVED');
  assert(resolved.resolvedBusinessProfileId === bizB.profile.id, 'Winner = Business B');
}

// ??? Scenario 3: BullMQ persistence + TTL flip ?????????????????????????????
function redisConnectionOptions() {
  const host =
    process.env.STRESS_REDIS_HOST ||
    process.env.BULLMQ_REDIS_HOST ||
    process.env.REDIS_HOST ||
    '127.0.0.1';
  return {
    host: host === 'redis' && !process.env.STRESS_REDIS_HOST ? '127.0.0.1' : host,
    port: Number(process.env.BULLMQ_REDIS_PORT || process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null as null,
    connectTimeout: 3_000,
    lazyConnect: true,
  };
}

async function probeRedis(): Promise<boolean> {
  if (process.env.STRESS_SKIP_BULLMQ === 'true' || process.env.STRESS_SKIP_BULLMQ === '1') {
    return false;
  }
  const connection = redisConnectionOptions();
  const probe = requireFromBackend('ioredis') as typeof import('ioredis');
  const client = new probe.default(connection);
  try {
    await client.connect();
    const pong = await client.ping();
    await client.quit();
    return pong === 'PONG';
  } catch {
    try {
      await client.quit();
    } catch {
      /* ignore */
    }
    return false;
  }
}

async function scenario3_bullmqTtl() {
  log.section('Scenario 3 — BullMQ Persistence & TTL (PRIVATE → PUBLIC)');

  const redisOk = await probeRedis();
  if (!redisOk) {
    log.warn(
      'Redis unreachable ? running flipNeedToPublic fallback only. ' +
        'For full BullMQ persistence test: REDIS_HOST=127.0.0.1 npm run test:smart-matching-stress'
    );
    const category = await ensureCategory();
    const { user: customer } = await createCustomer('s3-fallback');
    const need = await createPrivateNeed(customer.id, category.id);
    assert(need.needAccessStatus === 'PRIVATE', 'Need starts PRIVATE');
    const flip = await flipNeedToPublic(need.id);
    assert('flipped' in flip && flip.flipped === true, 'Direct flipNeedToPublic succeeds');
    const after = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: need.id } });
    assert(after.needAccessStatus === 'PUBLIC', 'Need ends PUBLIC after TTL processor logic');
    const again = await flipNeedToPublic(need.id);
    assert('skipped' in again, 'Second flip idempotent');
    return;
  }

  const category = await ensureCategory();
  const { user: customer } = await createCustomer('s3');
  const need = await createPrivateNeed(customer.id, category.id);

  const jobId = `need-expiry-${need.id}`;
  cleanup.jobIds.push(jobId);

  const connection = redisConnectionOptions();
  log.info(`Redis ${connection.host}:${connection.port} | simulated TTL ${STRESS_TTL_MS}ms`);

  let queue1: InstanceType<typeof Queue> | null = null;
  let queue2: InstanceType<typeof Queue> | null = null;
  let worker: InstanceType<typeof Worker> | null = null;

  try {
    queue1 = new Queue('need-expiry', { connection });

    await queue1.add(
      'flip-to-public',
      { requestId: need.id, enqueuedAt: Date.now(), stressRun: RUN_ID },
      {
        jobId,
        delay: STRESS_TTL_MS,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
      }
    );
    log.pass(`Enqueued delayed job ${jobId} (delay=${STRESS_TTL_MS}ms)`);

    const jobBefore = await queue1.getJob(jobId);
    assert(Boolean(jobBefore), 'Job exists in Redis immediately after enqueue');

    const stateBefore = await jobBefore!.getState();
    log.info(`Job state before "restart": ${stateBefore}`);

    // Simulate Nest worker crash: close queue connection, open fresh client
    await queue1.close();
    queue1 = null;
    log.warn('Simulated worker restart — closed Queue connection');

    queue2 = new Queue('need-expiry', { connection });
    const jobAfterRestart = await queue2.getJob(jobId);
    assert(Boolean(jobAfterRestart), 'Job survives restart (still in Redis)');
    log.pass(`Job persisted after restart (state=${await jobAfterRestart!.getState()})`);

    // Timeline table for 3h simulation (compressed)
    const phases = [
      { phase: 'T+0', event: 'VIP broadcast', needAccessStatus: 'PRIVATE' },
      { phase: `T+${STRESS_TTL_MS}ms`, event: 'BullMQ delay elapses', needAccessStatus: '? PUBLIC' },
      { phase: 'T+process', event: 'Worker flip-to-public', needAccessStatus: 'PUBLIC' },
    ];
    log.info('TTL simulation timeline (compressed):');
    log.table(phases);

    let processedPayload: { requestId: string } | null = null;

    worker = new Worker(
      'need-expiry',
      async (job) => {
        log.info(`Worker picked job ${job.id} — flipping need ${job.data.requestId}`);
        processedPayload = job.data as { requestId: string };
        return flipNeedToPublic(job.data.requestId);
      },
      { connection }
    );

    const waitMs = STRESS_TTL_MS + 1500;
    log.info(`Waiting ${waitMs}ms for delayed job to become active?`);
    await new Promise((r) => setTimeout(r, waitMs));

    const finalNeed = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: need.id } });
    assert(finalNeed.needAccessStatus === 'PUBLIC', `Need flipped PRIVATE ? PUBLIC (got ${finalNeed.needAccessStatus})`);
    assert(Boolean(processedPayload), 'Worker processed the delayed job');
    assert(processedPayload!.requestId === need.id, 'Processed correct requestId');

    // Idempotent re-run
    const secondFlip = await flipNeedToPublic(need.id);
    assert('skipped' in secondFlip, 'Second flip is idempotent (skipped)');
  } catch (err) {
    if (String(err).includes('ECONNREFUSED')) {
      log.fail('Redis not reachable ? start Redis or set REDIS_HOST for scenario 3');
      throw err;
    }
    throw err;
  } finally {
    await worker?.close().catch(() => undefined);
    await queue1?.close().catch(() => undefined);
    await queue2?.close().catch(() => undefined);
  }
}

// ??? Teardown ???????????????????????????????????????????????????????????????
async function teardown() {
  log.section('Teardown');

  if (cleanup.reviewIds.length) {
    await prisma.review.deleteMany({ where: { id: { in: cleanup.reviewIds } } }).catch(() => undefined);
  }
  if (cleanup.disputeIds.length) {
    await prisma.needResolutionDispute.deleteMany({ where: { id: { in: cleanup.disputeIds } } }).catch(() => undefined);
  }

  // Cascade-friendly deletes by request
  for (const requestId of cleanup.requestIds) {
    await prisma.needResolutionDispute.deleteMany({ where: { requestId } }).catch(() => undefined);
    await prisma.review.deleteMany({ where: { requestId } }).catch(() => undefined);
    await prisma.needChatSession.deleteMany({ where: { requestId } }).catch(() => undefined);
    await prisma.needLeadOutreach.deleteMany({ where: { requestId } }).catch(() => undefined);
    await prisma.notification.deleteMany({
      where: { data: { contains: requestId } },
    }).catch(() => undefined);
    await prisma.serviceRequest.delete({ where: { id: requestId } }).catch(() => undefined);
  }

  if (cleanup.transactionIds.length) {
    await prisma.transaction.deleteMany({ where: { id: { in: cleanup.transactionIds } } }).catch(() => undefined);
  }
  if (cleanup.walletIds.length) {
    await prisma.wallet.deleteMany({ where: { id: { in: cleanup.walletIds } } }).catch(() => undefined);
  }
  if (cleanup.businessProfileIds.length) {
    await prisma.businessProfile.deleteMany({ where: { id: { in: cleanup.businessProfileIds } } }).catch(() => undefined);
  }
  if (cleanup.userIds.length) {
    await prisma.authToken.deleteMany({ where: { userId: { in: cleanup.userIds } } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } }).catch(() => undefined);
  }
  if (cleanup.categoryId) {
    await prisma.category.delete({ where: { id: cleanup.categoryId } }).catch(() => undefined);
  }

  log.pass(`Cleaned up run ${RUN_ID}`);
}

// ??? Main ???????????????????????????????????????????????????????????????????
async function main() {
  console.log(`${c.bold}${c.magenta}Smart Matching Stress Suite${c.reset}  run=${RUN_ID}`);
  log.info(`Mode: ${USE_DIRECT ? 'DIRECT (lib)' : `HTTP → ${API_BASE} (${API_MODE})`}`);
  log.info(`LEAD_FEE=${LEAD_FEE}  STRESS_TTL_MS=${STRESS_TTL_MS}`);

  try {
    await scenario1_concurrentAcceptRace();
    await scenario2_disputeAndRefund();
    await scenario3_bullmqTtl();
  } finally {
    await teardown();
    await prisma.$disconnect();
  }

  if (failures > 0) {
    log.fail(`${failures} assertion(s) failed`);
    process.exit(1);
  }

  log.section('All scenarios passed');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  void teardown().finally(() => process.exit(1));
});
