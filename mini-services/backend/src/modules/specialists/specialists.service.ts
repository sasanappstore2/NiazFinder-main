import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Not, In } from 'typeorm';
import { User, UserRole } from '../../entities/user.entity';
import { Portfolio } from '../../entities/portfolio.entity';
import { Review } from '../../entities/review.entity';
import { Proposal, ProposalStatus } from '../../entities/proposal.entity';
import { Skill } from '../../entities/skill.entity';
import { UserSkill } from '../../entities/user-skill.entity';
import { UpdateSpecialistProfileDto } from './dto/update-specialist-profile.dto';
import { UpdateSkillsDto } from './dto/update-skills.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QuerySpecialistsDto } from './dto/query-specialists.dto';
import * as slugify from 'slugify';

@Injectable()
export class SpecialistsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Portfolio)
    private readonly portfolioRepo: Repository<Portfolio>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Proposal)
    private readonly proposalRepo: Repository<Proposal>,
    @InjectRepository(Skill)
    private readonly skillRepo: Repository<Skill>,
    @InjectRepository(UserSkill)
    private readonly userSkillRepo: Repository<UserSkill>,

  ) {}

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

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.skills', 'userSkill')
      .leftJoinAndSelect('userSkill.skill', 'skill')
      .leftJoin(
        'user.reviews',
        'review',
        'review.isPublished = :isPublished',
        { isPublished: true },
      )
      .where('user.role = :role', { role: UserRole.SPECIALIST })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (city) {
      qb.andWhere('user.city = :city', { city });
    }
    if (province) {
      qb.andWhere('user.province = :province', { province });
    }
    if (search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.displayName ILIKE :search OR user.bio ILIKE :search OR skill.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (categoryId) {
      qb.andWhere('skill.categoryId = :categoryId', { categoryId });
    }

    // Fetch and filter by minRating in-memory after getting results
    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit * 2); // Fetch extra to filter by rating
    qb.orderBy('user.createdAt', 'DESC');
    qb.addOrderBy('user.isVerified', 'DESC');

    const [users, total] = await qb.getManyAndCount();

    // Build specialist profiles with computed stats
    let specialists = await Promise.all(
      users.map(async (user) => {
        const avgRating = await this.getUserAvgRating(user.id);
        const completedProjects = await this.proposalRepo.count({
          where: { specialistId: user.id, status: ProposalStatus.ACCEPTED },
        });
        const portfoliosCount = await this.portfolioRepo.count({
          where: { userId: user.id, isPublished: true } as any,
        });
        const totalReviews = await this.reviewRepo.count({
          where: { targetUserId: user.id } as any,
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
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['skills', 'skills.skill'] as any,
    });

    if (!user || user.role !== UserRole.SPECIALIST) {
      throw new NotFoundException('کسب‌وکار مورد نظر یافت نشد');
    }

    const portfolios = await this.portfolioRepo.find({
      where: { userId: id, isPublished: true } as any,
      order: { order: 'ASC' } as any,
    });

    const reviews = await this.reviewRepo.find({
      where: { targetUserId: id } as any,
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });

    const avgRating = await this.getUserAvgRating(id);
    const completedProjects = await this.proposalRepo.count({
      where: { specialistId: id, status: ProposalStatus.ACCEPTED },
    });
    const totalProposals = await this.proposalRepo.count({
      where: { specialistId: id },
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
    const user = await this.userRepo.findOne({ where: { id: specialistId } });

    if (!user || user.role !== UserRole.SPECIALIST) {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند پروفایل خود را بروزرسانی کنند');
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.bio !== undefined) user.bio = dto.bio;
    if (dto.city !== undefined) user.city = dto.city;
    if (dto.province !== undefined) user.province = dto.province;

    await this.userRepo.save(user);

    // Handle skills update if provided
    if (dto.skills) {
      await this.replaceSkills(specialistId, dto.skills.map((name) => ({ name, level: 3 })));
    }

    const updated = await this.userRepo.findOne({ where: { id: specialistId } });

    return {
      message: 'پروفایل با موفقیت بروزرسانی شد',
      data: updated,
    };
  }

  /**
   * بروزرسانی مهارت‌ها
   */
  async updateSkills(specialistId: string, dto: UpdateSkillsDto) {
    const user = await this.userRepo.findOne({ where: { id: specialistId } });

    if (!user || user.role !== UserRole.SPECIALIST) {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند مهارت‌های خود را بروزرسانی کنند');
    }

    await this.replaceSkills(specialistId, dto.skills);

    const userSkills = await this.userSkillRepo.find({
      where: { userId: specialistId },
      relations: ['skill'],
      order: { level: 'DESC' } as any,
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
    const user = await this.userRepo.findOne({ where: { id: specialistId } });

    if (!user || user.role !== UserRole.SPECIALIST) {
      throw new BadRequestException('فقط کسب‌وکارها می‌توانند نمونه‌کار اضافه کنند');
    }

    const portfolio = this.portfolioRepo.create({
      userId: specialistId,
      title: dto.title,
      description: dto.description,
      imageUrls: dto.imageUrl ? JSON.stringify([dto.imageUrl]) : '[]',
      projectUrl: dto.projectUrl,
    } as any);

    await this.portfolioRepo.save(portfolio);

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
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== specialistId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را ویرایش کنید');
    }

    if (dto.title !== undefined) portfolio.title = dto.title;
    if (dto.description !== undefined) portfolio.description = dto.description;
    if (dto.imageUrl !== undefined) portfolio.imageUrls = JSON.stringify([dto.imageUrl]) as any;
    if (dto.projectUrl !== undefined) portfolio.projectUrl = dto.projectUrl;

    await this.portfolioRepo.save(portfolio);

    return {
      message: 'نمونه‌کار با موفقیت بروزرسانی شد',
      data: portfolio,
    };
  }

  /**
   * حذف نمونه‌کار
   */
  async deletePortfolio(specialistId: string, portfolioId: string) {
    const portfolio = await this.portfolioRepo.findOne({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== specialistId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید');
    }

    await this.portfolioRepo.remove(portfolio);

    return { message: 'نمونه‌کار با موفقیت حذف شد' };
  }

  /**
   * متخصص‌های برتر (بر اساس امتیاز)
   */
  async getTopSpecialists(limit: number = 10) {
    const users = await this.userRepo.find({
      where: {
        role: UserRole.SPECIALIST,
        isActive: true,
        isVerified: true,
      },
      relations: ['skills', 'skills.skill'] as any,
      order: { createdAt: 'DESC' },
      take: limit * 3, // Fetch extra for filtering
    });

    const specialistsWithRating = await Promise.all(
      users.map(async (user) => {
        const avgRating = await this.getUserAvgRating(user.id);
        const completedProjects = await this.proposalRepo.count({
          where: { specialistId: user.id, status: ProposalStatus.ACCEPTED },
        });
        const totalReviews = await this.reviewRepo.count({
          where: { targetUserId: user.id } as any,
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
    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.skills', 'userSkill')
      .leftJoinAndSelect('userSkill.skill', 'skill')
      .where('user.role = :role', { role: UserRole.SPECIALIST })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.displayName ILIKE :query OR user.bio ILIKE :search OR skill.name ILIKE :search)',
        { query: `%${query}%`, search: `%${query}%` },
      );

    if (filters.city) {
      qb.andWhere('user.city = :city', { city: filters.city });
    }
    if (filters.province) {
      qb.andWhere('user.province = :province', { province: filters.province });
    }
    if (filters.categoryId) {
      qb.andWhere('skill.categoryId = :categoryId', { categoryId: filters.categoryId });
    }

    qb.orderBy('user.isVerified', 'DESC').addOrderBy('user.createdAt', 'DESC').take(20);

    const users = await qb.getMany();

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
    const reviews = await this.reviewRepo.find({
      where: { targetUserId: userId } as any,
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
    await this.userSkillRepo.delete({ userId });

    // Create new skills
    for (const item of skills) {
      const slug = slugify(item.name, { lower: true, strict: true });
      let skill = await this.skillRepo.findOne({ where: { slug } as any });

      if (!skill) {
        skill = this.skillRepo.create({ name: item.name, slug });
        await this.skillRepo.save(skill as any);
      }

      if (!skill) continue;

      const userSkill = this.userSkillRepo.create({
        userId,
        skillId: skill.id,
        level: item.level,
      });
      await this.userSkillRepo.save(userSkill);
    }
  }
}
