import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Find by ID ====================

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.userSelectFields(),
        wallet: true,
        skills: {
          include: { skill: true },
          where: { skill: { isActive: true } },
        },
        _count: {
          select: {
            portfolios: { where: { isPublished: true } },
            reviews: { where: { isPublished: true } },
            sentProposals: { where: { status: 'ACCEPTED' } },
            requests: true,
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
    const averageRating =
      ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;

    const { reviews, _count, ...userData } = user as any;

    return {
      ...userData,
      portfolioCount: _count.portfolios,
      reviewCount: _count.reviews,
      proposalCount: _count.sentProposals,
      requestCount: _count.requests,
      ratingAverage: averageRating,
      ratingCount,
    };
  }

  // ==================== Find All (Paginated) ====================

  async findAll(query: QueryUsersDto) {
    const { page, limit, role, city, search, isVerified, sortBy, sortOrder } = query;
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

    const orderBy = this.getOrderBy(sortBy, sortOrder);

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

  // ==================== Update Profile ====================

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.ensureUserExists(userId);

    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException('این شماره موبایل قبلاً ثبت شده است');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.province !== undefined) updateData.province = dto.province;
    if (dto.phone !== undefined) {
      updateData.phone = dto.phone;
      updateData.phoneVerified = false;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('حداقل یک فیلد برای بروزرسانی ارسال کنید');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: this.userSelectFields(),
    });

    return { user: updatedUser, message: 'پروفایل با موفقیت بروزرسانی شد' };
  }

  // ==================== Update Avatar ====================

  async updateAvatar(userId: string, avatarUrl: string) {
    await this.ensureUserExists(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: this.userSelectFields(),
    });

    return { user, message: 'آواتار با موفقیت بروزرسانی شد' };
  }

  // ==================== Change Password ====================

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.ensureUserExists(userId);

    if (!user.password) {
      throw new BadRequestException('حساب کاربری شما رمز عبور ندارد');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('رمز عبور فعلی اشتباه است');
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      // Invalidate all tokens
      await tx.authToken.deleteMany({
        where: { userId },
      });
    });

    return { message: 'رمز عبور با موفقیت تغییر کرد. لطفاً دوباره وارد شوید' };
  }

  // ==================== Online Status ====================

  async updateOnlineStatus(userId: string, isOnline: boolean) {
    await this.ensureUserExists(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        online: isOnline,
        lastSeenAt: new Date(),
      },
    });

    return {
      message: isOnline ? 'وضعیت آنلاین فعال شد' : 'وضعیت آفلاین فعال شد',
      online: isOnline,
    };
  }

  // ==================== Profile Completion ====================

  async getProfileCompletion(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
        skills: { select: { id: true } },
        portfolios: { where: { isPublished: true }, select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد');
    }

    const fields: { name: string; completed: boolean; weight: number }[] = [
      { name: 'نام', completed: !!user.firstName && user.firstName.length > 0, weight: 10 },
      { name: 'نام خانوادگی', completed: !!user.lastName && user.lastName.length > 0, weight: 10 },
      { name: 'نام نمایشی', completed: !!user.displayName, weight: 10 },
      { name: 'آواتار', completed: !!user.avatar, weight: 15 },
      { name: 'بیوگرافی', completed: !!user.bio && user.bio.length > 10, weight: 10 },
      { name: 'شهر', completed: !!user.city, weight: 5 },
      { name: 'استان', completed: !!user.province, weight: 5 },
      { name: 'شماره موبایل', completed: !!user.phone, weight: 10 },
      { name: 'تأیید ایمیل', completed: !!user.emailVerified, weight: 5 },
      { name: 'تأیید موبایل', completed: !!user.phoneVerified, weight: 5 },
      { name: 'مهارت‌ها', completed: user.skills.length > 0, weight: 10 },
      { name: 'نمونه کارها', completed: user.portfolios.length > 0, weight: 5 },
    ];

    const completedWeight = fields.filter((f) => f.completed).reduce((sum, f) => sum + f.weight, 0);
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);

    const percentage = Math.round((completedWeight / totalWeight) * 100);

    return {
      percentage,
      completedFields: fields.filter((f) => f.completed).length,
      totalFields: fields.length,
      details: fields.map((f) => ({
        name: f.name,
        completed: f.completed,
        weight: f.weight,
      })),
    };
  }

  // ==================== Deactivate User ====================

  async deactivateUser(userId: string) {
    await this.ensureUserExists(userId);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: false, online: false },
      });

      // Invalidate all tokens
      await tx.authToken.deleteMany({
        where: { userId },
      });
    });

    return { message: 'حساب کاربری با موفقیت غیرفعال شد' };
  }

  // ==================== Search Users ====================

  async searchUsers(query: string) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { firstName: { contains: query } },
          { lastName: { contains: query } },
          { displayName: { contains: query } },
          { email: { contains: query } },
          { city: { contains: query } },
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

  // ==================== Admin Methods ====================

  async adminGetAll(query: QueryUsersDto) {
    const { page, limit, role, city, search, isVerified, sortBy, sortOrder } = query;
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

    const orderBy = this.getOrderBy(sortBy, sortOrder);

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

  async adminToggleStatus(
    userId: string,
    data: { isActive?: boolean; isBanned?: boolean; banReason?: string },
  ) {
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

  // ==================== Dashboard Stats ====================

  async getDashboardStats(userId: string) {
    const user = await this.ensureUserExists(userId);

    const [requestsCount, proposalsCount, reviewsCount, wallet] = await Promise.all([
      this.prisma.serviceRequest.count({ where: { userId } }),
      this.prisma.proposal.count({ where: { userId } }),
      this.prisma.review.count({ where: { userId, isPublished: true } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
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

  // ==================== Specialist Profile ====================

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
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد');
    }

    const allReviews = await this.prisma.review.findMany({
      where: { userId: id, isPublished: true },
      select: { rating: true },
    });

    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingCount = allReviews.length;
    const averageRating =
      ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0;

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

  // ==================== Helpers ====================

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

  private getOrderBy(sortBy?: string, sortOrder?: string): Record<string, any> {
    const order = sortOrder === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'oldest':
        return { createdAt: 'asc' };
      case 'name':
        return { firstName: order };
      case 'rating':
        return { reviews: { _count: order } };
      case 'most_requests':
        return { requests: { _count: order } };
      case 'newest':
      default:
        return { createdAt: order };
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
