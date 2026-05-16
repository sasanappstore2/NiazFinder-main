import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, Not } from 'typeorm';
import { Request, RequestStatus, RequestPriority, BudgetType, DeliveryUnit } from '../../entities/request.entity';
import { Category } from '../../entities/category.entity';
import { User } from '../../entities/user.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Review } from '../../entities/review.entity';
import { Notification } from '../../entities/notification.entity';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { QueryRequestsDto } from './dto/query-requests.dto';
import { RedisService } from '../../common/redis/redis.service';
import * as slugify from 'slugify';

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(Request)
    private readonly requestRepo: Repository<Request>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    private readonly redis: RedisService,
  ) {}

  /**
   * ایجاد درخواست جدید
   */
  async create(userId: string, dto: CreateRequestDto) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
    if (!category) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }

    // Generate unique slug
    let slug = slugify(dto.title, { lower: true, strict: true });
    let counter = 1;
    while (await this.requestRepo.findOne({ where: { slug } })) {
      slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
      counter++;
    }

    const request = this.requestRepo.create({
      title: dto.title,
      slug,
      description: dto.description,
      categoryId: dto.categoryId,
      budgetMin: dto.budgetMin,
      budgetMax: dto.budgetMax,
      budgetType: (dto.budgetType || 'FIXED') as BudgetType,
      deliveryTime: dto.deliveryTime,
      deliveryUnit: (dto.deliveryUnit || 'day') as DeliveryUnit,
      city: dto.city,
      province: dto.province,
      priority: (dto.priority || 'NORMAL') as RequestPriority,
      tags: dto.tags || [],
      userId,
    });

    await this.requestRepo.save(request);

    // Increment category request count
    await this.categoryRepo.increment({ id: dto.categoryId }, 'requestCount', 1);

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
    const savedRequest = await this.requestRepo.findOne({
      where: { id: request.id },
      relations: ['category', 'user'],
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

    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.user', 'user')
      .leftJoinAndSelect('request.proposals', 'proposals')
      .where('request.deletedAt IS NULL');

    if (categoryId) {
      qb.andWhere('request.categoryId = :categoryId', { categoryId });
    }
    if (city) {
      qb.andWhere('request.city = :city', { city });
    }
    if (province) {
      qb.andWhere('request.province = :province', { province });
    }
    if (status) {
      qb.andWhere('request.status = :status', { status });
    }
    if (priority) {
      qb.andWhere('request.priority = :priority', { priority });
    }
    if (search) {
      qb.andWhere(
        '(request.title ILIKE :search OR request.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    switch (sort) {
      case 'oldest':
        qb.orderBy('request.createdAt', 'ASC');
        break;
      case 'budget_low':
        qb.orderBy('COALESCE(request.budgetMin, 0)', 'ASC');
        break;
      case 'budget_high':
        qb.orderBy('COALESCE(request.budgetMax, 0)', 'DESC');
        break;
      case 'most_proposals':
        qb.orderBy('request.proposalCount', 'DESC');
        break;
      case 'newest':
      default:
        qb.orderBy('request.createdAt', 'DESC');
        break;
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

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
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['category', 'user', 'proposals', 'proposals.specialist'],
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Rate-limited view count via Redis
    const shouldIncrement = await this.shouldIncrementView(id, sessionId);
    if (shouldIncrement) {
      await this.requestRepo.increment({ id }, 'viewCount', 1);
      request.viewCount += 1;
    }

    return {
      ...request,
      proposals: (request.proposals || []).map((p) => ({
        ...p,
        specialist: p.specialist ? {
          id: p.specialist.id,
          firstName: p.specialist.firstName,
          lastName: p.specialist.lastName,
          displayName: p.specialist.displayName,
          avatar: p.specialist.avatar,
          city: p.specialist.city,
          isVerified: p.specialist.isVerified,
        } : null,
      })),
    };
  }

  /**
   * بروزرسانی درخواست (صاحب یا مدیر)
   */
  async update(id: string, userId: string, dto: UpdateRequestDto) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';

    if (request.userId !== userId && !isAdmin) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را ویرایش کنید');
    }

    if (request.status !== RequestStatus.OPEN && !isAdmin) {
      throw new BadRequestException('فقط درخواست‌های باز قابل ویرایش هستند');
    }

    if (dto.categoryId) {
      const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId } });
      if (!category) {
        throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
      }
    }

    if (dto.title && dto.title !== request.title) {
      let slug = slugify(dto.title, { lower: true, strict: true });
      let counter = 1;
      while (await this.requestRepo.findOne({ where: { slug } })) {
        slug = `${slugify(dto.title, { lower: true, strict: true })}-${counter}`;
        counter++;
      }
      request.slug = slug;
      request.title = dto.title;
    }

    if (dto.description !== undefined) request.description = dto.description;
    if (dto.categoryId !== undefined) request.categoryId = dto.categoryId;
    if (dto.budgetMin !== undefined) request.budgetMin = dto.budgetMin;
    if (dto.budgetMax !== undefined) request.budgetMax = dto.budgetMax;
    if (dto.budgetType !== undefined) request.budgetType = dto.budgetType as BudgetType;
    if (dto.deliveryTime !== undefined) request.deliveryTime = dto.deliveryTime;
    if (dto.deliveryUnit !== undefined) request.deliveryUnit = dto.deliveryUnit as DeliveryUnit;
    if (dto.city !== undefined) request.city = dto.city;
    if (dto.province !== undefined) request.province = dto.province;
    if (dto.priority !== undefined) request.priority = dto.priority as RequestPriority;
    if (dto.tags !== undefined) request.tags = dto.tags;

    await this.requestRepo.save(request);

    await this.redis.publish('requests:updated', { requestId: id, userId });

    const updated = await this.requestRepo.findOne({
      where: { id },
      relations: ['category', 'user'],
    });

    return updated;
  }

  /**
   * حذف نرم درخواست (صاحب یا مدیر - تنظیم وضعیت به CANCELLED)
   */
  async delete(id: string, userId: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';

    if (request.userId !== userId && !isAdmin) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را حذف کنید');
    }

    if (request.status !== RequestStatus.OPEN && !isAdmin) {
      throw new BadRequestException('فقط درخواست‌های باز قابل حذف هستند');
    }

    // Soft delete
    request.status = RequestStatus.CANCELLED;
    await this.requestRepo.softRemove(request);
    await this.requestRepo.save(request);

    await this.redis.publish('requests:deleted', { requestId: id, userId });

    return { message: 'درخواست با موفقیت حذف شد' };
  }

  /**
   * تغییر وضعیت درخواست با اعتبارسنجی انتقال وضعیت
   */
  async updateStatus(id: string, status: string, userId?: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['user'],
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

    request.status = status as RequestStatus;
    await this.requestRepo.save(request);

    // Notify request owner if changed by admin
    if (userId && request.userId !== userId) {
      await this.notificationRepo.save(
        this.notificationRepo.create({
          userId: request.userId,
          type: 'REQUEST_STATUS_CHANGED' as any,
          title: 'تغییر وضعیت درخواست',
          body: `وضعیت درخواست "${request.title}" به "${status}" تغییر یافت`,
          data: { requestId: id, status },
        } as any),
      );
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

    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.category', 'category')
      .where('request.userId = :userId', { userId })
      .andWhere('request.deletedAt IS NULL');

    if (status) {
      qb.andWhere('request.status = :status', { status });
    }

    switch (sort) {
      case 'oldest':
        qb.orderBy('request.createdAt', 'ASC');
        break;
      case 'budget_low':
        qb.orderBy('COALESCE(request.budgetMin, 0)', 'ASC');
        break;
      case 'budget_high':
        qb.orderBy('COALESCE(request.budgetMax, 0)', 'DESC');
        break;
      case 'most_proposals':
        qb.orderBy('request.proposalCount', 'DESC');
        break;
      default:
        qb.orderBy('request.createdAt', 'DESC');
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

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
    const qb = this.requestRepo
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.category', 'category')
      .leftJoinAndSelect('request.user', 'user')
      .where('request.deletedAt IS NULL')
      .andWhere(
        '(request.title ILIKE :query OR request.description ILIKE :query OR :tag ANY(request.tags))',
        { query: `%${query}%`, tag: query },
      );

    if (filters.categoryId) {
      qb.andWhere('request.categoryId = :categoryId', { categoryId: filters.categoryId });
    }
    if (filters.city) {
      qb.andWhere('request.city = :city', { city: filters.city });
    }
    if (filters.province) {
      qb.andWhere('request.province = :province', { province: filters.province });
    }
    if (filters.status) {
      qb.andWhere('request.status = :status', { status: filters.status });
    }

    qb.orderBy('request.createdAt', 'DESC').take(20);

    return qb.getMany();
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
    ] = await Promise.all([
      this.requestRepo.count({ where: { deletedAt: null as any } }),
      this.requestRepo.count({ where: { status: RequestStatus.OPEN, deletedAt: null as any } }),
      this.requestRepo.count({ where: { status: RequestStatus.IN_PROGRESS, deletedAt: null as any } }),
      this.requestRepo.count({ where: { status: RequestStatus.COMPLETED, deletedAt: null as any } }),
      this.requestRepo.count({ where: { status: RequestStatus.CANCELLED, deletedAt: null as any } }),
      this.requestRepo.count({ where: { status: RequestStatus.EXPIRED, deletedAt: null as any } }),
    ]);

    const totalViews = await this.requestRepo
      .createQueryBuilder('request')
      .select('COALESCE(SUM(request.viewCount), 0)', 'total')
      .where('request.deletedAt IS NULL')
      .getRawOne();

    const totalProposals = await this.requestRepo
      .createQueryBuilder('request')
      .select('COALESCE(SUM(request.proposalCount), 0)', 'total')
      .where('request.deletedAt IS NULL')
      .getRawOne();

    return {
      total,
      open,
      inProgress,
      completed,
      cancelled,
      expired,
      totalViews: parseInt(totalViews?.total || '0'),
      totalProposals: parseInt(totalProposals?.total || '0'),
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
  private async notifyMatchingSpecialists(request: Request, category: Category): Promise<void> {
    try {
      // Find specialists with matching category skills or location
      const specialists = await this.userRepo
        .createQueryBuilder('user')
        .leftJoin('user.skills', 'skill')
        .where('user.role = :role', { role: 'SPECIALIST' })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .andWhere(
          '(skill.categoryId = :categoryId OR (user.city = :city AND :city IS NOT NULL) OR (user.province = :province AND :province IS NOT NULL))',
          {
            categoryId: category.id,
            city: request.city || null,
            province: request.province || null,
          },
        )
        .select('user.id')
        .distinct(true)
        .limit(50)
        .getMany();

      const notifications = specialists.map((specialist) =>
        this.notificationRepo.create({
          userId: specialist.id,
          type: 'NEW_REQUEST_MATCH' as any,
          title: 'درخواست جدید مطابق تخصص شما',
          body: `یک درخواست جدید در دسته‌بندی "${category.name}" ثبت شد`,
          data: {
            requestId: request.id,
            categoryId: category.id,
            title: request.title,
          },
        } as any),
      );

      if (notifications.length > 0) {
        await this.notificationRepo.save(notifications as any);
      }
    } catch {
      // Non-critical: don't fail the request creation if notifications fail
    }
  }
}
