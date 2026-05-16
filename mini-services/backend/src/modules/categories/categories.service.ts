import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Not } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Proposal } from '../../entities/proposal.entity';
import { Request } from '../../entities/request.entity';
import { User } from '../../entities/user.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Request)
    private readonly requestRepo: Repository<Request>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * دریافت تمام دسته‌بندی‌های اصلی با درخت زیردسته‌ها
   */
  async findAll() {
    const categories = await this.categoryRepo.find({
      where: { parentId: null as any, isActive: true },
      relations: ['children', 'children.children'],
      order: { order: 'ASC' },
    });

    const result = await Promise.all(
      categories.map(async (cat) => {
        const specialistCount = await this.countSpecialists(cat.id);
        const childrenWithStats = await Promise.all(
          (cat.children || [])
            .filter((c) => c.isActive)
            .map(async (child) => {
              const childSpecialistCount = await this.countSpecialists(child.id);
              const requestCount = await this.requestRepo.count({
                where: { categoryId: child.id, deletedAt: null as any },
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

        const requestCount = await this.requestRepo.count({
          where: { categoryId: cat.id, deletedAt: null as any },
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
    const categories = await this.categoryRepo.find({
      where: { parentId: null as any, isActive: true },
      relations: ['children'],
      order: { order: 'ASC' },
    });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (cat) => {
        const catRequestCount = await this.requestRepo.count({
          where: { categoryId: cat.id, deletedAt: null as any },
        });

        const childIds = (cat.children || []).filter((c) => c.isActive).map((c) => c.id);
        let childRequests = 0;
        if (childIds.length > 0) {
          childRequests = await this.requestRepo.count({
            where: { categoryId: In(childIds), deletedAt: null as any },
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
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    const specialistCount = await this.countSpecialists(id);
    const requestCount = await this.requestRepo.count({
      where: { categoryId: id, deletedAt: null as any },
    });

    const childrenWithStats = await Promise.all(
      (category.children || [])
        .filter((c) => c.isActive)
        .map(async (child) => {
          const childRequestCount = await this.requestRepo.count({
            where: { categoryId: child.id, deletedAt: null as any },
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
    const parent = await this.categoryRepo.findOne({ where: { id: parentId } });

    if (!parent) {
      throw new NotFoundException('دسته‌بندی والد یافت نشد');
    }

    const children = await this.categoryRepo.find({
      where: { parentId, isActive: true },
      order: { order: 'ASC' },
    });

    const result = await Promise.all(
      children.map(async (child) => {
        const requestCount = await this.requestRepo.count({
          where: { categoryId: child.id, deletedAt: null as any },
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

    const existing = await this.categoryRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException('اسلاگ دسته‌بندی تکراری است');
    }

    if (dto.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('دسته‌بندی والد یافت نشد');
      }
    }

    const categoryData: Partial<Category> = {
      name: dto.name,
      slug,
      order: dto.order || 0,
    };
    if (dto.description) categoryData.description = dto.description;
    if (dto.icon) categoryData.icon = dto.icon;
    if (dto.image) categoryData.image = dto.image;
    if (dto.parentId) categoryData.parentId = dto.parentId;

    const category = this.categoryRepo.create(categoryData);

    await this.categoryRepo.save(category);

    return { category, message: 'دسته‌بندی با موفقیت ایجاد شد' };
  }

  /**
   * بروزرسانی دسته‌بندی (مدیر)
   */
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    if (dto.name) {
      const newSlug = slugify(dto.name, { lower: true, strict: true });
      const existing = await this.categoryRepo.findOne({
        where: { slug: newSlug, id: Not(id) } as any,
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

    await this.categoryRepo.save(category);

    return { category, message: 'دسته‌بندی با موفقیت بروزرسانی شد' };
  }

  /**
   * حذف دسته‌بندی (غیرفعال‌سازی نرم) (مدیر)
   */
  async delete(id: string) {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!category) {
      throw new NotFoundException('دسته‌بندی یافت نشد');
    }

    const requestCount = await this.requestRepo.count({
      where: { categoryId: id, deletedAt: null as any },
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
    await this.categoryRepo.save(category);

    return { category, message: 'دسته‌بندی با موفقیت غیرفعال شد' };
  }

  /**
   * افزایش شمارنده درخواست‌ها هنگام ایجاد درخواست جدید
   */
  async incrementRequestCount(categoryId: string) {
    await this.categoryRepo.increment({ id: categoryId }, 'requestCount', 1);
  }

  // ========== Helper Methods ==========

  private async countSpecialists(categoryId: string): Promise<number> {
    const subcategories = await this.categoryRepo.find({
      where: { parentId: categoryId },
      select: { id: true },
    });
    const categoryIds = [categoryId, ...subcategories.map((c) => c.id)];

    const result = await this.proposalRepo
      .createQueryBuilder('proposal')
      .leftJoin('proposal.request', 'request')
      .leftJoin('proposal.specialist', 'specialist')
      .select('DISTINCT proposal.specialistId', 'id')
      .where('request.categoryId IN (:...categoryIds)', { categoryIds })
      .andWhere('specialist.role = :role', { role: 'SPECIALIST' })
      .andWhere('specialist.isActive = :isActive', { isActive: true })
      .getRawMany();

    return result.length;
  }
}
