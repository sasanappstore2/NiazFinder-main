import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';

@Injectable()
export class ProposalsService {
  constructor(private prisma: PrismaService) {}

  async findByRequest(requestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const proposals = await this.prisma.proposal.findMany({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            bio: true,
            city: true,
            province: true,
            isVerified: true,
            createdAt: true,
            _count: {
              select: {
                reviews: true,
                sentProposals: true,
              },
            },
          },
        },
      },
    });

    // Add average rating for each specialist
    const enrichedProposals = await Promise.all(
      proposals.map(async (proposal) => {
        const reviews = await this.prisma.review.findMany({
          where: { userId: proposal.userId, isPublished: true },
          select: { rating: true },
        });

        const avgRating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;

        const projectCount = await this.prisma.proposal.count({
          where: {
            userId: proposal.userId,
            status: 'ACCEPTED',
          },
        });

        return {
          ...proposal,
          user: {
            ...proposal.user,
            avgRating,
            totalReviews: reviews.length,
            completedProjects: projectCount,
          },
        };
      }),
    );

    return enrichedProposals;
  }

  async create(userId: string, dto: CreateProposalDto) {
    // Check request exists and is OPEN
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.requestId },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (request.status !== 'OPEN') {
      throw new BadRequestException('این درخواست دیگر باز نیست و نمی‌توانید برای آن پیشنهاد ارسال کنید');
    }

    // Cannot propose on own request
    if (request.userId === userId) {
      throw new ForbiddenException('شما نمی‌توانید برای درخواست خود پیشنهاد ارسال کنید');
    }

    // Check if already proposed
    const existingProposal = await this.prisma.proposal.findFirst({
      where: {
        requestId: dto.requestId,
        userId,
        status: { notIn: ['WITHDRAWN', 'REJECTED'] },
      },
    });

    if (existingProposal) {
      throw new BadRequestException('شما قبلاً برای این درخواست پیشنهاد ارسال کرده‌اید');
    }

    // Create proposal and increment proposalCount in a transaction
    const proposal = await this.prisma.$transaction(async (tx) => {
      const newProposal = await tx.proposal.create({
        data: {
          requestId: dto.requestId,
          userId,
          price: dto.price,
          deliveryTime: dto.deliveryTime,
          deliveryUnit: dto.deliveryUnit || 'day',
          message: dto.message,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
              city: true,
              isVerified: true,
            },
          },
        },
      });

      // Increment proposal count
      await tx.serviceRequest.update({
        where: { id: dto.requestId },
        data: { proposalCount: { increment: 1 } },
      });

      return newProposal;
    });

    // Create notification for request owner
    await this.prisma.notification.create({
      data: {
        userId: request.userId,
        type: 'NEW_PROPOSAL',
        title: 'پیشنهاد جدید',
        message: `یک پیشنهاد جدید برای درخواست "${request.title}" دریافت شد`,
        data: JSON.stringify({
          requestId: dto.requestId,
          proposalId: proposal.id,
          userId,
        }),
      },
    });

    return proposal;
  }

  async accept(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        request: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    // Only request owner can accept
    if (proposal.request.userId !== userId) {
      throw new ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را بپذیرد');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل قبول هستند');
    }

    if (proposal.request.status !== 'OPEN') {
      throw new BadRequestException('وضعیت درخواست اجازه پذیرش پیشنهاد را نمی‌دهد');
    }

    // Accept proposal, reject others, update request status in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Accept this proposal
      const accepted = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: 'ACCEPTED' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
              city: true,
              isVerified: true,
            },
          },
        },
      });

      // Reject all other pending proposals for this request
      await tx.proposal.updateMany({
        where: {
          requestId: proposal.requestId,
          status: 'PENDING',
          id: { not: proposalId },
        },
        data: { status: 'REJECTED' },
      });

      // Update request status
      const updatedRequest = await tx.serviceRequest.update({
        where: { id: proposal.requestId },
        data: {
          status: 'IN_PROGRESS',
          selectedProposalId: proposalId,
        },
      });

      return { accepted, updatedRequest };
    });

    // Notify accepted specialist
    await this.prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'PROPOSAL_ACCEPTED',
        title: 'پیشنهاد شما پذیرفته شد',
        message: `پیشنهاد شما برای درخواست "${proposal.request.title}" پذیرفته شد`,
        data: JSON.stringify({
          requestId: proposal.requestId,
          proposalId,
        }),
      },
    });

    // Notify rejected specialists
    const rejectedProposals = await this.prisma.proposal.findMany({
      where: {
        requestId: proposal.requestId,
        status: 'REJECTED',
        userId: { not: userId },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    for (const rejected of rejectedProposals) {
      await this.prisma.notification.create({
        data: {
          userId: rejected.userId,
          type: 'PROPOSAL_REJECTED',
          title: 'پیشنهاد شما رد شد',
          message: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
          data: JSON.stringify({
            requestId: proposal.requestId,
          }),
        },
      });
    }

    return result.accepted;
  }

  async reject(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        request: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    if (proposal.request.userId !== userId) {
      throw new ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را رد کند');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل رد هستند');
    }

    const rejected = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
            city: true,
            isVerified: true,
          },
        },
      },
    });

    // Notify the specialist
    await this.prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'PROPOSAL_REJECTED',
        title: 'پیشنهاد شما رد شد',
        message: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
        data: JSON.stringify({
          requestId: proposal.requestId,
          proposalId,
        }),
      },
    });

    return rejected;
  }

  async withdraw(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    if (proposal.userId !== userId) {
      throw new ForbiddenException('شما فقط می‌توانید پیشنهاد خود را پس بگیرید');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل پس‌گرفتن هستند');
    }

    // Withdraw and decrement proposal count in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const withdrawn = await tx.proposal.update({
        where: { id: proposalId },
        data: { status: 'WITHDRAWN' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
              city: true,
              isVerified: true,
            },
          },
        },
      });

      // Decrement proposal count
      await tx.serviceRequest.update({
        where: { id: proposal.requestId },
        data: { proposalCount: { decrement: 1 } },
      });

      return withdrawn;
    });

    return result;
  }

  async findByUser(userId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        request: {
          include: {
            category: {
              select: { id: true, name: true, slug: true, icon: true },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatar: true,
                city: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });

    return proposals;
  }

  async getStats(userId: string) {
    const [total, pending, accepted, rejected, withdrawn] = await Promise.all([
      this.prisma.proposal.count({ where: { userId } }),
      this.prisma.proposal.count({
        where: { userId, status: 'PENDING' },
      }),
      this.prisma.proposal.count({
        where: { userId, status: 'ACCEPTED' },
      }),
      this.prisma.proposal.count({
        where: { userId, status: 'REJECTED' },
      }),
      this.prisma.proposal.count({
        where: { userId, status: 'WITHDRAWN' },
      }),
    ]);

    // Acceptance rate
    const acceptanceRate =
      total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      total,
      pending,
      accepted,
      rejected,
      withdrawn,
      acceptanceRate,
    };
  }
}
