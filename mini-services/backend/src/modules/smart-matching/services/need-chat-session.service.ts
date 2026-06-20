import {
  Injectable,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NeedChatSessionService {
  constructor(private readonly prisma: PrismaService) {}

  private maxSessions() {
    const n = parseInt(process.env.MAX_ACTIVE_CHAT_SESSIONS_PER_NEED ?? '3', 10);
    return Number.isFinite(n) && n > 0 ? n : 3;
  }

  private async ensureConversationInTx(
    tx: Prisma.TransactionClient,
    params: { userId1: string; userId2: string; requestId?: string; businessProfileId?: string },
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

  async acceptLead(outreachId: string, businessUserId: string, idempotencyKey?: string) {
    const maxRetries = 6;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.acceptLeadOnce(outreachId, businessUserId, idempotencyKey);
      } catch (err) {
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : '';
        if (code === 'P2034' && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 15 * attempt));
          continue;
        }
        throw err;
      }
    }
    throw new ConflictException('TRANSACTION_CONFLICT');
  }

  private async acceptLeadOnce(outreachId: string, businessUserId: string, idempotencyKey?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        if (idempotencyKey) {
          const prior = await tx.needChatSession.findUnique({
            where: { acceptIdempotencyKey: idempotencyKey },
          });
          if (prior) return prior;
        }

        const outreach = await tx.needLeadOutreach.findUniqueOrThrow({
          where: { id: outreachId },
          include: { request: { select: { id: true, userId: true, status: true } } },
        });

        if (outreach.businessUserId !== businessUserId) throw new ForbiddenException();
        if (outreach.status !== 'SENT') throw new ConflictException('OUTREACH_NOT_SENT');
        if (!outreach.walletTransactionId) throw new ForbiddenException('UNPAID_LEAD');

        await tx.$executeRaw`SELECT id FROM "ServiceRequest" WHERE id = ${outreach.requestId} FOR UPDATE`;

        const activeCount = await tx.needChatSession.count({
          where: { requestId: outreach.requestId, status: 'ACTIVE' },
        });
        if (activeCount >= this.maxSessions()) throw new ConflictException('MAX_SESSIONS_REACHED');

        const existing = await tx.needChatSession.findUnique({
          where: {
            requestId_businessProfileId: {
              requestId: outreach.requestId,
              businessProfileId: outreach.businessProfileId,
            },
          },
        });
        if (existing?.status === 'ACTIVE') return existing;

        const conversation = await this.ensureConversationInTx(tx, {
          userId1: outreach.request.userId,
          userId2: businessUserId,
          requestId: outreach.requestId,
          businessProfileId: outreach.businessProfileId,
        });

        const session = await tx.needChatSession.create({
          data: {
            requestId: outreach.requestId,
            businessProfileId: outreach.businessProfileId,
            businessUserId,
            customerUserId: outreach.request.userId,
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
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
    );
  }

  async listPrivateLeads(businessUserId: string) {
    return this.prisma.needLeadOutreach.findMany({
      where: { businessUserId, accessPhase: 'PRIVATE', status: 'SENT' },
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
  }

  async getActiveBusinesses(requestId: string, customerUserId: string) {
    const need = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { userId: true },
    });
    if (!need || need.userId !== customerUserId) throw new ForbiddenException();

    return this.prisma.needChatSession.findMany({
      where: { requestId, status: { in: ['ACTIVE', 'CLOSED'] } },
      include: {
        business: { select: { id: true, name: true, slug: true, logo: true, trustScore: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
