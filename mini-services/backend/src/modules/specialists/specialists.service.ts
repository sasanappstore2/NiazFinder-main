import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSpecialistProfileDto } from './dto/update-specialist-profile.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QuerySpecialistsDto } from './dto/query-specialists.dto';
import * as slugify from 'slugify';

@Injectable()
export class SpecialistsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * لیست متخصص‌ها با فیلتر و صفحه‌بندی
   */
  async findAll(query: QuerySpecialistsDto) {
    const {
      categoryId,
      city,
      province,
      minRating,
      search,
      sort = 'newest',
      page = 1,
      limit = 20,
    } = query;

    const skip = (page - 1) * limit;
    const where = {
      role: 'SPECIALIST' as const,
      isActive: true,
      ...(city ? { city } : {}),
      ...(province ? { province } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { displayName: { contains: search, mode: 'insensitive' as const } },
              { bio: { contains: search, mode: 'insensitive' as const } },
              { skills: { some: { skill: { name: { contains: search, mode: 'insensitive' as const } } } } },
            ],
          }
        : {}),
      ...(categoryId ? { skills: { some: { skill: { categoryId } } } } : {}),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { skills: { include: { skill: true } } },
        orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit * 2,
      }),
      this.prisma.user.count({ where }),
    ]);

    // Build specialist profiles with computed stats
    let specialists = await Promise.all(
      users.map(async (user) => {
        const avgRating = await this.getUserAvgRating(user.id);
        const completedProjects = await this.prisma.proposal.count({
          where: { userId: user.id, status: 'ACCEPTED' },
        });
        const portfoliosCount = await this.prisma.portfolio.count({
          where: { userId: user.id, isPublished: true },
        });
        const totalReviews = await this.prisma.review.count({
          where: { userId: user.id },
        });

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatar: user.avatar,
          bio: user.bio,
          city: user.city,
          province: user.province,
          isVerified: user.isVerified,
          createdAt: user.createdAt,
          skills: ((user.skills as any[]) || []).map((us: any) => ({
            id: us.skillId,
            name: us.skill?.name || '',
            level: us.level,
            icon: us.skill?.icon,
          })),
          avgRating,
          totalReviews,
          completedProjects,
          portfoliosCount,
        };
      }),
    );

    // Filter by minRating
    if (minRating !== undefined && minRating > 0) {
      specialists = specialists.filter((s) => s.avgRating >= minRating);
    }

    // Sort
    switch (sort) {
      case 'rating':
        specialists.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'experience':
        specialists.sort((a, b) => b.completedProjects - a.completedProjects);
        break;
      case 'price':
        // Sort by project count as proxy for pricing tier
        specialists.sort((a, b) => b.completedProjects - a.completedProjects);
        break;
      case 'newest':
      default:
        specialists.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return {
      data: specialists.slice(0, limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * پروفایل کامل متخصص
   */
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { skills: { include: { skill: true } } },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد');
    }

    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId: id, isPublished: true },
      orderBy: { order: 'asc' },
    });

    const reviews = await this.prisma.review.findMany({
      where: { userId: id },
      include: { author: true },
      orderBy: { createdAt: 'desc' },
    });

    const avgRating = await this.getUserAvgRating(id);
    const completedProjects = await this.prisma.proposal.count({
      where: { userId: id, status: 'ACCEPTED' },
    });
    const totalProposals = await this.prisma.proposal.count({
      where: { userId: id },
    });

    const completionRate =
      totalProposals > 0
        ? Number(((completedProjects / totalProposals) * 100).toFixed(1))
        : 0;

    // Detailed ratings
    const detailedRatings = reviews.length > 0
      ? {
          avgQuality: this.calcAvg(reviews.map((r: any) => r.qualityRating)),
          avgTiming: this.calcAvg(reviews.map((r: any) => r.timingRating)),
          avgCommunication: this.calcAvg(reviews.map((r: any) => r.communicationRating)),
        }
      : null;

    return {
      ...user,
      skills: ((user.skills as any[]) || []).map((us: any) => ({
        id: us.id,
        skillId: us.skillId,
        skillName: us.skill?.name || '',
        skillSlug: us.skill?.slug || '',
        level: us.level,
        experience: us.experience,
      })),
      portfolios,
      reviews: reviews.map((r: any) => ({
        ...r,
        author: r.author
          ? { id: r.author.id, firstName: r.author.firstName, lastName: r.author.lastName, avatar: r.author.avatar }
          : null,
      })),
      avgRating,
      totalReviews: reviews.length,
      completedProjects,
      completionRate,
      detailedRatings,
      stats: {
        totalProposals,
        acceptedProposals: completedProjects,
        portfolios: portfolios.length,
      },
    };
  }

  /**
   * بروزرسانی پروفایل متخصص
   */
  async updateProfile(specialistId: string, dto: UpdateSpecialistProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: specialistId } });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند پروفایل خود را بروزرسانی کنند');
    }

    await this.prisma.user.update({
      where: { id: specialistId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName } : {}),
        ...(dto.bio !== undefined ? { bio: dto.bio } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
        ...(dto.province !== undefined ? { province: dto.province } : {}),
      },
    });

    // Handle skills update if provided
    if (dto.skills) {
      await this.replaceSkills(specialistId, dto.skills.map((name) => ({ name, level: 3 })));
    }

    const updated = await this.prisma.user.findUnique({ where: { id: specialistId } });

    return {
      message: 'پروفایل با موفقیت بروزرسانی شد',
      data: updated,
    };
  }

  /**
   * بروزرسانی مهارت‌ها
   */
  async updateSkills(specialistId: string, dto: UpdateSkillsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: specialistId } });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند مهارت‌های خود را بروزرسانی کنند');
    }

    await this.replaceSkills(specialistId, dto.skills);

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId: specialistId },
      include: { skill: true },
      orderBy: { level: 'desc' },
    });

    return {
      message: 'مهارت‌ها با موفقیت بروزرسانی شد',
      data: userSkills.map((us: any) => ({
        id: us.id,
        skillId: us.skillId,
        skillName: us.skill?.name || '',
        level: us.level,
      })),
    };
  }

  /**
   * افزودن نمونه‌کار
   */
  async addPortfolio(specialistId: string, dto: CreatePortfolioDto) {
    const user = await this.prisma.user.findUnique({ where: { id: specialistId } });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند نمونه‌کار اضافه کنند');
    }

    const portfolio = await this.prisma.portfolio.create({
      data: {
        userId: specialistId,
        title: dto.title,
        description: dto.description,
        imageUrls: dto.imageUrl ? JSON.stringify([dto.imageUrl]) : '[]',
        projectUrl: dto.projectUrl,
      },
    });

    return {
      message: 'نمونه‌کار با موفقیت اضافه شد',
      data: portfolio,
    };
  }

  /**
   * بروزرسانی نمونه‌کار
   */
  async updatePortfolio(
    specialistId: string,
    portfolioId: string,
    dto: UpdatePortfolioDto,
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { id: portfolioId } });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== specialistId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را ویرایش کنید');
    }

    const updatedPortfolio = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrls: JSON.stringify([dto.imageUrl]) } : {}),
        ...(dto.projectUrl !== undefined ? { projectUrl: dto.projectUrl } : {}),
      },
    });

    return {
      message: 'نمونه‌کار با موفقیت بروزرسانی شد',
      data: updatedPortfolio,
    };
  }

  /**
   * حذف نمونه‌کار
   */
  async deletePortfolio(specialistId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({ where: { id: portfolioId } });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== specialistId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید');
    }

    await this.prisma.portfolio.delete({ where: { id: portfolioId } });

    return { message: 'نمونه‌کار با موفقیت حذف شد' };
  }

  /**
   * متخصص‌های برتر (بر اساس امتیاز)
   */
  async getTopSpecialists(limit: number = 10) {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'SPECIALIST',
        isActive: true,
        isVerified: true,
      },
      include: { skills: { include: { skill: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit * 3, // Fetch extra for filtering
    });

    const specialistsWithRating = await Promise.all(
      users.map(async (user) => {
        const avgRating = await this.getUserAvgRating(user.id);
        const completedProjects = await this.prisma.proposal.count({
          where: { userId: user.id, status: 'ACCEPTED' },
        });
        const totalReviews = await this.prisma.review.count({
          where: { userId: user.id },
        });

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatar: user.avatar,
          bio: user.bio,
          city: user.city,
          province: user.province,
          isVerified: user.isVerified,
          skills: ((user.skills as any[]) || []).map((us: any) => ({
            id: us.skillId,
            name: us.skill?.name || '',
            level: us.level,
          })),
          avgRating,
          totalReviews,
          completedProjects,
        };
      }),
    );

    // Sort by rating (descending) then by completed projects
    specialistsWithRating.sort((a, b) => {
      if (b.avgRating !== a.avgRating) return b.avgRating - a.avgRating;
      return b.completedProjects - a.completedProjects;
    });

    return specialistsWithRating.slice(0, limit);
  }

  /**
   * جستجوی متخصص‌ها
   */
  async search(query: string, filters: {
    city?: string;
    province?: string;
    minRating?: number;
    categoryId?: string;
  } = {}) {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'SPECIALIST',
        isActive: true,
        ...(filters.city ? { city: filters.city } : {}),
        ...(filters.province ? { province: filters.province } : {}),
        ...(filters.categoryId
          ? { skills: { some: { skill: { categoryId: filters.categoryId } } } }
          : {}),
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
          { skills: { some: { skill: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      include: { skills: { include: { skill: true } } },
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const avgRating = await this.getUserAvgRating(user.id);
        if (filters.minRating && avgRating < filters.minRating) return null;

        return {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          displayName: user.displayName,
          avatar: user.avatar,
          bio: user.bio,
          city: user.city,
          province: user.province,
          isVerified: user.isVerified,
          avgRating,
          skills: ((user.skills as any[]) || []).map((us: any) => ({
            name: us.skill?.name || '',
            level: us.level,
          })),
        };
      }),
    );

    return results.filter(Boolean);
  }

  // ========== Private Helpers ==========

  private async getUserAvgRating(userId: string): Promise<number> {
    const reviews = await this.prisma.review.findMany({
      where: { userId },
      select: { rating: true },
    });

    if (reviews.length === 0) return 0;
    return Number(
      (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
    );
  }

  private calcAvg(values: (number | null | undefined)[]): number {
    const filtered = values.filter((v): v is number => v !== null && v !== undefined);
    if (filtered.length === 0) return 0;
    return Number((filtered.reduce((s, v) => s + v, 0) / filtered.length).toFixed(1));
  }

  private async replaceSkills(
    userId: string,
    skills: { name: string; level: number }[],
  ): Promise<void> {
    // Delete existing skills
    await this.prisma.userSkill.deleteMany({ where: { userId } });

    // Create new skills
    for (const item of skills) {
      const slug = slugify(item.name, { lower: true, strict: true });
      let skill = await this.prisma.skill.findUnique({ where: { slug } });

      if (!skill) {
        skill = await this.prisma.skill.create({
          data: { name: item.name, slug },
        });
      }

      if (!skill) continue;

      await this.prisma.userSkill.create({
        data: {
          userId,
          skillId: skill.id,
          level: item.level,
        },
      });
    }
  }
}
