import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ProposalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * ایجاد پیشنهاد جدید
   */
  async create(specialistId: string, dto: CreateProposalDto) {
    // Check request exists, is OPEN, and not expired
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (request.status !== 'OPEN') {
      throw new BadRequestException(
        'این درخواست دیگر باز نیست و نمی‌توانید برای آن پیشنهاد ارسال کنید',
      );
    }

    // Check if request is expired
    if (request.expiresAt && new Date() > request.expiresAt) {
      throw new BadRequestException('این درخواست منقضی شده است');
    }

    // Cannot propose on own request
    if (request.userId === specialistId) {
      throw new ForbiddenException('شما نمی‌توانید برای درخواست خود پیشنهاد ارسال کنید');
    }

    // Check if already proposed (not withdrawn/rejected)
    const existingProposal = await this.proposalRepo.findOne({
      where: {
        requestId: dto.requestId,
        userId: specialistId,
        status: { notIn: ['WITHDRAWN', 'REJECTED'] },
      },
    });

    if (existingProposal) {
      throw new BadRequestException('شما قبلاً برای این درخواست پیشنهاد ارسال کرده‌اید');
    }

    const proposal = await this.prisma.proposal.create({
      data: {
        message: dto.coverLetter,
        price: dto.estimatedBudget || 0,
        deliveryTime: dto.estimatedTime,
        deliveryUnit: dto.deliveryUnit || 'day',
        status: 'PENDING',
        requestId: dto.requestId,
        userId: specialistId,
      },
    });

    // Increment proposal count on request
    await this.prisma.serviceRequest.update({
      where: { id: dto.requestId },
      data: { proposalCount: { increment: 1 } },
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
          specialistId,
        }),
      },
    });

    // Publish event
    await this.redis.publish('proposals:created', {
      proposalId: proposal.id,
      requestId: dto.requestId,
      specialistId,
      requestOwnerId: request.userId,
    });

    // Load specialist relation for response
    const savedProposal = await this.prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: { user: true },
    });

    return savedProposal;
  }

  /**
   * دریافت تمام پیشنهادهای یک درخواست
   */
  async findByRequest(requestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const proposals = await this.prisma.proposal.findMany({
      where: { requestId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with rating stats
    const enrichedProposals = await Promise.all(
      proposals.map(async (proposal) => {
        const reviews = await this.prisma.review.findMany({
          where: { userId: proposal.userId },
          select: { rating: true },
        });

        const avgRating =
          reviews.length > 0
            ? Number(
                (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
              )
            : null;

        const projectCount = await this.prisma.proposal.count({
          where: {
            userId: proposal.userId,
            status: 'ACCEPTED',
          },
        });

        return {
          ...proposal,
          specialist: proposal.user
            ? {
                id: proposal.user.id,
                firstName: proposal.user.firstName,
                lastName: proposal.user.lastName,
                displayName: proposal.user.displayName,
                avatar: proposal.user.avatar,
                bio: proposal.user.bio,
                city: proposal.user.city,
                province: proposal.user.province,
                isVerified: proposal.user.isVerified,
                avgRating,
                totalReviews: reviews.length,
                completedProjects: projectCount,
              }
            : null,
        };
      }),
    );

    return enrichedProposals;
  }

  /**
   * دریافت پیشنهادهای یک متخصص
   */
  async findBySpecialist(specialistId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { userId: specialistId },
      include: { request: { include: { category: true, user: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return proposals;
  }

  /**
   * تغییر وضعیت پیشنهاد (پذیرش / رد / پس‌گرفتن)
   */
  async updateStatus(id: string, userId: string, dto: UpdateProposalStatusDto) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { request: { include: { user: true } }, user: true },
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    switch (dto.status) {
      case 'ACCEPTED':
        return this.acceptProposal(proposal, userId);
      case 'REJECTED':
        return this.rejectProposal(proposal, userId);
      case 'WITHDRAW':
        return this.withdrawProposal(proposal, userId);
      default:
        throw new BadRequestException('وضعیت نامعتبر است');
    }
  }

  /**
   * پس‌گرفتن پیشنهاد توسط متخصص
   */
  async withdraw(proposalId: string, specialistId: string) {
    const proposal = await this.proposalRepo.findOne({
      where: { id: proposalId },
      relations: ['request'],
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    return this.withdrawProposal(proposal, specialistId);
  }

  // ========== Private Helpers ==========

  /**
   * Accept proposal: set accepted, update request to IN_PROGRESS, reject other PENDING proposals
   */
  private async acceptProposal(proposal: any, userId: string) {
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

    // Accept this proposal
    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'ACCEPTED' },
    });

    // Reject all other PENDING proposals for this request
    const otherPending = await this.prisma.proposal.findMany({
      where: {
        requestId: proposal.requestId,
        status: 'PENDING',
        id: { not: proposal.id },
      },
    });

    if (otherPending.length > 0) {
      await this.prisma.proposal.updateMany({
        where: { id: { in: otherPending.map((p) => p.id) } },
        data: { status: 'REJECTED' },
      });
    }

    // Update request status
    await this.prisma.serviceRequest.update({
      where: { id: proposal.requestId },
      data: {
        status: 'IN_PROGRESS',
        selectedProposalId: proposal.id,
      },
    });

    // Notify accepted specialist
    await this.prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'PROPOSAL_ACCEPTED',
        title: 'پیشنهاد شما پذیرفته شد',
        message: `پیشنهاد شما برای درخواست "${proposal.request.title}" پذیرفته شد`,
        data: JSON.stringify({ requestId: proposal.requestId, proposalId: proposal.id }),
      },
    });

    // Notify rejected specialists
    for (const rejected of otherPending) {
      await this.prisma.notification.create({
        data: {
          userId: rejected.userId,
          type: 'PROPOSAL_REJECTED',
          title: 'پیشنهاد شما رد شد',
          message: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
          data: JSON.stringify({ requestId: proposal.requestId }),
        },
      });
    }

    // Publish events
    await this.redis.publish('proposals:accepted', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.userId,
      requestOwnerId: proposal.request.userId,
    });

    const saved = await this.prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: { user: true },
    });

    return saved;
  }

  /**
   * Reject proposal
   */
  private async rejectProposal(proposal: any, userId: string) {
    // Only request owner can reject
    if (proposal.request.userId !== userId) {
      throw new ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را رد کند');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل رد هستند');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'REJECTED' },
    });

    // Notify specialist
    await this.prisma.notification.create({
      data: {
        userId: proposal.userId,
        type: 'PROPOSAL_REJECTED',
        title: 'پیشنهاد شما رد شد',
        message: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
        data: JSON.stringify({ requestId: proposal.requestId, proposalId: proposal.id }),
      },
    });

    await this.redis.publish('proposals:rejected', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.userId,
    });

    const saved = await this.prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: { user: true },
    });

    return saved;
  }

  /**
   * Withdraw proposal
   */
  private async withdrawProposal(proposal: any, userId: string) {
    // Only specialist can withdraw their own proposal
    if (proposal.userId !== userId) {
      throw new ForbiddenException('شما فقط می‌توانید پیشنهاد خود را پس بگیرید');
    }

    if (proposal.status !== 'PENDING') {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل پس‌گرفتن هستند');
    }

    await this.prisma.proposal.update({
      where: { id: proposal.id },
      data: { status: 'WITHDRAWN' },
    });

    // Decrement proposal count
    await this.prisma.serviceRequest.update({
      where: { id: proposal.requestId },
      data: { proposalCount: { decrement: 1 } },
    });

    // Notify request owner
    await this.prisma.notification.create({
      data: {
        userId: proposal.request.userId,
        type: 'PROPOSAL_WITHDRAWN',
        title: 'یک پیشنهاد پس گرفته شد',
        message: `یک متخصص پیشنهاد خود را برای درخواست "${proposal.request.title}" پس گرفت`,
        data: JSON.stringify({ requestId: proposal.requestId, proposalId: proposal.id }),
      },
    });

    await this.redis.publish('proposals:withdrawn', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.userId,
      requestOwnerId: proposal.request.userId,
    });

    const saved = await this.prisma.proposal.findUnique({
      where: { id: proposal.id },
      include: { user: true },
    });

    return saved;
  }
}


