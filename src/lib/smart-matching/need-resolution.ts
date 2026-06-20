import { db } from '@/lib/db';
import { refundLeadFee } from './wallet-lead-fee';
import { SmartMatchingError, SMART_MATCHING_CODES } from './errors';
import { handleNeedResolvedEvent } from './trust-score';

export interface ResolveNeedInput {
  requestId: string;
  businessProfileId: string;
  rating: number;
  comment?: string;
}

export async function reportNeedCompletion(params: {
  requestId: string;
  businessUserId: string;
}) {
  const profile = await db.businessProfile.findUnique({
    where: { userId: params.businessUserId },
    select: { id: true },
  });
  if (!profile) {
    throw new SmartMatchingError('پروفایل کسب‌وکار یافت نشد', 'NO_PROFILE', 404);
  }

  const need = await db.serviceRequest.findUnique({
    where: { id: params.requestId },
    select: { id: true, userId: true, needAccessStatus: true, status: true, pendingVerificationBusinessProfileId: true },
  });
  if (!need) {
    throw new SmartMatchingError('نیاز یافت نشد', 'NOT_FOUND', 404);
  }

  if (need.needAccessStatus === 'RESOLVED') {
    throw new SmartMatchingError('نیاز قبلاً حل شده', SMART_MATCHING_CODES.ALREADY_RESOLVED, 409);
  }

  if (need.needAccessStatus === 'PENDING_VERIFICATION') {
    if (need.pendingVerificationBusinessProfileId === profile.id) {
      return { ok: true as const };
    }
    throw new SmartMatchingError(
      'این نیاز در انتظار تأیید مشتری است',
      SMART_MATCHING_CODES.ALREADY_PENDING_VERIFICATION,
      409
    );
  }

  const session = await db.needChatSession.findFirst({
    where: {
      requestId: params.requestId,
      businessProfileId: profile.id,
      status: { in: ['ACTIVE', 'CLOSED'] },
    },
  });
  if (!session) {
    throw new SmartMatchingError(
      'گفتگوی فعال یافت نشد',
      SMART_MATCHING_CODES.WINNER_NOT_IN_ACTIVE_SESSIONS,
      400
    );
  }

  await db.serviceRequest.update({
    where: { id: params.requestId },
    data: {
      needAccessStatus: 'PENDING_VERIFICATION',
      pendingVerificationBusinessProfileId: profile.id,
      status: 'IN_PROGRESS',
    },
  });

  await db.notification.create({
    data: {
      userId: need.userId,
      type: 'NEED_RESOLUTION',
      title: 'تأیید انجام نیاز',
      message: 'یک کسب‌وکار انجام نیاز شما را اعلام کرد. لطفاً تأیید کنید.',
      data: JSON.stringify({ requestId: params.requestId, businessProfileId: profile.id }),
    },
  });

  return { ok: true as const };
}

export async function resolveNeed(customerId: string, dto: ResolveNeedInput) {
  if (dto.rating < 1 || dto.rating > 5) {
    throw new SmartMatchingError('امتیاز باید بین 1 تا 5 باشد', 'INVALID_RATING', 400);
  }

  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT id FROM "ServiceRequest" WHERE id = ${dto.requestId} AND "userId" = ${customerId} FOR UPDATE`;

      const need = await tx.serviceRequest.findUniqueOrThrow({ where: { id: dto.requestId } });
      if (need.userId !== customerId) {
        throw new SmartMatchingError('دسترسی غیرمجاز', SMART_MATCHING_CODES.UNAUTHORIZED_SESSION, 403);
      }
      if (need.needAccessStatus === 'RESOLVED') {
        throw new SmartMatchingError('نیاز قبلاً حل شده', SMART_MATCHING_CODES.ALREADY_RESOLVED, 409);
      }

      const winnerSession = await tx.needChatSession.findFirst({
        where: {
          requestId: dto.requestId,
          businessProfileId: dto.businessProfileId,
          status: { in: ['ACTIVE', 'CLOSED'] },
        },
      });
      if (!winnerSession) {
        throw new SmartMatchingError(
          'کسب‌وکار انتخاب‌شده در گفتگوهای این نیاز نیست',
          SMART_MATCHING_CODES.WINNER_NOT_IN_ACTIVE_SESSIONS,
          400
        );
      }

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
        const { transaction, duplicate } = await refundLeadFee(tx, {
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
    { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
  );

  void handleNeedResolvedEvent(result).catch(console.error);

  return result;
}
