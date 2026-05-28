import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * دریافت تمام دسته‌بندی‌های اصلی با درخت زیردسته‌ها
   */
  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true }, include: { children: true } } },
      orderBy: { order: 'asc' },
    });

    const result = await Promise.all(
      categories.map(async (cat) => {
        const specialistCount = await this.countSpecialists(cat.id);
        const childrenWithStats = await Promise.all(
          (cat.children || [])
            .filter((c) => c.isActive)
            .map(async (child) => {
              const childSpecialistCount = await this.countSpecialists(child.id);
              const requestCount = await this.prisma.serviceRequest.count({
                where: { categoryId: child.id },
              });
              const grandchildren = (child.children || [])
                .filter((gc) => gc.isActive)
                .map((gc) => ({
                  ...gc,
                  children: undefined,
                  parent: undefined,
                  requestCount: 0,
                  specialistCount: 0,
                }));

              return {
                ...child,
                children: undefined,
                parent: undefined,
                requestCount,
                specialistCount: childSpecialistCount,
                subCategories: grandchildren,
              };
            }),
        );

        const requestCount = await this.prisma.serviceRequest.count({
          where: { categoryId: cat.id },
        });

        return {
          ...cat,
          children: undefined,
          parent: undefined,
          requestCount,
          specialistCount,
          subCategories: childrenWithStats,
        };
      }),
    );

    return { categories: result };
  }

  /**
   * دریافت دسته‌بندی‌های محبوب (بیشترین درخواست) - 8 تای اول
   */
  async findPopular() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null, isActive: true },
      include: { children: { where: { isActive: true } } },
      orderBy: { order: 'asc' },
    });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const catRequestCount = await this.prisma.serviceRequest.count({
          where: { categoryId: cat.id },
        });

        const childIds = (cat.children || []).filter((c) => c.isActive).map((c) => c.id);
        let childRequests = 0;
        if (childIds.length > 0) {
          childRequests = await this.requestRepo.count({
            where: { categoryId: { in: childIds } },
          });
        }

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          image: cat.image,
          requestCount: catRequestCount + childRequests,
          specialistCount: await this.countSpecialists(cat.id),
        };
      }),
    );

    categoriesWithCounts.sort((a, b) => b.requestCount - a.requestCount);

    return { categories: categoriesWithCounts.slice(0, 8) };
  }

  /**
   * دریافت دسته‌بندی با شناسه
   */
  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { parent: true, children: { where: { isActive: true } } },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    const specialistCount = await this.countSpecialists(id);
    const requestCount = await this.prisma.serviceRequest.count({
      where: { categoryId: id },
    });

    const childrenWithStats = await Promise.all(
      (category.children || [])
        .filter((c) => c.isActive)
        .map(async (child) => {
          const childRequestCount = await this.prisma.serviceRequest.count({
            where: { categoryId: child.id },
          });
          return {
            ...child,
            children: undefined,
            parent: undefined,
            requestCount: childRequestCount,
            specialistCount: await this.countSpecialists(child.id),
          };
        }),
    );

    return {
      ...category,
      children: undefined,
      parent: category.parent ? { id: category.parent.id, name: category.parent.name, slug: category.parent.slug } : null,
      requestCount,
      specialistCount,
      subCategories: childrenWithStats,
    };
  }

  /**
   * دریافت زیردسته‌های مستقیم یک دسته‌بندی
   */
  async findChildren(parentId: string) {
    const parent = await this.prisma.category.findUnique({ where: { id: parentId } });

    if (!parent) {
      throw new NotFoundException('دسته‌بندی والد یافت نشد');
    }

    const children = await this.prisma.category.findMany({
      where: { parentId, isActive: true },
      orderBy: { order: 'asc' },
    });

    const result = await Promise.all(
      children.map(async (child) => {
        const requestCount = await this.prisma.serviceRequest.count({
          where: { categoryId: child.id },
        });
        return {
          ...child,
          children: undefined,
          parent: undefined,
          requestCount,
          specialistCount: await this.countSpecialists(child.id),
        };
      }),
    );

    return {
      parent: { id: parent.id, name: parent.name, slug: parent.slug },
      subcategories: result,
    };
  }

  /**
   * ایجاد دسته‌بندی جدید (مدیر)
   */
  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });

    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('اسلاگ دسته‌بندی تکراری است');
    }

    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('دسته‌بندی والد یافت نشد');
      }
    }

    const categoryData: Prisma.CategoryCreateInput = {
      name: dto.name,
      slug,
      order: dto.order || 0,
      isActive: true,
    };
    if (dto.description) categoryData.description = dto.description;
    if (dto.icon) categoryData.icon = dto.icon;
    if (dto.image) categoryData.image = dto.image;
    if (dto.parentId) {
      categoryData.parent = { connect: { id: dto.parentId } };
    }

    const category = await this.prisma.category.create({ data: categoryData });

    return { category, message: 'دسته‌بندی با موفقیت ایجاد شد' };
  }

  /**
   * بروزرسانی دسته‌بندی (مدیر)
   */
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    if (dto.name) {
      const newSlug = slugify(dto.name, { lower: true, strict: true });
      const existing = await this.prisma.category.findFirst({
        where: { slug: newSlug, id: { not: id } },
      });
      if (existing && newSlug !== category.slug) {
        throw new ConflictException('اسلاگ دسته‌بندی تکراری است');
      }
      category.name = dto.name;
      category.slug = newSlug;
    }

    if (dto.description !== undefined) category.description = dto.description;
    if (dto.icon !== undefined) category.icon = dto.icon;
    if (dto.image !== undefined) category.image = dto.image;
    if (dto.order !== undefined) category.order = dto.order;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        image: category.image,
        order: category.order,
        isActive: category.isActive,
      },
    });

    return { category: updated, message: 'دسته‌بندی با موفقیت بروزرسانی شد' };
  }

  /**
   * حذف دسته‌بندی (غیرفعال‌سازی نرم) (مدیر)
   */
  async delete(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { children: { where: { isActive: true } } },
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    const requestCount = await this.prisma.serviceRequest.count({
      where: { categoryId: id },
    });

    if (requestCount > 0) {
      throw new BadRequestException(
        `این دسته‌بندی دارای ${requestCount} درخواست فعال است و قابل حذف نیست`,
      );
    }

    const activeChildren = (category.children || []).filter((c) => c.isActive);
    if (activeChildren.length > 0) {
      throw new BadRequestException(
        'ابتدا زیردسته‌های فعال این دسته‌بندی را حذف یا غیرفعال کنید',
      );
    }

    category.isActive = false;
    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return { category: updated, message: 'دسته‌بندی با موفقیت غیرفعال شد' };
  }

  /**
   * افزایش شمارنده درخواست‌ها هنگام ایجاد درخواست جدید
   */
  async incrementRequestCount(categoryId: string) {
    // `requestCount` does not exist in Prisma category schema.
    // Kept for compatibility with callers that still invoke this hook.
    await this.prisma.category.findUnique({ where: { id: categoryId } });
  }

  // ========== Helper Methods ==========

  private async countSpecialists(categoryId: string): Promise<number> {
    const subcategories = await this.prisma.category.findMany({
      where: { parentId: categoryId, isActive: true },
      select: { id: true },
    });
    const categoryIds = [categoryId, ...subcategories.map((c) => c.id)];

    const proposals = await this.prisma.proposal.findMany({
      where: {
        request: { categoryId: { in: categoryIds } },
        user: { role: 'SPECIALIST', isActive: true },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return proposals.length;
  }
}
