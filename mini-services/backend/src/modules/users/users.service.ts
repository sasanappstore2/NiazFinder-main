import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * لیست کاربران با فیلتر و صفحه‌بندی (مدیر)
   */
  async findAll(query: QueryUsersDto) {
    const { page, limit, role, city, search, isVerified } = query;
    const sort = query.sort || 'newest';
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      isActive: true,
      ...(role && { role: role as any }),
      ...(city && { city: { contains: city } }),
      ...(isVerified !== undefined && { isVerified }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { displayName: { contains: search } },
          { bio: { contains: search } },
        ],
      }),
    };

    const orderBy = this.getOrderBy(sort);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userSelectFields(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * مشاهده پروفایل کاربر
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelectFields(),
        skills: {
          include: {
            skill: true,
          },
          where: {
            skill: { isActive: true },
          },
        },
        _count: {
          select: {
            portfolios: { where: { isPublished: true } },
            reviews: true,
            sentProposals: true,
          },
        },
        reviews: {
          select: { rating: true },
          where: { isPublished: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const totalRating = user.reviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingCount = user.reviews.length;
    const averageRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;

    const { reviews, _count, ...userData } = user as any;

    return {
      ...userData,
      portfolioCount: _count.portfolios,
      reviewCount: _count.reviews,
      proposalCount: _count.sentProposals,
      ratingAverage: averageRating,
      ratingCount,
    };
  }

  /**
   * بروزرسانی پروفایل کاربر
   */
  async updateProfile(id: string, dto: Record<string, any>) {
    await this.ensureUserExists(id);

    const allowedFields = [
      'firstName',
      'lastName',
      'displayName',
      'bio',
      'city',
      'province',
      'address',
    ];

    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (dto[key] !== undefined) {
        updateData[key] = dto[key];
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('حداقل یک فیلد برای بروزرسانی ارسال کنید');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.userSelectFields(),
    });

    return { user, message: 'پروفایل با موفقیت بروزرسانی شد' };
  }

  /**
   * بروزرسانی آواتار کاربر
   */
  async updateAvatar(id: string, avatarUrl: string) {
    await this.ensureUserExists(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      select: this.userSelectFields(),
    });

    return { user, message: 'آواتار با موفقیت بروزرسانی شد' };
  }

  /**
   * جستجوی کاربران
   */
  async search(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { displayName: { contains: query } },
          { bio: { contains: query } },
          {
            skills: {
              some: {
                skill: {
                  name: { contains: query },
                  isActive: true,
                },
              },
            },
          },
        ],
      },
      select: this.userSelectFields(),
      take: 20,
    });

    return { users, message: `${users.length} کاربر پیدا شد` };
  }

  /**
   * پروفایل کامل متخصص
   */
  async getSpecialistProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, role: 'SPECIALIST', isActive: true },
      select: {
        ...this.userSelectFields(),
        skills: {
          include: { skill: true },
          where: { skill: { isActive: true } },
        },
        portfolios: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
        reviews: {
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
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            portfolios: { where: { isPublished: true } },
            reviews: { where: { isPublished: true } },
            sentProposals: { where: { status: 'ACCEPTED' } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('متخصص مورد نظر یافت نشد');
    }

    const allReviews = await this.prisma.review.findMany({
      where: { userId: id, isPublished: true },
      select: { rating: true },
    });

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingCount = allReviews.length;
    const averageRating = ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;

    const { _count, ...userData } = user as any;

    return {
      ...userData,
      stats: {
        portfolioCount: _count.portfolios,
        reviewCount: _count.reviews,
        completedProjects: _count.sentProposals,
        ratingAverage: averageRating,
        ratingCount,
      },
    };
  }

  /**
   * آمار داشبورد کاربر
   */
  async getDashboardStats(userId: string) {
    const user = await this.ensureUserExists(userId);

    const [requestsCount, proposalsCount, reviewsCount, wallet] = await Promise.all([
      this.prisma.serviceRequest.count({
        where: { userId },
      }),
      this.prisma.proposal.count({
        where: { userId },
      }),
      this.prisma.review.count({
        where: { userId, isPublished: true },
      }),
      this.prisma.wallet.findUnique({
        where: { userId },
      }),
    ]);

    const unreadNotifications = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      requestsCount,
      proposalsCount,
      reviewsCount,
      walletBalance: wallet?.balance || 0,
      walletFrozen: wallet?.frozen || 0,
      unreadNotifications,
      role: user.role,
      isVerified: user.isVerified,
    };
  }

  /**
   * افزودن به علاقه‌مندی‌ها
   */
  async addToWishlist(targetUserId: string, type: string, currentUserId: string) {
    await this.ensureUserExists(targetUserId);

    return {
      success: true,
      message: `${type === 'specialist' ? 'متخصص' : 'کاربر'} به علاقه‌مندی‌ها اضافه شد`,
    };
  }

  /**
   * لیست تمام کاربران (مدیر)
   */
  async adminGetAll(query: QueryUsersDto) {
    const { page, limit, role, city, search, isVerified } = query;
    const sort = query.sort || 'newest';
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {
      ...(role && { role: role as any }),
      ...(city && { city: { contains: city } }),
      ...(isVerified !== undefined && { isVerified }),
      ...(search && {
        OR: [
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { displayName: { contains: search } },
          { email: { contains: search } },
          { phone: { contains: search } },
        ],
      }),
    };

    const orderBy = this.getOrderBy(sort);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.userSelectFields(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * تغییر وضعیت کاربر (فعال/غیرفعال/مسدود) - مدیر
   */
  async adminToggleStatus(userId: string, data: { isActive?: boolean; isBanned?: boolean; banReason?: string }) {
    await this.ensureUserExists(userId);

    const updateData: Record<string, any> = {};

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.isBanned !== undefined) {
      updateData.isBanned = data.isBanned;
      updateData.banReason = data.isBanned ? data.banReason || 'بدون دلیل مشخص' : null;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('حداقل یک فیلد برای تغییر وضعیت ارسال کنید');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: this.userSelectFields(),
    });

    return {
      user,
      message: data.isBanned
        ? 'کاربر با موفقیت مسدود شد'
        : data.isActive === false
          ? 'کاربر با موفقیت غیرفعال شد'
          : 'وضعیت کاربر با موفقیت تغییر کرد',
    };
  }

  // ========== Helper Methods ==========

  private userSelectFields() {
    return {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatar: true,
      bio: true,
      city: true,
      province: true,
      role: true,
      isVerified: true,
      isActive: true,
      online: true,
      lastSeenAt: true,
      createdAt: true,
    };
  }

  private getOrderBy(sort: string): Record<string, any> {
    switch (sort) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'rating':
        return { reviews: { _count: 'desc' } };
      case 'most_requests':
        return { requests: { _count: 'desc' } };
      case 'newest':
      default:
        return { createdAt: 'desc' };
    }
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    return user;
  }
}
