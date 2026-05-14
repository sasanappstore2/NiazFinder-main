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
import { createSlug } from '../../common/utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class RequestsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryRequestsDto) {
    const { page = 1, limit = 10, categoryId, city, province, status, priority, search, sort = 'newest' } = query;

    const where: Prisma.ServiceRequestWhereInput = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (city) {
      where.city = city;
    }

    if (province) {
      where.province = province;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    let orderBy: Prisma.ServiceRequestOrderByWithRelationInput;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'budget_low':
        orderBy = { budgetMin: 'asc' };
        break;
      case 'budget_high':
        orderBy = { budgetMin: 'desc' };
        break;
      case 'most_proposals':
        orderBy = { proposalCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          _count: {
            select: { proposals: true },
          },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        proposalCount: item._count.proposals,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true, description: true },
        },
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
          },
        },
        proposals: {
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
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    // Increment view count
    await this.prisma.serviceRequest.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return {
      ...request,
      viewCount: request.viewCount + 1,
    };
  }

  async create(userId: string, dto: CreateRequestDto) {
    // Check category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
    }

    // Generate unique slug
    let slug = createSlug(dto.title);
    let counter = 1;
    while (await this.prisma.serviceRequest.findUnique({ where: { slug } })) {
      slug = `${createSlug(dto.title)}-${counter}`;
      counter++;
    }

    const tagsJson = dto.tags ? JSON.stringify(dto.tags) : '[]';

    const request = await this.prisma.serviceRequest.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        budgetMin: dto.budgetMin,
        budgetMax: dto.budgetMax,
        budgetType: dto.budgetType || 'FIXED',
        deliveryTime: dto.deliveryTime,
        deliveryUnit: dto.deliveryUnit || 'day',
        city: dto.city,
        province: dto.province,
        priority: dto.priority || 'NORMAL',
        tags: tagsJson,
        userId,
      },
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
    });

    return request;
  }

  async update(id: string, userId: string, dto: UpdateRequestDto) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را ویرایش کنید');
    }

    if (request.status !== 'OPEN') {
      throw new BadRequestException('فقط درخواست‌های باز قابل ویرایش هستند');
    }

    // If category is being changed, verify it exists
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('دسته‌بندی مورد نظر یافت نشد');
      }
    }

    // If title changed, generate new slug
    let slug: string | undefined;
    if (dto.title && dto.title !== request.title) {
      slug = createSlug(dto.title);
      let counter = 1;
      while (await this.prisma.serviceRequest.findUnique({ where: { slug } })) {
        slug = `${createSlug(dto.title)}-${counter}`;
        counter++;
      }
    }

    const tagsJson = dto.tags ? JSON.stringify(dto.tags) : undefined;

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        ...dto,
        slug,
        tags: tagsJson,
      },
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
    });

    return updated;
  }

  async delete(id: string, userId: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    if (request.userId !== userId) {
      throw new ForbiddenException('شما فقط می‌توانید درخواست‌های خود را حذف کنید');
    }

    if (request.status !== 'OPEN') {
      throw new BadRequestException('فقط درخواست‌های باز قابل حذف هستند');
    }

    await this.prisma.serviceRequest.delete({
      where: { id },
    });

    return { message: 'درخواست با موفقیت حذف شد' };
  }

  async changeStatus(id: string, userId: string, status: string) {
    const request = await this.prisma.serviceRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, role: true },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('درخواست مورد نظر یافت نشد');
    }

    const isAdmin = request.user.role === 'ADMIN' || request.user.role === 'SUPER_ADMIN';

    // Owner can only cancel
    if (!isAdmin && request.userId !== userId) {
      throw new ForbiddenException('شما دسترسی تغییر وضعیت این درخواست را ندارید');
    }

    // Owner can only set to CANCELLED
    if (!isAdmin && status !== 'CANCELLED') {
      throw new ForbiddenException('شما فقط می‌توانید درخواست خود را لغو کنید');
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      OPEN: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CLOSED', 'CANCELLED'],
      COMPLETED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[request.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestException(
        `تغییر وضعیت از ${request.status} به ${status} مجاز نیست`,
      );
    }

    const closedAt = ['CLOSED', 'COMPLETED', 'CANCELLED'].includes(status)
      ? new Date()
      : null;

    const updated = await this.prisma.serviceRequest.update({
      where: { id },
      data: {
        status,
        closedAt,
      },
    });

    // Create notification for request owner
    if (isAdmin && request.userId !== userId) {
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

    return updated;
  }

  async getByUser(userId: string, query: QueryRequestsDto) {
    const { page = 1, limit = 10, status, sort = 'newest' } = query;

    const where: Prisma.ServiceRequestWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    let orderBy: Prisma.ServiceRequestOrderByWithRelationInput;
    switch (sort) {
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'budget_low':
        orderBy = { budgetMin: 'asc' };
        break;
      case 'budget_high':
        orderBy = { budgetMin: 'desc' };
        break;
      case 'most_proposals':
        orderBy = { proposalCount: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.serviceRequest.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          _count: {
            select: { proposals: true },
          },
        },
      }),
      this.prisma.serviceRequest.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        proposalCount: item._count.proposals,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getFeatured() {
    const requests = await this.prisma.serviceRequest.findMany({
      where: {
        isFeatured: true,
        status: 'OPEN',
      },
      orderBy: { viewCount: 'desc' },
      take: 6,
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
        _count: {
          select: { proposals: true },
        },
      },
    });

    return requests.map((item) => ({
      ...item,
      proposalCount: item._count.proposals,
    }));
  }

  async incrementViewCount(id: string) {
    await this.prisma.serviceRequest.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }
}
