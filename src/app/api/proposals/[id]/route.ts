import { NextRequest, NextResponse } from 'next/server';
import type { ProposalStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

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

    // Update proposal and potentially the request in a transaction
    const updatedProposal = await db.$transaction(async (tx) => {
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
      }

      return updated;
    });

    // Create notifications
    if (status === 'ACCEPT') {
      // Notify the specialist (proposal owner) that their proposal was accepted
      await db.notification.create({
        data: {
          userId: proposal.userId,
          type: 'PROPOSAL_ACCEPTED',
          title: 'پیشنهاد شما پذیرفته شد',
          message: `پیشنهاد شما برای نیاز "${proposal.request.title}" پذیرفته شد`,
          data: JSON.stringify({
            requestId: proposal.request.id,
            proposalId: proposal.id,
          }),
        },
      });

      // Notify all other specialists whose proposals were rejected
      const otherProposals = await db.proposal.findMany({
        where: {
          requestId: proposal.request.id,
          userId: { not: proposal.userId },
          status: 'REJECTED',
        },
        select: { userId: true },
        distinct: ['userId'],
      });

      for (const other of otherProposals) {
        await db.notification.create({
          data: {
            userId: other.userId,
            type: 'PROPOSAL_REJECTED',
            title: 'پیشنهاد شما رد شد',
            message: `پیشنهاد شما برای نیاز "${proposal.request.title}" رد شد`,
            data: JSON.stringify({
              requestId: proposal.request.id,
            }),
          },
        });
      }
    } else if (status === 'REJECT') {
      // Notify the specialist that their proposal was rejected
      await db.notification.create({
        data: {
          userId: proposal.userId,
          type: 'PROPOSAL_REJECTED',
          title: 'پیشنهاد شما رد شد',
          message: `پیشنهاد شما برای نیاز "${proposal.request.title}" رد شد`,
          data: JSON.stringify({
            requestId: proposal.request.id,
            proposalId: proposal.id,
          }),
        },
      });
    } else if (status === 'WITHDRAW') {
      // Notify the request owner that a proposal was withdrawn
      await db.notification.create({
        data: {
          userId: proposal.request.userId,
          type: 'PROPOSAL_WITHDRAWN',
          title: 'یک پیشنهاد پس گرفته شد',
          message: `یک کسب‌وکار پیشنهاد خود را برای نیاز "${proposal.request.title}" پس گرفت`,
          data: JSON.stringify({
            requestId: proposal.request.id,
            proposalId: proposal.id,
          }),
        },
      });
    }

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
    console.error('Proposal detail PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
