import { db } from '@/lib/db';
import type { NeedMatchContext } from '@/contracts/need-match';
import type { Prisma } from '@prisma/client';
import { getPlatformAiUserId } from '@/lib/platform-ai/user';
import { generateOutreachCopy } from '@/lib/need-leads/outreach-copy-templates';
import { buildNeedCardSnapshot } from '@/lib/need-leads/build-need-card-snapshot';
import { deductLeadFee, getLeadFeeForUser } from './wallet-lead-fee';
import { getStandardLeadFeeToman, getQualityLeadFeeToman } from './env';
import type { VipQualifiedBusiness } from './business-matching';

/**
 * A "quality" lead has confirmed budget, area, and urgency, plus a phone-verified
 * owner — matches the pricing spec's definition of a higher-value lead worth a
 * higher flat fee than a "standard" lead with only partial details.
 */
function isQualityLead(need: NeedMatchContext, ownerPhoneVerified: boolean): boolean {
  const hasBudget = need.budgetMin != null || need.budgetMax != null;
  const hasArea = Boolean(need.neighborhoodId || need.city);
  const hasUrgency = Boolean(need.dynamicAnswers?.urgency);
  return ownerPhoneVerified && hasBudget && hasArea && hasUrgency;
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

export async function sendVipLeadToBusiness(params: {
  requestId: string;
  need: NeedMatchContext;
  business: VipQualifiedBusiness;
  needOwnerUserId: string;
}): Promise<{ ok: true; outreachId: string } | { ok: false; skipReason: string }> {
  const { requestId, need, business, needOwnerUserId } = params;
  const owner = await db.user.findUnique({
    where: { id: needOwnerUserId },
    select: { phoneVerified: true },
  });
  const baseLeadFee = isQualityLead(need, owner?.phoneVerified ?? false)
    ? getQualityLeadFeeToman()
    : getStandardLeadFeeToman();
  const idempotencyKey = `lead:${requestId}:${business.userId}`;

  const existing = await db.needLeadOutreach.findUnique({
    where: { idempotencyKey },
  });
  if (existing?.status === 'SENT' && existing.walletTransactionId) {
    return { ok: false, skipReason: 'duplicate' };
  }

  const platformAiId = await getPlatformAiUserId();
  const copy = generateOutreachCopy(need, {
    ...business,
    name: '',
    slug: '',
    rating: 0,
    reviewCount: 0,
    verified: false,
    matchScore: business.matchScore,
    matchReasonFa: business.matchReasonFa,
  });
  const snapshot = await buildNeedCardSnapshot(requestId, need, business.matchReasonFa);
  if (!snapshot) return { ok: false, skipReason: 'request_not_found' };

  try {
    const result = await db.$transaction(
      async (tx) => {
        const leadFee = await getLeadFeeForUser(tx, business.userId, baseLeadFee);
        const { transaction } = await deductLeadFee(tx, {
          userId: business.userId,
          amount: leadFee,
          idempotencyKey,
          referenceId: requestId,
        });

        const conversation = await ensureConversationInTx(tx, {
          userId1: platformAiId,
          userId2: business.userId,
          requestId,
        });

        const introPreview = copy.introFa.slice(0, 200);
        const intro = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: platformAiId,
            content: copy.introFa,
            type: 'TEXT',
            isRead: false,
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessage: introPreview, lastMessageAt: new Date() },
        });

        const cardPreview = `نیاز: ${snapshot.title}`;
        const card = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: platformAiId,
            content: JSON.stringify(snapshot),
            type: 'NEED_CARD',
            isRead: false,
          },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { lastMessage: cardPreview, lastMessageAt: new Date() },
        });

        const outreach = await tx.needLeadOutreach.upsert({
          where: { idempotencyKey },
          create: {
            requestId,
            businessProfileId: business.id,
            businessUserId: business.userId,
            matchScore: business.qualifyScore,
            matchReasonFa: business.qualifyReasonFa,
            status: 'SENT',
            accessPhase: 'PRIVATE',
            idempotencyKey,
            leadFeeAmount: leadFee,
            feeDeductedAt: new Date(),
            walletTransactionId: transaction.id,
            conversationId: conversation.id,
            introMessageId: intro.id,
            cardMessageId: card.id,
          },
          update: {
            status: 'SENT',
            accessPhase: 'PRIVATE',
            matchScore: business.qualifyScore,
            matchReasonFa: business.qualifyReasonFa,
            leadFeeAmount: leadFee,
            feeDeductedAt: new Date(),
            walletTransactionId: transaction.id,
            conversationId: conversation.id,
            introMessageId: intro.id,
            cardMessageId: card.id,
            skipReason: null,
          },
        });

        return { outreachId: outreach.id, conversationId: conversation.id };
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
    );

    await db.notification.create({
      data: {
        userId: business.userId,
        type: 'AI_NEED_LEAD',
        title: 'لید VIP جدید',
        message: `یک نیاز VIP${snapshot.city ? ` در ${snapshot.city}` : ''}: «${snapshot.title}»`,
        data: JSON.stringify({
          requestId,
          conversationId: result.conversationId,
          businessProfileId: business.id,
          accessPhase: 'PRIVATE',
        }),
      },
    });

    return { ok: true, outreachId: result.outreachId };
  } catch (e) {
    console.error('sendVipLeadToBusiness failed:', e);
    await db.needLeadOutreach.upsert({
      where: { idempotencyKey },
      create: {
        requestId,
        businessProfileId: business.id,
        businessUserId: business.userId,
        matchScore: business.qualifyScore,
        matchReasonFa: business.qualifyReasonFa,
        status: 'FAILED',
        skipReason: 'send_error',
        accessPhase: 'PRIVATE',
        idempotencyKey,
        leadFeeAmount: 0,
      },
      update: {
        status: 'FAILED',
        skipReason: 'send_error',
      },
    });
    return { ok: false, skipReason: 'send_error' };
  }
}
