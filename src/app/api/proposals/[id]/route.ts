import { NextRequest, NextResponse } from 'next/server';
import type { Prisma, ProposalStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Thrown inside the accept/reject transaction when the proposal is no longer in
 * a mutable state (e.g. a concurrent request already ACCEPTED a sibling proposal
 * or transitioned this one). Surfaced as 409.
 */
class ProposalStateError extends Error {
  constructor() {
    super('PROPOSAL_STATE_CONFLICT');
    this.name = 'ProposalStateError';
  }
}

// ============ PUT handler ============

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const proposal = await db.proposal.findUnique({
      where: { id },
      include: {
        request: {
          select: { id: true, title: true, userId: true, status: true },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { error: 'پیشنهاد مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Must be proposal owner or request owner (or admin)
    if (
      proposal.userId !== user.id &&
      proposal.request.userId !== user.id &&
      !['ADMIN', 'SUPER_ADMIN'].includes(user.role)
    ) {
      return NextResponse.json(
        { error: 'شما اجازه تغییر این پیشنهاد را ندارید' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['ACCEPT', 'REJECT', 'WITHDRAW'].includes(status)) {
      return NextResponse.json(
        { error: 'وضعیت نامعتبر است (مقادیر مجاز: ACCEPT, REJECT, WITHDRAW)' },
        { status: 400 }
      );
    }

    // Map frontend action to DB status
    const statusMap: Record<string, ProposalStatus> = {
      ACCEPT: 'ACCEPTED',
      REJECT: 'REJECTED',
      WITHDRAW: 'WITHDRAWN',
    };

    const newStatus = statusMap[status] as ProposalStatus;

    // Only request owner can ACCEPT or REJECT
    if ((status === 'ACCEPT' || status === 'REJECT') && proposal.request.userId !== user.id) {
      return NextResponse.json(
        { error: 'فقط صاحب نیاز می‌تواند پیشنهاد را بپذیرد یا رد کند' },
        { status: 403 }
      );
    }

    // Only proposal owner can WITHDRAW
    if (status === 'WITHDRAW' && proposal.userId !== user.id) {
      return NextResponse.json(
        { error: 'فقط صاحب پیشنهاد می‌تواند آن را پس بگیرد' },
        { status: 403 }
      );
    }

    if (proposal.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'فقط پیشنهادهای در انتظار قابل تغییر هستند' },
        { status: 400 }
      );
    }

    // Accept/reject/withdraw atomically. For ACCEPT we lock the parent request
    // and re-assert invariants under the lock so two concurrent ACCEPTs can't
    // both win. Notifications are created inside the tx (createMany) so a
    // mid-flight failure can't leave proposals updated but notifications missing.
    const updatedProposal = await db.$transaction(
      async (tx) => {
        // Lock the parent request; concurrent transitions on sibling proposals serialize here.
        await tx.$executeRaw`SELECT id FROM "ServiceRequest" WHERE id = ${proposal.request.id} FOR UPDATE`;

        // Re-read this proposal under the lock — it must still be PENDING.
        const current = await tx.proposal.findUnique({
          where: { id },
          select: { status: true },
        });
        if (!current || current.status !== 'PENDING') {
          throw new ProposalStateError();
        }

        // No sibling proposal may already be ACCEPTED for this request.
        if (status === 'ACCEPT') {
          const alreadyAccepted = await tx.proposal.findFirst({
            where: { requestId: proposal.request.id, status: 'ACCEPTED' },
            select: { id: true },
          });
          if (alreadyAccepted) {
            throw new ProposalStateError();
          }
        }

        const updated = await tx.proposal.update({
          where: { id },
          data: { status: newStatus },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
                bio: true,
                city: true,
                isVerified: true,
              },
            },
          },
        });

        const notifications: Prisma.NotificationCreateManyInput[] = [];

        // If ACCEPTED: update request status to IN_PROGRESS and set selectedProposalId
        if (status === 'ACCEPT') {
          await tx.serviceRequest.update({
            where: { id: proposal.request.id },
            data: {
              status: 'IN_PROGRESS',
              selectedProposalId: proposal.id,
            },
          });

          // Reject all other pending proposals
          await tx.proposal.updateMany({
            where: {
              requestId: proposal.request.id,
              id: { not: proposal.id },
              status: 'PENDING',
            },
            data: { status: 'REJECTED' },
          });

          // Notify the specialist (proposal owner) that their proposal was accepted
          notifications.push({
            userId: proposal.userId,
            type: 'PROPOSAL_ACCEPTED',
            title: 'پیشنهاد شما پذیرفته شد',
            message: `پیشنهاد شما برای نیاز "${proposal.request.title}" پذیرفته شد`,
            data: JSON.stringify({
              requestId: proposal.request.id,
              proposalId: proposal.id,
            }),
          });

          // Notify all other specialists whose proposals were rejected
          const otherProposals = await tx.proposal.findMany({
            where: {
              requestId: proposal.request.id,
              userId: { not: proposal.userId },
              status: 'REJECTED',
            },
            select: { userId: true },
            distinct: ['userId'],
          });

          for (const other of otherProposals) {
            notifications.push({
              userId: other.userId,
              type: 'PROPOSAL_REJECTED',
              title: 'پیشنهاد شما رد شد',
              message: `پیشنهاد شما برای نیاز "${proposal.request.title}" رد شد`,
              data: JSON.stringify({
                requestId: proposal.request.id,
              }),
            });
          }
        } else if (status === 'REJECT') {
          // Notify the specialist that their proposal was rejected
          notifications.push({
            userId: proposal.userId,
            type: 'PROPOSAL_REJECTED',
            title: 'پیشنهاد شما رد شد',
            message: `پیشنهاد شما برای نیاز "${proposal.request.title}" رد شد`,
            data: JSON.stringify({
              requestId: proposal.request.id,
              proposalId: proposal.id,
            }),
          });
        } else if (status === 'WITHDRAW') {
          // Notify the request owner that a proposal was withdrawn
          notifications.push({
            userId: proposal.request.userId,
            type: 'PROPOSAL_WITHDRAWN',
            title: 'یک پیشنهاد پس گرفته شد',
            message: `یک کسب‌وکار پیشنهاد خود را برای نیاز "${proposal.request.title}" پس گرفت`,
            data: JSON.stringify({
              requestId: proposal.request.id,
              proposalId: proposal.id,
            }),
          });
        }

        if (notifications.length > 0) {
          await tx.notification.createMany({ data: notifications });
        }

        return updated;
      },
      { isolationLevel: 'Serializable', maxWait: 5000, timeout: 15000 }
    );

    const result = {
      id: updatedProposal.id,
      price: updatedProposal.price,
      deliveryTime: updatedProposal.deliveryTime,
      deliveryUnit: updatedProposal.deliveryUnit,
      message: updatedProposal.message,
      status: updatedProposal.status,
      isRead: updatedProposal.isRead,
      createdAt: updatedProposal.createdAt.toISOString(),
      updatedAt: updatedProposal.updatedAt.toISOString(),
      user: updatedProposal.user,
    };

    return NextResponse.json(
      { message: 'وضعیت پیشنهاد بروزرسانی شد', proposal: result }
    );
  } catch (error) {
    if (error instanceof ProposalStateError) {
      return NextResponse.json(
        { error: 'وضعیت این پیشنهاد تغییر کرده است؛ لطفاً صفحه را تازه‌سازی کنید' },
        { status: 409 }
      );
    }
    console.error('Proposal detail PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
