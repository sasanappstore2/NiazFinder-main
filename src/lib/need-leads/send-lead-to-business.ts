import { db } from '@/lib/db';
import type { NeedMatchContext } from '@/contracts/need-match';
import type { QualifiedLead } from './qualified-lead';
import { getPlatformAiUserId } from '@/lib/platform-ai/user';
import { ensureBusinessProfile } from '@/lib/business/ensure-profile';
import { ensureConversation, createSystemMessage } from '@/lib/chat/create-system-messages';
import { generateOutreachCopy } from './outreach-copy-templates';
import { buildNeedCardSnapshot } from './build-need-card-snapshot';
import { isUnderDailyCap } from './daily-cap';

export type SendLeadResult =
  | { ok: true; conversationId: string }
  | { ok: false; skipReason: string };

export async function sendLeadToBusiness(params: {
  requestId: string;
  need: NeedMatchContext;
  business: QualifiedLead;
  needOwnerUserId: string;
}): Promise<SendLeadResult> {
  const { requestId, need, business, needOwnerUserId } = params;

  if (business.userId === needOwnerUserId) {
    return { ok: false, skipReason: 'self_owner' };
  }

  let profile = await db.businessProfile.findUnique({
    where: { id: business.id },
    select: { id: true, leadAlertsEnabled: true, status: true },
  });

  if (!profile) {
    profile = await db.businessProfile.findUnique({
      where: { userId: business.userId },
      select: { id: true, leadAlertsEnabled: true, status: true },
    });
  }

  if (!profile) {
    const user = await db.user.findUnique({
      where: { id: business.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        address: true,
        phone: true,
        email: true,
        isVerified: true,
        createdAt: true,
        role: true,
      },
    });
    if (!user || user.role !== 'SPECIALIST') {
      return { ok: false, skipReason: 'inactive_profile' };
    }
    const ensured = await ensureBusinessProfile(user);
    profile = {
      id: ensured.id,
      leadAlertsEnabled: ensured.leadAlertsEnabled,
      status: ensured.status,
    };
  }

  const businessProfileId = profile.id;

  if (profile.status !== 'ACTIVE') {
    return { ok: false, skipReason: 'inactive_profile' };
  }

  if (profile.leadAlertsEnabled === false) {
    return { ok: false, skipReason: 'alerts_disabled' };
  }

  const existing = await db.needLeadOutreach.findUnique({
    where: {
      requestId_businessUserId: { requestId, businessUserId: business.userId },
    },
  });

  if (existing?.status === 'SENT') {
    return { ok: false, skipReason: 'duplicate' };
  }

  if (!(await isUnderDailyCap(business.userId))) {
    await db.needLeadOutreach.upsert({
      where: {
        requestId_businessUserId: { requestId, businessUserId: business.userId },
      },
      create: {
        requestId,
        businessProfileId,
        businessUserId: business.userId,
        matchScore: business.qualifyScore,
        matchReasonFa: business.qualifyReasonFa,
        status: 'SKIPPED',
        skipReason: 'daily_cap',
      },
      update: {
        status: 'SKIPPED',
        skipReason: 'daily_cap',
      },
    });
    return { ok: false, skipReason: 'daily_cap' };
  }

  const platformAiId = await getPlatformAiUserId();
  const copy = generateOutreachCopy(need, business);
  const snapshot = await buildNeedCardSnapshot(requestId, need, business.matchReasonFa);

  if (!snapshot) {
    return { ok: false, skipReason: 'request_not_found' };
  }

  const conversation = await ensureConversation({
    userId1: platformAiId,
    userId2: business.userId,
    requestId,
  });

  try {
    const intro = await createSystemMessage({
      conversationId: conversation.id,
      senderId: platformAiId,
      content: copy.introFa,
      type: 'TEXT',
      lastMessagePreview: copy.introFa.slice(0, 200),
    });

    const cardPreview = `نیاز: ${snapshot.title}`;
    const card = await createSystemMessage({
      conversationId: conversation.id,
      senderId: platformAiId,
      content: JSON.stringify(snapshot),
      type: 'NEED_CARD',
      lastMessagePreview: cardPreview,
    });

    await db.needLeadOutreach.upsert({
      where: {
        requestId_businessUserId: { requestId, businessUserId: business.userId },
      },
      create: {
        requestId,
        businessProfileId,
        businessUserId: business.userId,
        matchScore: business.qualifyScore,
        matchReasonFa: business.qualifyReasonFa,
        status: 'SENT',
        conversationId: conversation.id,
        introMessageId: intro.id,
        cardMessageId: card.id,
      },
      update: {
        status: 'SENT',
        matchScore: business.qualifyScore,
        matchReasonFa: business.qualifyReasonFa,
        conversationId: conversation.id,
        introMessageId: intro.id,
        cardMessageId: card.id,
        skipReason: null,
      },
    });

    await db.notification.create({
      data: {
        userId: business.userId,
        type: 'AI_NEED_LEAD',
        title: 'نیاز جدید متناسب با کسب‌وکار شما',
        message: `یک آگهی نیاز جدید${snapshot.city ? ` در ${snapshot.city}` : ''} پیدا شد: «${snapshot.title}»`,
        data: JSON.stringify({
          requestId,
          conversationId: conversation.id,
          businessProfileId,
        }),
      },
    });

    return { ok: true, conversationId: conversation.id };
  } catch (e) {
    console.error('sendLeadToBusiness failed:', e);
    await db.needLeadOutreach.upsert({
      where: {
        requestId_businessUserId: { requestId, businessUserId: business.userId },
      },
      create: {
        requestId,
        businessProfileId,
        businessUserId: business.userId,
        matchScore: business.qualifyScore,
        matchReasonFa: business.qualifyReasonFa,
        status: 'FAILED',
        skipReason: 'send_error',
      },
      update: {
        status: 'FAILED',
        skipReason: 'send_error',
      },
    });
    return { ok: false, skipReason: 'send_error' };
  }
}
