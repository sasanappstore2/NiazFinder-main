import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { userId, isPublished: true },
      }),
    ]);

    const averageRating = await this.getAverageRating(userId);

    return {
      user,
      averageRating,
      totalReviews: total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      reviews,
    };
  }

  async create(authorId: string, dto: CreateReviewDto) {
    // Check if the user being reviewed exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!targetUser) {
      throw new NotFoundException('کاربر مورد نظر برای بررسی یافت نشد');
    }

    // Check if the request exists
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id: dto.requestId },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Check not reviewing self
    if (authorId === dto.userId) {
      throw new BadRequestException('شما نمی‌توانید به خودتان نظر دهید');
    }

    // Check for duplicate review on same request
    const existingReview = await this.prisma.review.findFirst({
      where: {
        authorId,
        requestId: dto.requestId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('شما قبلاً برای این درخواست نظر ثبت کرده‌اید');
    }

    // Calculate overall rating as average of provided category ratings
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

    const review = await this.prisma.review.create({
      data: {
        rating: overallRating,
        qualityRating: dto.qualityRating,
        timingRating: dto.timingRating,
        communicationRating: dto.communicationRating,
        professionalismRating: dto.professionalismRating,
        comment: dto.comment,
        pros: dto.pros,
        cons: dto.cons,
        isRecommended: dto.isRecommended ?? false,
        authorId,
        userId: dto.userId,
        requestId: dto.requestId,
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

    return {
      message: 'نظر شما با موفقیت ثبت شد',
      review,
    };
  }

  async respond(reviewId: string, userId: string, dto: RespondReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('نظر مورد نظر یافت نشد');
    }

    // Only the reviewed user can respond
    if (review.userId !== userId) {
      throw new ForbiddenException('فقط کاربر مورد بررسی می‌تواند به نظر پاسخ دهد');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { response: dto.response },
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

    return {
      message: 'پاسخ شما با موفقیت ثبت شد',
      review: updated,
    };
  }

  async delete(reviewId: string, authorId: string) {
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
    if (review.authorId !== authorId && review.author.role !== 'ADMIN' && review.author.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('فقط نویسنده نظر یا مدیر می‌تواند این نظر را حذف کند');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return {
      message: 'نظر با موفقیت حذف شد',
    };
  }

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

    return {
      request,
      totalReviews: reviews.length,
      reviews,
    };
  }
}
