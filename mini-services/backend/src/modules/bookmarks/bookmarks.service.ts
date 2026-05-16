import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ToggleBookmarkDto } from './dto/toggle-bookmark.dto';
import { QueryBookmarksDto } from './dto/query-bookmarks.dto';

@Injectable()
export class BookmarksService {
  constructor(private prisma: PrismaService) {}

  // ==================== Toggle Bookmark ====================

  async toggleBookmark(userId: string, dto: ToggleBookmarkDto) {
    // Validate target exists
    await this.validateTarget(dto.type, dto.targetId);

    const existing = await this.prisma.bookmark.findUnique({
      where: {
        userId_type_targetId: {
          userId,
          type: dto.type,
          targetId: dto.targetId,
        },
      },
    });

    if (existing) {
      // Remove bookmark
      await this.prisma.bookmark.delete({ where: { id: existing.id } });
      return {
        bookmarked: false,
        message: 'از علاقه‌مندی‌ها حذف شد',
      };
    } else {
      // Add bookmark
      await this.prisma.bookmark.create({
        data: {
          userId,
          type: dto.type,
          targetId: dto.targetId,
        },
      });
      return {
        bookmarked: true,
        message: 'به علاقه‌مندی‌ها اضافه شد',
      };
    }
  }

  // ==================== Get User Bookmarks ====================

  async getUserBookmarks(userId: string, query: QueryBookmarksDto) {
    const { page, limit, type } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { userId };
    if (type) {
      where.type = type;
    }

    const [bookmarks, total] = await Promise.all([
      this.prisma.bookmark.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.bookmark.count({ where }),
    ]);

    // Enrich bookmarks with target data
    const enrichedBookmarks = await Promise.all(
      bookmarks.map(async (bookmark) => {
        let targetData: any = null;

        if (bookmark.type === 'REQUEST') {
          const request = await this.prisma.serviceRequest.findUnique({
            where: { id: bookmark.targetId },
            select: {
              id: true,
              title: true,
              slug: true,
              budgetMin: true,
              budgetMax: true,
              budgetType: true,
              city: true,
              status: true,
              category: {
                select: { id: true, name: true, slug: true, icon: true },
              },
            },
          });
          targetData = request;
        } else if (bookmark.type === 'SPECIALIST') {
          const specialist = await this.prisma.user.findUnique({
            where: { id: bookmark.targetId, role: 'SPECIALIST', isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              displayName: true,
              avatar: true,
              city: true,
              bio: true,
              online: true,
              reviews: {
                select: { rating: true },
                where: { isPublished: true },
              },
              _count: {
                select: {
                  portfolios: { where: { isPublished: true } },
                  sentProposals: { where: { status: 'ACCEPTED' } },
                },
              },
            },
          });
          if (specialist) {
            const totalRating = specialist.reviews.reduce((sum, r) => sum + r.rating, 0);
            const ratingCount = specialist.reviews.length;
            const { reviews, _count, ...specialistData } = specialist as any;
            targetData = {
              ...specialistData,
              ratingAverage:
                ratingCount > 0
                  ? Math.round((totalRating / ratingCount) * 10) / 10
                  : 0,
              ratingCount,
              portfolioCount: _count.portfolios,
              completedProjects: _count.sentProposals,
            };
          }
        }

        return {
          id: bookmark.id,
          type: bookmark.type,
          targetId: bookmark.targetId,
          target: targetData,
          createdAt: bookmark.createdAt,
        };
      }),
    );

    return {
      bookmarks: enrichedBookmarks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Check if Bookmarked ====================

  async isBookmarked(userId: string, type: string, targetId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_type_targetId: {
          userId,
          type,
          targetId,
        },
      },
    });

    return {
      bookmarked: !!bookmark,
    };
  }

  // ==================== Remove Bookmark ====================

  async removeBookmark(userId: string, type: string, targetId: string) {
    const bookmark = await this.prisma.bookmark.findUnique({
      where: {
        userId_type_targetId: {
          userId,
          type,
          targetId,
        },
      },
    });

    if (!bookmark) {
      throw new NotFoundException('علاقه‌مندی یافت نشد');
    }

    await this.prisma.bookmark.delete({ where: { id: bookmark.id } });

    return {
      message: 'علاقه‌مندی با موفقیت حذف شد',
    };
  }

  // ==================== Helpers ====================

  private async validateTarget(type: string, targetId: string) {
    if (type === 'REQUEST') {
      const request = await this.prisma.serviceRequest.findUnique({
        where: { id: targetId },
      });
      if (!request) {
        throw new BadRequestException('نیاز مورد نظر یافت نشد');
      }
    } else if (type === 'SPECIALIST') {
      const user = await this.prisma.user.findUnique({
        where: { id: targetId, role: 'SPECIALIST', isActive: true },
      });
      if (!user) {
        throw new BadRequestException('کسب‌وکار مورد نظر یافت نشد');
      }
    } else {
      throw new BadRequestException('نوع علاقه‌مندی نامعتبر است');
    }
  }
}
