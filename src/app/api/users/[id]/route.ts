import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============ TYPES ============

interface PublicProfileResponse {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    bio: string | null;
    city: string | null;
    province: string | null;
    role: string;
    isVerified: boolean;
    online: boolean;
    createdAt: Date;
  };
  skills: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    level: number;
    experience: string | null;
  }[];
  portfolio: {
    id: string;
    title: string;
    description: string | null;
    imageUrls: string[];
    videoUrl: string | null;
    projectUrl: string | null;
    clientName: string | null;
    completedAt: Date | null;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    author: {
      id: string;
      firstName: string;
      lastName: string;
      avatar: string | null;
    };
  }[];
  avgRating: number;
  projectCount: number;
}

// ============ GET handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه کاربر الزامی است' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            skill: {
              select: { id: true, name: true, slug: true, icon: true },
            },
          },
        },
        portfolios: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
        reviews: {
          where: { isPublished: true },
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        sentProposals: {
          where: { status: 'ACCEPTED' },
          select: { id: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'کاربر مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Calculate average rating
    const ratings = user.reviews.map((r) => r.rating);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
      : 0;

    const response: PublicProfileResponse = {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        avatar: user.avatar,
        bio: user.bio,
        city: user.city,
        province: user.province,
        role: user.role,
        isVerified: user.isVerified,
        online: user.online,
        createdAt: user.createdAt,
      },
      skills: user.skills.map((us) => ({
        id: us.skill.id,
        name: us.skill.name,
        slug: us.skill.slug,
        icon: us.skill.icon,
        level: us.level,
        experience: us.experience,
      })),
      portfolio: user.portfolios.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        imageUrls: JSON.parse(p.imageUrls) as string[],
        videoUrl: p.videoUrl,
        projectUrl: p.projectUrl,
        clientName: p.clientName,
        completedAt: p.completedAt,
      })),
      reviews: user.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        author: r.author,
      })),
      avgRating,
      projectCount: user.sentProposals.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('User public profile GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
