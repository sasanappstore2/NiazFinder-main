import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, type?: string) {
    const normalizedQuery = query.trim().toLowerCase();
    const searchType = type || 'all';

    let requests: any[] = [];
    let specialists: any[] = [];
    let categories: any[] = [];

    let requestsCount = 0;
    let specialistsCount = 0;
    let categoriesCount = 0;

    // Search Requests (title, description)
    if (searchType === 'all' || searchType === 'requests') {
      const requestWhere: any = {
        AND: [
          { status: { in: ['OPEN', 'IN_PROGRESS'] } },
          {
            OR: [
              { title: { contains: normalizedQuery } },
              { description: { contains: normalizedQuery } },
            ],
          },
        ],
      };

      [requests, requestsCount] = await Promise.all([
        this.prisma.serviceRequest.findMany({
          where: requestWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            budgetMin: true,
            budgetMax: true,
            budgetType: true,
            status: true,
            city: true,
            province: true,
            createdAt: true,
            category: {
              select: { id: true, name: true, slug: true },
            },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                displayName: true,
                avatar: true,
                isVerified: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.serviceRequest.count({ where: requestWhere }),
      ]);
    }

    // Search Specialists (firstName, lastName, bio, skills)
    if (searchType === 'all' || searchType === 'specialists') {
      const specialistWhere: any = {
        AND: [
          { role: 'SPECIALIST' },
          { isActive: true },
          { isBanned: false },
          {
            OR: [
              { firstName: { contains: normalizedQuery } },
              { lastName: { contains: normalizedQuery } },
              { bio: { contains: normalizedQuery } },
              {
                skills: {
                  some: {
                    skill: {
                      OR: [
                        { name: { contains: normalizedQuery } },
                        { description: { contains: normalizedQuery } },
                      ],
                    },
                  },
                },
              },
            ],
          },
        ],
      };

      [specialists, specialistsCount] = await Promise.all([
        this.prisma.user.findMany({
          where: specialistWhere,
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
              select: {
                level: true,
                experience: true,
                skill: {
                  select: { id: true, name: true, slug: true },
                },
              },
              take: 5,
            },
            _count: {
              select: {
                reviews: true,
                portfolios: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.user.count({ where: specialistWhere }),
      ]);

      // Attach average rating to specialists
      const specialistIds = specialists.map((s) => s.id);
      if (specialistIds.length > 0) {
        const ratings = await this.prisma.review.groupBy({
          by: ['userId'],
          where: { userId: { in: specialistIds }, isPublished: true },
          _avg: { rating: true },
        });

        const ratingMap = new Map<string, number>();
        ratings.forEach((r) => {
          if (r._avg.rating) {
            ratingMap.set(r.userId, Math.round(r._avg.rating * 10) / 10);
          }
        });

        specialists = specialists.map((s) => ({
          ...s,
          averageRating: ratingMap.get(s.id) || 0,
        }));
      }
    }

    // Search Categories (name, description)
    if (searchType === 'all' || searchType === 'categories') {
      const categoryWhere: any = {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: normalizedQuery } },
              { description: { contains: normalizedQuery } },
            ],
          },
        ],
      };

      [categories, categoriesCount] = await Promise.all([
        this.prisma.category.findMany({
          where: categoryWhere,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            icon: true,
            image: true,
            order: true,
            _count: {
              select: {
                requests: true,
                skills: true,
                children: true,
              },
            },
          },
          orderBy: { order: 'asc' },
          take: 10,
        }),
        this.prisma.category.count({ where: categoryWhere }),
      ]);
    }

    return {
      query,
      type: searchType,
      results: {
        requests: {
          items: requests,
          total: requestsCount,
        },
        specialists: {
          items: specialists,
          total: specialistsCount,
        },
        categories: {
          items: categories,
          total: categoriesCount,
        },
      },
    };
  }
}
