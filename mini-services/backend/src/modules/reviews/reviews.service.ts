import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a review - validates user completed the project, prevents duplicates,
   * updates target user's computed rating, creates notification
   */
  async create(userId: string, dto: CreateReviewDto) {
    // Check if the target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId },
      select: { id: true, isActive: true, isBanned: true },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر برای بررسی یافت نشد');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('کاربر مورد نظر غیرفعال است');
    }

    // Check if the request exists
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.requestId },
      select: { id: true, title: true, status: true, userId: true },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Check if the proposal exists and was ACCEPTED
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: dto.proposalId },
      select: {
        id: true,
        status: true,
        userId: true,
        requestId: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException('پیشنهاد مورد نظر یافت نشد');
    }

    if (proposal.requestId !== dto.requestId) {
      throw new BadRequestException('پیشنهاد مربوط به این درخواست نیست');
    }

    // Validate proposal was ACCEPTED (project completed)
    if (proposal.status !== 'ACCEPTED') {
      throw new BadRequestException('فقط می‌توانید برای پروژه‌های تکمیل شده نظر ثبت کنید');
    }

    // Validate user is a participant: must be request owner or proposal owner
    const isRequestOwner = request.userId === userId;
    const isProposalOwner = proposal.userId === userId;

    if (!isRequestOwner && !isProposalOwner) {
      throw new ForbiddenException('شما اجازه ثبت نظر برای این پروژه را ندارید');
    }

    // Reviewer must review the OTHER party (not self)
    if (userId === dto.targetUserId) {
      throw new BadRequestException('شما نمی‌توانید به خودتان نظر دهید');
    }

    // Validate targetUserId is the other participant
    const otherParticipant = isRequestOwner ? proposal.userId : request.userId;
    if (dto.targetUserId !== otherParticipant) {
      throw new BadRequestException('شما فقط می‌توانید به طرف مقابل پروژه نظر دهید');
    }

    // Check for duplicate review on same request
    const existingReview = await this.prisma.review.findFirst({
      where: {
        authorId: userId,
        requestId: dto.requestId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('شما قبلاً برای این درخواست نظر ثبت کرده‌اید');
    }

    // Calculate overall rating as average of category ratings
    const categoryRatings = [
      dto.qualityRating,
      dto.timingRating,
      dto.communicationRating,
      dto.professionalismRating,
    ].filter((r): r is number => r !== undefined && r !== null);

    const overallRating =
      categoryRatings.length > 0
        ? Math.round(
            (categoryRatings.reduce((sum, r) => sum + r, 0) / categoryRatings.length) * 2,
          ) / 2
        : dto.rating;

    // Create review in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          rating: overallRating,
          qualityRating: dto.qualityRating,
          timingRating: dto.timingRating,
          communicationRating: dto.communicationRating,
          professionalismRating: dto.professionalismRating,
          comment: dto.comment || null,
          pros: dto.pros,
          cons: dto.cons,
          isRecommended: dto.isRecommended ?? false,
          isPublished: true,
          authorId: userId,
          userId: dto.targetUserId,
          requestId: dto.requestId,
          proposalId: dto.proposalId,
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });

      // Update target user's computed rating
      const ratingStats = await tx.review.aggregate({
        where: { userId: dto.targetUserId, isPublished: true },
        _avg: { rating: true },
        _count: true,
      });

      await tx.user.update({
        where: { id: dto.targetUserId },
        data: {
          averageRating: ratingStats._avg.rating
            ? Math.round(ratingStats._avg.rating * 10) / 10
            : 0,
          reviewCount: ratingStats._count,
        },
      });

      return review;
    });

    // Create notification for the reviewed user
    await this.prisma.notification.create({
      data: {
        userId: dto.targetUserId,
        type: 'NEW_REVIEW',
        title: 'نظر جدید',
        message: `${result.author.firstName || ''} ${result.author.lastName || ''} نظر جدیدی برای شما ثبت کرد`,
        data: JSON.stringify({
          reviewId: result.id,
          rating: overallRating,
          requestId: dto.requestId,
          authorId: userId,
        }),
      },
    });

    this.logger.log(`Review created: ${result.id} by user ${userId} for user ${dto.targetUserId}`);

    return {
      message: 'نظر شما با موفقیت ثبت شد',
      review: result,
    };
  }

  /**
   * Get reviews received by a user (paginated)
   */
  async findByUser(userId: string, query: { page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, displayName: true, avatar: true },
    });

    if (!user) {
      throw new NotFoundException('کاربر مورد نظر یافت نشد');
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { userId, isPublished: true },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
            },
          },
          request: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { userId, isPublished: true },
      }),
    ]);

    // Rating distribution
    const ratingDistribution = await this.prisma.review.groupBy({
      by: ['rating'],
      where: { userId, isPublished: true },
      _count: { rating: true },
    });

    const distributionMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distributionMap[r.rating] = r._count.rating;
    });

    const averageRating = await this.getAverageRating(userId);

    return {
      user,
      averageRating,
      totalReviews: total,
      ratingDistribution: distributionMap,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews,
    };
  }

  /**
   * Get all reviews for a specific request
   */
  async findByRequest(requestId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: requestId },
      select: { id: true, title: true },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const reviews = await this.prisma.review.findMany({
      where: { requestId, isPublished: true },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const avgResult = await this.prisma.review.aggregate({
      where: { requestId, isPublished: true },
      _avg: { rating: true },
    });

    return {
      request,
      totalReviews: reviews.length,
      averageRating: avgResult._avg.rating
        ? Math.round(avgResult._avg.rating * 10) / 10
        : 0,
      reviews,
    };
  }

  /**
   * Respond to a review (only the reviewed user can respond)
   */
  async respond(reviewId: string, userId: string, dto: RespondReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        authorId: true,
        response: true,
      },
    });

    if (!review) {
      throw new NotFoundException('نظر مورد نظر یافت نشد');
    }

    // Only the reviewed user can respond
    if (review.userId !== userId) {
      throw new ForbiddenException('فقط کاربر مورد بررسی می‌تواند به نظر پاسخ دهد');
    }

    if (review.response) {
      throw new BadRequestException('شما قبلاً به این نظر پاسخ داده‌اید');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { response: dto.response, respondedAt: new Date() },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Notify the reviewer that their review was responded to
    await this.prisma.notification.create({
      data: {
        userId: review.authorId,
        type: 'REVIEW_RESPONSE',
        title: 'پاسخ به نظر شما',
        message: 'به نظر شما پاسخ داده شد',
        data: JSON.stringify({
          reviewId,
          targetUserId: userId,
        }),
      },
    });

    return {
      message: 'پاسخ شما با موفقیت ثبت شد',
      review: updated,
    };
  }

  /**
   * Delete own review (admin can delete any)
   */
  async delete(reviewId: string, userId: string, userRole: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: {
          select: { id: true, role: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('نظر مورد نظر یافت نشد');
    }

    // Only the author or admin can delete
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
    if (review.authorId !== userId && !isAdmin) {
      throw new ForbiddenException('فقط نویسنده نظر یا مدیر می‌تواند این نظر را حذف کند');
    }

    // Get target user for rating recalculation
    const targetUserId = review.userId;

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Recalculate target user's average rating
    const ratingStats = await this.prisma.review.aggregate({
      where: { userId: targetUserId, isPublished: true },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: {
        averageRating: ratingStats._avg.rating
          ? Math.round(ratingStats._avg.rating * 10) / 10
          : 0,
        reviewCount: ratingStats._count,
      },
    });

    this.logger.log(`Review deleted: ${reviewId} by user ${userId}`);

    return {
      message: 'نظر با موفقیت حذف شد',
    };
  }

  /**
   * Get computed average rating for a user
   */
  async getAverageRating(userId: string) {
    const result = await this.prisma.review.aggregate({
      where: { userId, isPublished: true },
      _avg: {
        rating: true,
        qualityRating: true,
        timingRating: true,
        communicationRating: true,
        professionalismRating: true,
      },
      _count: true,
    });

    return {
      overall: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
      quality: result._avg.qualityRating ? Math.round(result._avg.qualityRating * 10) / 10 : null,
      timing: result._avg.timingRating ? Math.round(result._avg.timingRating * 10) / 10 : null,
      communication: result._avg.communicationRating ? Math.round(result._avg.communicationRating * 10) / 10 : null,
      professionalism: result._avg.professionalismRating ? Math.round(result._avg.professionalismRating * 10) / 10 : null,
      totalReviews: result._count,
    };
  }
}
