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
import { createSlug } from '../../common/utils';
import { Prisma } from '@prisma/client';

@Injectable()
export class SpecialistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySpecialistsDto) {
    const { city, skill, search, sort = 'newest', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: 'SPECIALIST',
      isActive: true,
      isBanned: false,
    };

    if (city) {
      where.city = city;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { displayName: { contains: search } },
        { bio: { contains: search } },
      ];
    }

    if (skill) {
      where.skills = {
        some: {
          skill: {
            name: { contains: skill },
            isActive: true,
          },
        },
      };
    }

    let orderBy: Prisma.UserOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'rating') {
      orderBy = { createdAt: 'desc' }; // We'll sort in-memory or use a different approach
    } else if (sort === 'most_projects') {
      orderBy = { createdAt: 'desc' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          skills: {
            include: {
              skill: {
                select: { id: true, name: true, icon: true },
              },
            },
          },
          _count: {
            select: {
              reviews: { where: { isPublished: true } },
              portfolios: { where: { isPublished: true } },
              sentProposals: { where: { status: 'ACCEPTED' } },
            },
          },
          reviews: {
            where: { isPublished: true },
            select: { rating: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Compute avg rating for each specialist
    let specialists = users.map((user) => {
      const reviews = user.reviews || [];
      const avgRating =
        reviews.length > 0
          ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
          : 0;

      const completedProjects = user._count.sentProposals;

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
        skills: user.skills.map((us) => ({
          id: us.skillId,
          name: us.skill.name,
          level: us.level,
          icon: us.skill.icon,
        })),
        avgRating,
        totalReviews: user._count.reviews,
        completedProjects,
        portfoliosCount: user._count.portfolios,
      };
    });

    // Sort by rating or most_projects if needed
    if (sort === 'rating') {
      specialists.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sort === 'most_projects') {
      specialists.sort((a, b) => b.completedProjects - a.completedProjects);
    }

    return {
      data: specialists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        address: true,
        role: true,
        isVerified: true,
        createdAt: true,
        skills: {
          include: {
            skill: {
              select: { id: true, name: true, slug: true, icon: true, description: true },
            },
          },
          orderBy: { level: 'desc' },
        },
        portfolios: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
        reviews: {
          where: { isPublished: true },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
            request: {
              select: { id: true, title: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            sentProposals: { where: { status: 'ACCEPTED' } },
            reviews: { where: { isPublished: true } },
            portfolios: { where: { isPublished: true } },
          },
        },
      },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new NotFoundException('متخصص مورد نظر یافت نشد');
    }

    const {
      _count,
      reviews: userReviews,
      ...restUser
    } = user as any;

    const reviews = userReviews || [];
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
        : 0;

    // Compute response time: avg time between request creation and first proposal
    const proposals = await this.prisma.proposal.findMany({
      where: { userId: id },
      select: { createdAt: true, request: { select: { createdAt: true } } },
      orderBy: { createdAt: 'asc' },
    });

    let avgResponseTime: number | null = null;
    if (proposals.length > 0) {
      const responseTimes = proposals.map((p) => {
        return new Date(p.createdAt).getTime() - new Date(p.request.createdAt).getTime();
      });
      const avgMs = responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length;
      avgResponseTime = Number((avgMs / (1000 * 60 * 60)).toFixed(1)); // hours
    }

    // Completion rate
    const totalProposals = await this.prisma.proposal.count({
      where: { userId: id },
    });
    const acceptedProposals = _count?.sentProposals || 0;
    const completionRate =
      totalProposals > 0
        ? Number(((acceptedProposals / totalProposals) * 100).toFixed(1))
        : 0;

    // Compute detailed quality/timing/communication ratings
    const detailedRatings = reviews.length > 0 ? {
      avgQuality: reviews.filter((r) => r.qualityRating).length > 0
        ? Number((reviews.filter((r) => r.qualityRating).reduce((s, r) => s + (r.qualityRating || 0), 0) / reviews.filter((r) => r.qualityRating).length).toFixed(1))
        : 0,
      avgTiming: reviews.filter((r) => r.timingRating).length > 0
        ? Number((reviews.filter((r) => r.timingRating).reduce((s, r) => s + (r.timingRating || 0), 0) / reviews.filter((r) => r.timingRating).length).toFixed(1))
        : 0,
      avgCommunication: reviews.filter((r) => r.communicationRating).length > 0
        ? Number((reviews.filter((r) => r.communicationRating).reduce((s, r) => s + (r.communicationRating || 0), 0) / reviews.filter((r) => r.communicationRating).length).toFixed(1))
        : 0,
    } : null;

    return {
      ...restUser,
      reviews,
      avgRating,
      totalReviews: reviews.length,
      completedProjects: acceptedProposals,
      completionRate,
      avgResponseTime,
      detailedRatings,
      stats: {
        totalProposals,
        acceptedProposals,
        portfolios: _count?.portfolios || 0,
      },
    };
  }

  async updateProfile(userId: string, dto: UpdateSpecialistProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط متخصص‌ها می‌توانند پروفایل خود را بروزرسانی کنند');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName,
        bio: dto.bio,
        city: dto.city,
        province: dto.province,
        address: dto.address,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        province: true,
        address: true,
        isVerified: true,
      },
    });

    return {
      message: 'پروفایل با موفقیت بروزرسانی شد',
      data: updatedUser,
    };
  }

  async updateSkills(userId: string, dto: UpdateSkillsDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط متخصص‌ها می‌توانند مهارت‌های خود را بروزرسانی کنند');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Delete existing skills
      await tx.userSkill.deleteMany({
        where: { userId },
      });

      // Create new skills
      const skills: any[] = [];
      for (const item of dto.skills) {
        let skillId = item.skillId;

        if (!skillId && item.skillName) {
          // Find or create skill
          const slug = createSlug(item.skillName);
          const existingSkill = await tx.skill.findUnique({
            where: { slug },
          });

          if (existingSkill) {
            skillId = existingSkill.id;
          } else {
            const newSkill = await tx.skill.create({
              data: {
                name: item.skillName,
                slug,
              },
            });
            skillId = newSkill.id;
          }
        }

        if (skillId) {
          const userSkill = await tx.userSkill.create({
            data: {
              userId,
              skillId,
              level: item.level,
              experience: item.experience,
            },
            include: {
              skill: {
                select: { id: true, name: true, slug: true, icon: true },
              },
            },
          });
          skills.push(userSkill);
        }
      }

      return skills;
    });

    return {
      message: 'مهارت‌ها با موفقیت بروزرسانی شد',
      data: result.map((us) => ({
        id: us.id,
        skillId: us.skillId,
        skillName: us.skill.name,
        level: us.level,
        experience: us.experience,
      })),
    };
  }

  async addPortfolio(userId: string, dto: CreatePortfolioDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new BadRequestException('فقط متخصص‌ها می‌توانند نمونه‌کار اضافه کنند');
    }

    const portfolio = await this.prisma.portfolio.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        imageUrls: dto.imageUrls ? JSON.stringify(dto.imageUrls) : '[]',
        videoUrl: dto.videoUrl,
        projectUrl: dto.projectUrl,
        clientName: dto.clientName,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        order: dto.order || 0,
      },
    });

    return {
      message: 'نمونه‌کار با موفقیت اضافه شد',
      data: portfolio,
    };
  }

  async updatePortfolio(
    userId: string,
    portfolioId: string,
    dto: UpdatePortfolioDto,
  ) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== userId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را ویرایش کنید');
    }

    const updateData: Prisma.PortfolioUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.imageUrls !== undefined) updateData.imageUrls = JSON.stringify(dto.imageUrls);
    if (dto.videoUrl !== undefined) updateData.videoUrl = dto.videoUrl;
    if (dto.projectUrl !== undefined) updateData.projectUrl = dto.projectUrl;
    if (dto.clientName !== undefined) updateData.clientName = dto.clientName;
    if (dto.completedAt !== undefined)
      updateData.completedAt = dto.completedAt ? new Date(dto.completedAt) : null;
    if (dto.order !== undefined) updateData.order = dto.order;
    if (dto.isPublished !== undefined) updateData.isPublished = dto.isPublished;

    const updatedPortfolio = await this.prisma.portfolio.update({
      where: { id: portfolioId },
      data: updateData,
    });

    return {
      message: 'نمونه‌کار با موفقیت بروزرسانی شد',
      data: updatedPortfolio,
    };
  }

  async deletePortfolio(userId: string, portfolioId: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new NotFoundException('نمونه‌کار مورد نظر یافت نشد');
    }

    if (portfolio.userId !== userId) {
      throw new BadRequestException('شما فقط می‌توانید نمونه‌کارهای خود را حذف کنید');
    }

    await this.prisma.portfolio.delete({
      where: { id: portfolioId },
    });

    return {
      message: 'نمونه‌کار با موفقیت حذف شد',
    };
  }

  async getPortfolios(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new NotFoundException('متخصص مورد نظر یافت نشد');
    }

    const portfolios = await this.prisma.portfolio.findMany({
      where: { userId, isPublished: true },
      orderBy: { order: 'asc' },
    });

    return {
      data: portfolios.map((p) => ({
        ...p,
        imageUrls: JSON.parse(p.imageUrls || '[]'),
      })),
    };
  }

  async getSkills(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new NotFoundException('متخصص مورد نظر یافت نشد');
    }

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          select: { id: true, name: true, slug: true, icon: true, description: true },
        },
      },
      orderBy: { level: 'desc' },
    });

    return {
      data: userSkills.map((us) => ({
        id: us.id,
        skillId: us.skillId,
        skillName: us.skill.name,
        skillSlug: us.skill.slug,
        skillIcon: us.skill.icon,
        level: us.level,
        experience: us.experience,
        createdAt: us.createdAt,
      })),
    };
  }

  async toggleVerification(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isVerified: true, firstName: true, lastName: true },
    });

    if (!user || user.role !== 'SPECIALIST') {
      throw new NotFoundException('متخصص مورد نظر یافت نشد');
    }

    const newStatus = !user.isVerified;

    const [updatedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { isVerified: newStatus },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isVerified: true,
        },
      }),
      this.prisma.adminLog.create({
        data: {
          adminId,
          action: newStatus ? 'VERIFY_SPECIALIST' : 'UNVERIFY_SPECIALIST',
          target: `User:${userId}`,
          details: JSON.stringify({
            userId,
            action: newStatus ? 'verify' : 'unverify',
            specialistName: `${user.firstName} ${user.lastName}`,
          }),
        },
      }),
    ]);

    // Notify the specialist
    await this.prisma.notification.create({
      data: {
        userId,
        type: 'VERIFICATION',
        title: newStatus ? 'تایید هویت' : 'لغو تایید هویت',
        message: newStatus
          ? 'حساب کاربری شما به عنوان متخصص تایید شد'
          : 'تایید هویت حساب کاربری شما لغو شد',
        data: JSON.stringify({ verified: newStatus }),
      },
    });

    return {
      message: newStatus
        ? 'متخصص با موفقیت تایید شد'
        : 'تایید هویت متخصص لغو شد',
      data: updatedUser,
    };
  }
}
