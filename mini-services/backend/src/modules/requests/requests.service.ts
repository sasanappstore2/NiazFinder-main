import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RedisService } from '../../common/redis/redis.service';
import * as slugify from 'slugify';

@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * ایجاد درخواست جدید
   */
  async create(userId: string, dto: CreateRequestDto) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }

    // Generate unique slug
    let slug = slugify(dto.title, { lower: true, strict: true });
    let counter = 1;
    while (await this.prisma.serviceRequest.findUnique({ where: { slug } })) {
      slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
      counter++;
    }

    const request = await this.prisma.serviceRequest.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        budgetMin: dto.budgetMin !== undefined ? BigInt(dto.budgetMin) : null,
        budgetMax: dto.budgetMax !== undefined ? BigInt(dto.budgetMax) : null,
        budgetType: (dto.budgetType || 'FIXED') as any,
        deliveryTime: dto.deliveryTime,
        deliveryUnit: dto.deliveryUnit || 'day',
        city: dto.city,
        province: dto.province,
        priority: (dto.priority || 'NORMAL') as any,
        tags: JSON.stringify(dto.tags || []),
        userId,
      },
    });

    // Publish event to Redis Pub/Sub
    await this.redis.publish('requests:created', {
      requestId: request.id,
      categoryId: dto.categoryId,
      city: dto.city,
      province: dto.province,
      userId,
    });

    // Notify matching specialists
    await this.notifyMatchingSpecialists(request, category);

    // Load relations for response
    const savedRequest = await this.prisma.serviceRequest.findUnique({
      where: { id: request.id },
      include: { category: true, user: true },
    });

    return savedRequest;
  }

  /**
   * لیست درخواست‌ها با فیلتر و صفحه‌بندی
   */
  async findAll(query: QueryRequestsDto) {
    const {
      page = 1,
      limit = 12,
      categoryId,
      city,
      province,
      status,
      priority,
      search,
      sort = 'newest',
    } = query;

    const skip = (page - 1) * limit;
    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(city ? { city } : {}),
      ...(province ? { province } : {}),
      ...(status ? { status: status as any } : {}),
      ...(priority ? { priority: priority as any } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const orderBy =
      sort === 'oldest'
        ? [{ createdAt: 'asc' as const }]
        : sort === 'budget_low'
          ? [{ budgetMin: 'asc' as const }]
          : sort === 'budget_high'
            ? [{ budgetMax: 'desc' as const }]
            : sort === 'most_proposals'
              ? [{ proposalCount: 'desc' as const }]
              : [{ createdAt: 'desc' as const }];

    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: { category: true, user: true, proposals: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        proposalCount: item.proposals?.length || item.proposalCount || 0,
        proposals: undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * دریافت جزئیات درخواست با افزایش بازدید (با محدودیت سشن در ردیس)
   */
  async findById(id: string, sessionId?: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { category: true, user: true, proposals: { include: { user: true } } },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Rate-limited view count via Redis
    const shouldIncrement = await this.shouldIncrementView(id, sessionId);
    if (shouldIncrement) {
      await this.prisma.serviceRequest.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });
      request.viewCount += 1;
    }

    return {
      ...request,
      proposals: (request.proposals || []).map((p) => ({
        ...p,
        specialist: p.user
          ? {
              id: p.user.id,
              firstName: p.user.firstName,
              lastName: p.user.lastName,
              displayName: p.user.displayName,
              avatar: p.user.avatar,
              city: p.user.city,
              isVerified: p.user.isVerified,
            }
          : null,
      })),
    };
  }

  /**
   * بروزرسانی درخواست (صاحب یا مدیر)
   */
  async update(id: string, userId: string, dto: UpdateRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';

    if (request.userId !== userId && !isAdmin) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را ویرایش کنید');
    }

    if (request.status !== 'OPEN' && !isAdmin) {
      throw new BadRequestException('فقط درخواست‌های باز قابل ویرایش هستند');
    }

    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
      }
    }

    if (dto.title && dto.title !== request.title) {
      let slug = slugify(dto.title, { lower: true, strict: true });
      let counter = 1;
      while (await this.prisma.serviceRequest.findUnique({ where: { slug } })) {
        slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
        counter++;
      }
      request.slug = slug;
    }
    await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(request.slug ? { slug: request.slug } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.budgetMin !== undefined ? { budgetMin: BigInt(dto.budgetMin) } : {}),
        ...(dto.budgetMax !== undefined ? { budgetMax: BigInt(dto.budgetMax) } : {}),
        ...(dto.budgetType !== undefined ? { budgetType: dto.budgetType as any } : {}),
        ...(dto.deliveryTime !== undefined ? { deliveryTime: dto.deliveryTime } : {}),
        ...(dto.deliveryUnit !== undefined ? { deliveryUnit: dto.deliveryUnit } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.province !== undefined ? { province: dto.province } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority as any } : {}),
        ...(dto.tags !== undefined ? { tags: JSON.stringify(dto.tags) } : {}),
      },
    });

    await this.redis.publish('requests:updated', { requestId: id, userId });

    const updated = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { category: true, user: true },
    });

    return updated;
  }

  /**
   * حذف نرم درخواست (صاحب یا مدیر - تنظیم وضعیت به CANCELLED)
   */
  async delete(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';

    if (request.userId !== userId && !isAdmin) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را حذف کنید');
    }

    if (request.status !== 'OPEN' && !isAdmin) {
      throw new BadRequestException('فقط درخواست‌های باز قابل حذف هستند');
    }

    // Soft delete
    await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.redis.publish('requests:deleted', { requestId: id, userId });

    return { message: 'درخواست با موفقیت حذف شد' };
  }

  /**
   * تغییر وضعیت درخواست با اعتبارسنجی انتقال وضعیت
   */
  async updateStatus(id: string, status: string, userId?: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'CANCELLED', 'EXPIRED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: [],
      EXPIRED: [],
    };

    const allowed = validTransitions[request.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `تغییر وضعیت از ${request.status} به ${status} مجاز نیست`,
      );
    }

    await this.prisma.serviceRequest.update({
      where: { id },
      data: { status: status as any },
    });

    // Notify request owner if changed by admin
    if (userId && request.userId !== userId) {
      await this.prisma.notification.create({
        data: {
          userId: request.userId,
          type: 'REQUEST_STATUS_CHANGED',
          title: 'تغییر وضعیت درخواست',
          message: `وضعیت درخواست "${request.title}" به "${status}" تغییر یافت`,
          data: JSON.stringify({ requestId: id, status }),
        },
      });
    }

    await this.redis.publish('requests:status_changed', {
      requestId: id,
      status,
      userId: request.userId,
    });

    return request;
  }

  /**
   * درخواست‌های کاربر
   */
  async findByUser(userId: string, query: QueryRequestsDto) {
    const { page = 1, limit = 12, status, sort = 'newest' } = query;

    const skip = (page - 1) * limit;
    const orderBy =
      sort === 'oldest'
        ? [{ createdAt: 'asc' as const }]
        : sort === 'budget_low'
          ? [{ budgetMin: 'asc' as const }]
          : sort === 'budget_high'
            ? [{ budgetMax: 'desc' as const }]
            : sort === 'most_proposals'
              ? [{ proposalCount: 'desc' as const }]
              : [{ createdAt: 'desc' as const }];
    const where = {
      userId,
      ...(status ? { status: status as any } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * جستجوی全文 درخواست‌ها
   */
  async search(query: string, filters: {
    categoryId?: string;
    city?: string;
    province?: string;
    status?: string;
  } = {}) {
    return this.prisma.serviceRequest.findMany({
      where: {
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.province ? { province: filters.province } : {}),
        ...(filters.status ? { status: filters.status as any } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { contains: query } },
        ],
      },
      include: { category: true, user: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * آمار کلی درخواست‌ها
   */
  async getStats() {
    const [
      total,
      open,
      inProgress,
      completed,
      cancelled,
      expired,
      totalViewsAgg,
      totalProposalsAgg,
    ] = await Promise.all([
      this.prisma.serviceRequest.count(),
      this.prisma.serviceRequest.count({ where: { status: 'OPEN' } }),
      this.prisma.serviceRequest.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.serviceRequest.count({ where: { status: 'COMPLETED' } }),
      this.prisma.serviceRequest.count({ where: { status: 'CANCELLED' } }),
      this.prisma.serviceRequest.count({ where: { status: 'REJECTED' } }),
      this.prisma.serviceRequest.aggregate({ _sum: { viewCount: true } }),
      this.prisma.serviceRequest.aggregate({ _sum: { proposalCount: true } }),
    ]);

    return {
      total,
      open,
      inProgress,
      completed,
      cancelled,
      expired,
      totalViews: totalViewsAgg._sum.viewCount ?? 0,
      totalProposals: totalProposalsAgg._sum.proposalCount ?? 0,
    };
  }

  // ========== Private Helpers ==========

  /**
   * Check if view count should be incremented (rate limited per session)
   */
  private async shouldIncrementView(requestId: string, sessionId?: string): Promise<boolean> {
    if (!sessionId) return true;

    const key = `view:request:${requestId}:${sessionId}`;
    return await this.redis.isAllowed(key, 3600, 1); // 1 hour TTL
  }

  /**
   * Notify specialists who match the request's category/location
   */
  private async notifyMatchingSpecialists(request: any, category: any): Promise<void> {
    try {
      const specialists = await this.prisma.user.findMany({
        where: {
          role: 'SPECIALIST',
          isActive: true,
          OR: [
            { skills: { some: { skill: { categoryId: category.id } } } },
            ...(request.city ? [{ city: request.city }] : []),
            ...(request.province ? [{ province: request.province }] : []),
          ],
        },
        select: { id: true },
        take: 50,
      });

      const notifications = specialists.map((specialist) => ({
        userId: specialist.id,
        type: 'NEW_REQUEST_MATCH',
          title: 'درخواست جدید مطابق تخصص شما',
          message: `یک درخواست جدید در دسته‌بندی "${category.name}" ثبت شد`,
          data: JSON.stringify({
            requestId: request.id,
            categoryId: category.id,
            title: request.title,
          }),
      }));

      if (notifications.length > 0) {
        await this.prisma.notification.createMany({ data: notifications });
      }
    } catch {
      // Non-critical: don't fail the request creation if notifications fail
    }
  }
}
