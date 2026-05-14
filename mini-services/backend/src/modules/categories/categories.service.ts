import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * دریافت تمام دسته‌بندی‌های اصلی با درخت زیردسته‌ها
   */
  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          include: {
            children: {
              where: { isActive: true },
              include: {
                _count: {
                  select: { requests: true },
                },
              },
            },
            _count: {
              select: { requests: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { requests: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Attach specialist counts
    const result = await Promise.all(
      categories.map(async (cat) => {
        const specialistCount = await this.countSpecialists(cat.id);
        const childrenWithStats = await Promise.all(
          cat.children.map(async (child) => {
            const childSpecialistCount = await this.countSpecialists(child.id);
            const grandchildrenWithStats = await Promise.all(
              child.children.map(async (grandchild) => ({
                ...grandchild,
                specialistCount: await this.countSpecialists(grandchild.id),
              })),
            );
            return {
              ...child,
              requestCount: child._count.requests,
              specialistCount: childSpecialistCount,
              children: grandchildrenWithStats,
            };
          }),
        );
        return {
          ...cat,
          requestCount: cat._count.requests,
          specialistCount,
          children: childrenWithStats,
        };
      }),
    );

    return { categories: result };
  }

  /**
   * دریافت دسته‌بندی با شناسه
   */
  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: { requests: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { requests: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    const specialistCount = await this.countSpecialists(id);
    const childrenWithStats = await Promise.all(
      category.children.map(async (child) => ({
        ...child,
        requestCount: child._count.requests,
        specialistCount: await this.countSpecialists(child.id),
      })),
    );

    return {
      ...category,
      requestCount: category._count.requests,
      specialistCount,
      children: childrenWithStats,
    };
  }

  /**
   * دریافت زیردسته‌های یک دسته‌بندی
   */
  async getSubcategories(parentId: string) {
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('دسته‌بندی والد یافت نشد');
    }

    const subcategories = await this.prisma.category.findMany({
      where: {
        parentId,
        isActive: true,
      },
      include: {
        _count: {
          select: { requests: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    const result = await Promise.all(
      subcategories.map(async (sub) => ({
        ...sub,
        requestCount: sub._count.requests,
        specialistCount: await this.countSpecialists(sub.id),
      })),
    );

    return { parent: { id: parent.id, name: parent.name, slug: parent.slug }, subcategories: result };
  }

  /**
   * ایجاد دسته‌بندی جدید (مدیر)
   */
  async create(dto: CreateCategoryDto) {
    // Check slug uniqueness
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException('اسلاگ دسته‌بندی تکراری است');
    }

    // Validate parent exists
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('دسته‌بندی والد یافت نشد');
      }
    }

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        icon: dto.icon,
        parentId: dto.parentId || null,
        order: dto.order || 0,
      },
    });

    return { category, message: 'دسته‌بندی با موفقیت ایجاد شد' };
  }

  /**
   * بروزرسانی دسته‌بندی (مدیر)
   */
  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);

    // Check slug uniqueness if provided
    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug: dto.slug, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('اسلاگ دسته‌بندی تکراری است');
      }
    }

    // Validate parent exists if provided
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('دسته‌بندی نمی‌تواند والد خود باشد');
      }
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('دسته‌بندی والد یافت نشد');
      }
    }

    const updateData: Record<string, any> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.parentId !== undefined) updateData.parentId = dto.parentId || null;
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const category = await this.prisma.category.update({
      where: { id },
      data: updateData,
    });

    return { category, message: 'دسته‌بندی با موفقیت بروزرسانی شد' };
  }

  /**
   * حذف دسته‌بندی (غیرفعال‌سازی) (مدیر)
   */
  async delete(id: string) {
    await this.ensureCategoryExists(id);

    // Check for existing requests
    const requestCount = await this.prisma.serviceRequest.count({
      where: { categoryId: id },
    });

    if (requestCount > 0) {
      throw new BadRequestException(
        `این دسته‌بندی دارای ${requestCount} درخواست فعال است و قابل حذف نیست`,
      );
    }

    // Check for active children
    const childrenCount = await this.prisma.category.count({
      where: { parentId: id, isActive: true },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        'ابتدا زیردسته‌های فعال این دسته‌بندی را حذف یا غیرفعال کنید',
      );
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return { category, message: 'دسته‌بندی با موفقیت غیرفعال شد' };
  }

  /**
   * دسته‌بندی‌های محبوب (بر اساس تعداد درخواست)
   */
  async getPopular() {
    const categories = await this.prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        _count: {
          select: { requests: true },
        },
        children: {
          where: { isActive: true },
          include: {
            _count: {
              select: { requests: true },
            },
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    // Calculate total requests including children
    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const childRequests = cat.children.reduce((sum, c) => sum + c._count.requests, 0);
        const totalRequests = cat._count.requests + childRequests;
        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          requestCount: totalRequests,
          specialistCount: await this.countSpecialists(cat.id),
        };
      }),
    );

    // Sort by request count descending
    categoriesWithCounts.sort((a, b) => b.requestCount - a.requestCount);

    return { categories: categoriesWithCounts.slice(0, 8) };
  }

  /**
   * جستجوی دسته‌بندی‌ها
   */
  async search(query: string) {
    if (!query || query.trim().length === 0) {
      return { categories: [], message: 'عبارت جستجو نمی‌تواند خالی باشد' };
    }

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true,
        OR: [
          { name: { contains: query.trim() } },
          { description: { contains: query.trim() } },
        ],
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: { requests: true },
        },
      },
      take: 20,
    });

    return {
      categories: categories.map((cat) => ({
        ...cat,
        requestCount: cat._count.requests,
      })),
    };
  }

  // ========== Helper Methods ==========

  private async ensureCategoryExists(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    return category;
  }

  private async countSpecialists(categoryId: string): Promise<number> {
    // Get all request IDs under this category (including subcategories)
    const subcategories = await this.prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    });

    const categoryIds = [categoryId, ...subcategories.map((c) => c.id)];

    // Count distinct specialists who have sent proposals in this category
    const specialists = await this.prisma.proposal.groupBy({
      by: ['userId'],
      where: {
        request: {
          categoryId: { in: categoryIds },
        },
        user: {
          role: 'SPECIALIST',
          isActive: true,
        },
      },
    });

    return specialists.length;
  }
}
