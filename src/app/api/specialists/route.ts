import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { type PaginatedResponse } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

// ============ TYPES ============

interface SpecialistListItem {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  online: boolean;
  createdAt: Date;
  // Computed fields
  rating: number;
  projectCount: number;
  completionRate: number;
  // Relations
  skills: { id: string; name: string; level: number }[];
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const city = searchParams.get('city') || undefined;
    const skill = searchParams.get('skill') || undefined;
    const sort = searchParams.get('sort') || 'rating';
    const search = searchParams.get('search') || undefined;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      role: 'SPECIALIST',
      isActive: true,
      isBanned: false,
    };

    if (city) {
      where.city = { contains: city };
    }

    if (skill) {
      where.skills = {
        some: {
          skill: {
            name: { contains: skill },
          },
        },
      };
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { displayName: { contains: search } },
        { bio: { contains: search } },
      ];
    }

    // Build orderBy
    let orderBy: Prisma.UserOrderByWithRelationInput;
    switch (sort) {
      case 'newest':
        orderBy = { createdAt: 'desc' };
        break;
      case 'oldest':
        orderBy = { createdAt: 'asc' };
        break;
      case 'most_projects':
        orderBy = { requests: { _count: 'desc' } };
        break;
      case 'rating':
      default:
        // We'll sort by computed rating after fetch
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          skills: {
            include: {
              skill: {
                select: { id: true, name: true },
              },
            },
          },
          givenReviews: {
            select: { rating: true },
          },
          sentProposals: {
            where: { status: 'ACCEPTED' },
            select: { id: true },
          },
          reviews: {
            select: { id: true },
          },
          _count: {
            select: {
              sentProposals: true,
              reviews: true,
              portfolios: true,
            },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    // Map and compute rating/project data
    const mappedSpecialists: SpecialistListItem[] = users.map((user) => {
      const reviewRatings = user.givenReviews.map((r) => r.rating);
      const avgRating = reviewRatings.length > 0
        ? reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length
        : 0;

      const completedProjects = user.sentProposals.length;
      const totalReviews = user._count.reviews;

      return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        city: user.city,
        province: user.province,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
        online: user.online,
        createdAt: user.createdAt,
        rating: Math.round(avgRating * 10) / 10,
        projectCount: completedProjects,
        completionRate: totalReviews > 0
          ? Math.round((completedProjects / totalReviews) * 100)
          : 0,
        skills: user.skills.map((us) => ({
          id: us.skill.id,
          name: us.skill.name,
          level: us.level,
        })),
      };
    });

    // Sort by rating if requested
    if (sort === 'rating') {
      mappedSpecialists.sort((a, b) => b.rating - a.rating);
    }

    const response: PaginatedResponse<SpecialistListItem> = {
      data: mappedSpecialists,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Specialists GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
