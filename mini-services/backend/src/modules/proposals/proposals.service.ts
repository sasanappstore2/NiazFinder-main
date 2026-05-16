import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Proposal, ProposalStatus, ProposalDeliveryUnit } from '../../entities/proposal.entity';
import { Request, RequestStatus } from '../../entities/request.entity';
import { User, UserRole } from '../../entities/user.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { UpdateProposalStatusDto } from './dto/update-proposal-status.dto';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class ProposalsService {
  constructor(
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Request)
    private readonly requestRepo: Repository<Request>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly redis: RedisService,
  ) {}

  /**
   * ایجاد پیشنهاد جدید
   */
  async create(specialistId: string, dto: CreateProposalDto) {
    // Check request exists, is OPEN, and not expired
    const request = await this.requestRepo.findOne({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (request.status !== RequestStatus.OPEN) {
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
        specialistId,
        status: Not(In([ProposalStatus.WITHDRAWN, ProposalStatus.REJECTED])),
      },
    });

    if (existingProposal) {
      throw new BadRequestException('شما قبلاً برای این درخواست پیشنهاد ارسال کرده‌اید');
    }

    const proposal = this.proposalRepo.create({
      coverLetter: dto.coverLetter,
      estimatedBudget: dto.estimatedBudget || 0,
      estimatedTime: dto.estimatedTime,
      deliveryUnit: (dto.deliveryUnit || 'day') as ProposalDeliveryUnit,
      status: ProposalStatus.PENDING,
      requestId: dto.requestId,
      specialistId,
    });

    await this.proposalRepo.save(proposal);

    // Increment proposal count on request
    await this.requestRepo.increment({ id: dto.requestId }, 'proposalCount', 1);

    // Create notification for request owner
    await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: request.userId,
        type: 'NEW_PROPOSAL' as any,
        title: 'پیشنهاد جدید',
        body: `یک پیشنهاد جدید برای درخواست "${request.title}" دریافت شد`,
        data: {
          requestId: dto.requestId,
          proposalId: proposal.id,
          specialistId,
        },
      } as any),
    );

    // Publish event
    await this.redis.publish('proposals:created', {
      proposalId: proposal.id,
      requestId: dto.requestId,
      specialistId,
      requestOwnerId: request.userId,
    });

    // Load specialist relation for response
    const savedProposal = await this.proposalRepo.findOne({
      where: { id: proposal.id },
      relations: ['specialist'],
    });

    return savedProposal;
  }

  /**
   * دریافت تمام پیشنهادهای یک درخواست
   */
  async findByRequest(requestId: string) {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const proposals = await this.proposalRepo.find({
      where: { requestId },
      relations: ['specialist'],
      order: { createdAt: 'DESC' },
    });

    // Enrich with rating stats
    const enrichedProposals = await Promise.all(
      proposals.map(async (proposal) => {
        const reviews = await this.reviewRepo.find({
          where: { targetUserId: proposal.specialistId } as any,
          select: { rating: true },
        });

        const avgRating =
          reviews.length > 0
            ? Number(
                (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
              )
            : null;

        const projectCount = await this.proposalRepo.count({
          where: {
            specialistId: proposal.specialistId,
            status: ProposalStatus.ACCEPTED,
          },
        });

        return {
          ...proposal,
          specialist: proposal.specialist
            ? {
                id: proposal.specialist.id,
                firstName: proposal.specialist.firstName,
                lastName: proposal.specialist.lastName,
                displayName: proposal.specialist.displayName,
                avatar: proposal.specialist.avatar,
                bio: proposal.specialist.bio,
                city: proposal.specialist.city,
                province: proposal.specialist.province,
                isVerified: proposal.specialist.isVerified,
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
    const proposals = await this.proposalRepo.find({
      where: { specialistId },
      relations: ['request', 'request.category', 'request.user'],
      order: { createdAt: 'DESC' },
    });

    return proposals;
  }

  /**
   * تغییر وضعیت پیشنهاد (پذیرش / رد / پس‌گرفتن)
   */
  async updateStatus(id: string, userId: string, dto: UpdateProposalStatusDto) {
    const proposal = await this.proposalRepo.findOne({
      where: { id },
      relations: ['request', 'request.user', 'specialist'],
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
  private async acceptProposal(proposal: Proposal, userId: string) {
    // Only request owner can accept
    if (proposal.request.userId !== userId) {
      throw new ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را بپذیرد');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل قبول هستند');
    }

    if (proposal.request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('وضعیت درخواست اجازه پذیرش پیشنهاد را نمی‌دهد');
    }

    // Accept this proposal
    proposal.status = ProposalStatus.ACCEPTED;
    await this.proposalRepo.save(proposal);

    // Reject all other PENDING proposals for this request
    const otherPending = await this.proposalRepo.find({
      where: {
        requestId: proposal.requestId,
        status: ProposalStatus.PENDING,
        id: Not(proposal.id),
      },
    });

    if (otherPending.length > 0) {
      const ids = otherPending.map((p) => p.id);
      await this.proposalRepo.update(
        { id: In(ids) as any },
        { status: ProposalStatus.REJECTED },
      );
    }

    // Update request status
    proposal.request.status = RequestStatus.IN_PROGRESS;
    proposal.request.selectedProposalId = proposal.id;
    await this.requestRepo.save(proposal.request);

    // Notify accepted specialist
    await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: proposal.specialistId,
        type: 'PROPOSAL_ACCEPTED' as any,
        title: 'پیشنهاد شما پذیرفته شد',
        body: `پیشنهاد شما برای درخواست "${proposal.request.title}" پذیرفته شد`,
        data: { requestId: proposal.requestId, proposalId: proposal.id },
      } as any),
    );

    // Notify rejected specialists
    for (const rejected of otherPending) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: rejected.specialistId,
          type: 'PROPOSAL_REJECTED' as any,
          title: 'پیشنهاد شما رد شد',
          body: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
          data: { requestId: proposal.requestId },
        } as any),
      );
    }

    // Publish events
    await this.redis.publish('proposals:accepted', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.specialistId,
      requestOwnerId: proposal.request.userId,
    });

    const saved = await this.proposalRepo.findOne({
      where: { id: proposal.id },
      relations: ['specialist'],
    });

    return saved;
  }

  /**
   * Reject proposal
   */
  private async rejectProposal(proposal: Proposal, userId: string) {
    // Only request owner can reject
    if (proposal.request.userId !== userId) {
      throw new ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را رد کند');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل رد هستند');
    }

    proposal.status = ProposalStatus.REJECTED;
    await this.proposalRepo.save(proposal);

    // Notify specialist
    await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: proposal.specialistId,
        type: 'PROPOSAL_REJECTED' as any,
        title: 'پیشنهاد شما رد شد',
        body: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
        data: { requestId: proposal.requestId, proposalId: proposal.id },
      } as any),
    );

    await this.redis.publish('proposals:rejected', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.specialistId,
    });

    const saved = await this.proposalRepo.findOne({
      where: { id: proposal.id },
      relations: ['specialist'],
    });

    return saved;
  }

  /**
   * Withdraw proposal
   */
  private async withdrawProposal(proposal: Proposal, userId: string) {
    // Only specialist can withdraw their own proposal
    if (proposal.specialistId !== userId) {
      throw new ForbiddenException('شما فقط می‌توانید پیشنهاد خود را پس بگیرید');
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException('فقط پیشنهادهای در انتظار قابل پس‌گرفتن هستند');
    }

    proposal.status = ProposalStatus.WITHDRAWN;
    await this.proposalRepo.save(proposal);

    // Decrement proposal count
    await this.requestRepo.increment({ id: proposal.requestId }, 'proposalCount', -1);

    // Notify request owner
    await this.notificationRepo.save(
      this.notificationRepo.create({
        userId: proposal.request.userId,
        type: 'PROPOSAL_WITHDRAWN' as any,
        title: 'یک پیشنهاد پس گرفته شد',
        body: `یک متخصص پیشنهاد خود را برای درخواست "${proposal.request.title}" پس گرفت`,
        data: { requestId: proposal.requestId, proposalId: proposal.id },
      } as any),
    );

    await this.redis.publish('proposals:withdrawn', {
      proposalId: proposal.id,
      requestId: proposal.requestId,
      specialistId: proposal.specialistId,
      requestOwnerId: proposal.request.userId,
    });

    const saved = await this.proposalRepo.findOne({
      where: { id: proposal.id },
      relations: ['specialist'],
    });

    return saved;
  }
}


