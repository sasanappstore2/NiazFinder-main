import { db } from '@/lib/db';
import { canUsersVoiceCall } from '@/lib/voice/can-call';

export async function canAccessUserContact(
  viewerId: string,
  targetUserId: string,
  opts?: { requestId?: string }
): Promise<boolean> {
  if (viewerId === targetUserId) return false;

  const activeBusiness = await db.businessProfile.findFirst({
    where: { userId: targetUserId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (activeBusiness) return true;

  const { allowed: hasConversation } = await canUsersVoiceCall(viewerId, targetUserId);
  if (hasConversation) return true;

  if (opts?.requestId) {
    const openNeed = await db.serviceRequest.findFirst({
      where: {
        id: opts.requestId,
        userId: targetUserId,
        status: 'OPEN',
      },
      select: { id: true },
    });
    if (openNeed) return true;
  }

  const sharedProposal = await db.proposal.findFirst({
    where: {
      OR: [
        { userId: viewerId, request: { userId: targetUserId } },
        { userId: targetUserId, request: { userId: viewerId } },
      ],
      status: { not: 'WITHDRAWN' },
    },
    select: { id: true },
  });
  if (sharedProposal) return true;

  return false;
}
