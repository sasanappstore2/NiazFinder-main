import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { WalletLeadFeeService } from './wallet-lead-fee.service';
import { TrustScoreService } from './trust-score.service';
import { NeedVisibilityService } from './need-visibility.service';
import { VipBroadcastService } from './vip-broadcast.service';

@Injectable()
export class NeedResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletLeadFee: WalletLeadFeeService,
    private readonly trustScore: TrustScoreService,
  ) {}

  async reportCompletion(requestId: string, businessUserId: string) {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { userId: businessUserId },
      select: { id: true },
    });
    if (!profile) throw new BadRequestException('NO_PROFILE');

    const session = await this.prisma.needChatSession.findFirst({
      where: {
        requestId,
        businessProfileId: profile.id,
        status: { in: ['ACTIVE', 'CLOSED'] },
      },
    });
    if (!session) throw new BadRequestException('WINNER_NOT_IN_ACTIVE_SESSIONS');

    const need = await this.prisma.serviceRequest.findUniqueOrThrow({
      where: { id: requestId },
      select: { userId: true },
    });

    await this.prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        needAccessStatus: 'PENDING_VERIFICATION',
        pendingVerificationBusinessProfileId: profile.id,
        status: 'IN_PROGRESS',
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: need.userId,
        type: 'AI_NEED_LEAD',
        title: 'تأیید انجام نیاز',
        message: 'یک کسب‌وکار انجام نیاز شما را اعلام کرد.',
        data: JSON.stringify({ requestId, businessProfileId: profile.id }),
      },
    });

    return { ok: true };
  }

  async resolveNeed(
    customerId: string,
    dto: { requestId: string; businessProfileId: string; rating: number; comment?: string },
  ) {
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('INVALID_RATING');

    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT id FROM "ServiceRequest" WHERE id = ${dto.requestId} AND "userId" = ${customerId} FOR UPDATE`;

        const need = await tx.serviceRequest.findUniqueOrThrow({ where: { id: dto.requestId } });
        if (need.userId !== customerId) throw new ForbiddenException();
        if (need.needAccessStatus === 'RESOLVED') throw new ConflictException('ALREADY_RESOLVED');

        const winnerSession = await tx.needChatSession.findFirst({
          where: {
            requestId: dto.requestId,
            businessProfileId: dto.businessProfileId,
            status: { in: ['ACTIVE', 'CLOSED'] },
          },
        });
        if (!winnerSession) throw new BadRequestException('WINNER_NOT_IN_ACTIVE_SESSIONS');

        const pendingClaimant = need.pendingVerificationBusinessProfileId;
        const falseClaim = Boolean(pendingClaimant && pendingClaimant !== dto.businessProfileId);

        const winnerOutreach = await tx.needLeadOutreach.findFirst({
          where: {
            requestId: dto.requestId,
            businessProfileId: dto.businessProfileId,
            status: 'SENT',
            walletTransactionId: { not: null },
            refundTransactionId: null,
          },
        });

        let refundTxId: string | null = null;
        if (winnerOutreach?.leadFeeAmount && winnerOutreach.leadFeeAmount > 0) {
          const refundKey = `refund:lead:${dto.requestId}:${winnerOutreach.businessUserId}`;
          const { transaction, duplicate } = await this.walletLeadFee.refundLeadFee(tx, {
            businessUserId: winnerOutreach.businessUserId,
            amount: winnerOutreach.leadFeeAmount,
            idempotencyKey: refundKey,
            referenceId: winnerOutreach.id,
          });
          refundTxId = transaction.id;
          if (!duplicate) {
            await tx.needLeadOutreach.update({
              where: { id: winnerOutreach.id },
              data: { refundTransactionId: refundTxId, refundedAt: new Date() },
            });
          }
        }

        await tx.serviceRequest.update({
          where: { id: dto.requestId },
          data: {
            needAccessStatus: 'RESOLVED',
            resolvedBusinessProfileId: dto.businessProfileId,
            resolvedAt: new Date(),
            status: 'COMPLETED',
            pendingVerificationBusinessProfileId: null,
          },
        });

        await tx.needChatSession.updateMany({
          where: { requestId: dto.requestId },
          data: { status: 'CLOSED' },
        });

        await tx.review.create({
          data: {
            authorId: customerId,
            userId: winnerSession.businessUserId,
            requestId: dto.requestId,
            businessProfileId: dto.businessProfileId,
            rating: dto.rating,
            comment: dto.comment ?? null,
          },
        });

        if (falseClaim && pendingClaimant) {
          await tx.needResolutionDispute.create({
            data: {
              requestId: dto.requestId,
              claimantBusinessProfileId: pendingClaimant,
              selectedBusinessProfileId: dto.businessProfileId,
              outcome: 'DISPUTED',
            },
          });
        }

        return {
          winnerBusinessProfileId: dto.businessProfileId,
          falseClaim,
          falseClaimantProfileId: falseClaim ? pendingClaimant : null,
          rating: dto.rating,
          refundTxId,
        };
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 },
    );

    void this.trustScore.applyRating(result.winnerBusinessProfileId, result.rating);
    if (result.falseClaim && result.falseClaimantProfileId) {
      void this.trustScore.penalizeFalseClaim(result.falseClaimantProfileId);
    }

    return result;
  }
}
