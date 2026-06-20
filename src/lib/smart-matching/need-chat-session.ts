import { db } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { SmartMatchingError, SMART_MATCHING_CODES } from './errors';
import { getMaxActiveChatSessionsPerNeed } from './env';

function isTransactionConflict(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
  );
}

async function ensureConversationInTx(
  tx: Prisma.TransactionClient,
  params: { userId1: string; userId2: string; requestId?: string; businessProfileId?: string }
) {
  const { userId1, userId2, requestId, businessProfileId } = params;
  const [a, b] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const existing = await tx.conversation.findFirst({
    where: {
      userId1: a,
      userId2: b,
      ...(requestId ? { requestId } : {}),
      ...(businessProfileId ? { businessProfileId } : {}),
    },
  });
  if (existing) return existing;

  return tx.conversation.create({
    data: {
      userId1: a,
      userId2: b,
      requestId: requestId ?? null,
      businessProfileId: businessProfileId ?? null,
    },
  });
}

async function acceptLeadOnce(params: {
  outreachId: string;
  businessUserId: string;
  idempotencyKey?: string;
}) {
  const { outreachId, businessUserId, idempotencyKey } = params;
  const maxSessions = getMaxActiveChatSessionsPerNeed();

  return db.$transaction(
    async (tx) => {
      if (idempotencyKey) {
        const prior = await tx.needChatSession.findUnique({
          where: { acceptIdempotencyKey: idempotencyKey },
        });
        if (prior) return prior;
      }

      const outreach = await tx.needLeadOutreach.findUniqueOrThrow({
        where: { id: outreachId },
        include: { request: { select: { id: true, userId: true, needAccessStatus: true, status: true } } },
      });

      if (outreach.businessUserId !== businessUserId) {
        throw new SmartMatchingError('دسترسی غیرمجاز', SMART_MATCHING_CODES.UNAUTHORIZED_SESSION, 403);
      }
      if (outreach.status !== 'SENT') {
        throw new SmartMatchingError('لید قابل پذیرش نیست', SMART_MATCHING_CODES.OUTREACH_NOT_SENT, 409);
      }
      if (!outreach.walletTransactionId) {
        throw new SmartMatchingError('لید پرداخت نشده', SMART_MATCHING_CODES.UNPAID_LEAD, 403);
      }

      const need = outreach.request;
      if (need.status !== 'OPEN' && need.status !== 'IN_PROGRESS') {
        throw new SmartMatchingError('نیاز بسته شده', 'NEED_CLOSED', 409);
      }

      await tx.$executeRaw`SELECT id FROM "ServiceRequest" WHERE id = ${outreach.requestId} FOR UPDATE`;

      const activeCount = await tx.needChatSession.count({
        where: { requestId: outreach.requestId, status: 'ACTIVE' },
      });
      if (activeCount >= maxSessions) {
        throw new SmartMatchingError(
          'حداکثر 3 گفتگوی فعال برای این نیاز',
          SMART_MATCHING_CODES.MAX_SESSIONS_REACHED,
          409
        );
      }

      const existing = await tx.needChatSession.findUnique({
        where: {
          requestId_businessProfileId: {
            requestId: outreach.requestId,
            businessProfileId: outreach.businessProfileId,
          },
        },
      });
      if (existing?.status === 'ACTIVE') return existing;

      const conversation = await ensureConversationInTx(tx, {
        userId1: need.userId,
        userId2: businessUserId,
        requestId: outreach.requestId,
        businessProfileId: outreach.businessProfileId,
      });

      const session = await tx.needChatSession.create({
        data: {
          requestId: outreach.requestId,
          businessProfileId: outreach.businessProfileId,
          businessUserId,
          customerUserId: need.userId,
          conversationId: conversation.id,
          status: 'ACTIVE',
          acceptIdempotencyKey: idempotencyKey ?? undefined,
        },
      });

      await tx.needLeadOutreach.update({
        where: { id: outreachId },
        data: { acceptedAt: new Date() },
      });

      return session;
    },
    { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
  );
}

export async function acceptLead(params: {
  outreachId: string;
  businessUserId: string;
  idempotencyKey?: string;
}) {
  const maxRetries = 6;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await acceptLeadOnce(params);
    } catch (err) {
      if (isTransactionConflict(err) && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 15 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new SmartMatchingError('Transaction conflict', 'TRANSACTION_CONFLICT', 503);
}

export async function listPrivateLeads(businessUserId: string) {
  const profile = await db.businessProfile.findUnique({
    where: { userId: businessUserId },
    select: { id: true },
  });
  if (!profile) return [];

  const rows = await db.needLeadOutreach.findMany({
    where: {
      businessUserId,
      accessPhase: 'PRIVATE',
      status: 'SENT',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      request: {
        select: {
          id: true,
          title: true,
          slug: true,
          city: true,
          needAccessStatus: true,
          vipExpiresAt: true,
          status: true,
        },
      },
    },
  });

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    requestId: row.requestId,
    matchScore: row.matchScore,
    matchReasonFa: row.matchReasonFa,
    leadFeeAmount: row.leadFeeAmount,
    conversationId: row.conversationId,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    request: {
      ...row.request,
      vipExpiresAt: row.request.vipExpiresAt?.toISOString() ?? null,
      remainingMs:
        row.request.needAccessStatus === 'PRIVATE' && row.request.vipExpiresAt
          ? Math.max(0, row.request.vipExpiresAt.getTime() - now)
          : 0,
    },
  }));
}

export async function getActiveBusinessesForNeed(requestId: string, customerUserId: string) {
  const need = await db.serviceRequest.findUnique({
    where: { id: requestId },
    select: { userId: true },
  });
  if (!need || need.userId !== customerUserId) {
    throw new SmartMatchingError('دسترسی غیرمجاز', SMART_MATCHING_CODES.UNAUTHORIZED_SESSION, 403);
  }

  const sessions = await db.needChatSession.findMany({
    where: {
      requestId,
      status: { in: ['ACTIVE', 'CLOSED'] },
    },
    include: {
      business: {
        select: { id: true, name: true, slug: true, logo: true, trustScore: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return sessions.map((s) => ({
    sessionId: s.id,
    businessProfileId: s.businessProfileId,
    conversationId: s.conversationId,
    status: s.status,
    business: s.business,
  }));
}
