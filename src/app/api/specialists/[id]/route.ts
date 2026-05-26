import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ============ GET handler ============

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      include: {
        skills: {
          include: {
            skill: {
              select: { id: true, name: true },
            },
          },
        },
        portfolios: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
        },
        reviews: {
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
              select: {
                id: true,
                title: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        givenReviews: {
          select: { rating: true },
        },
        sentProposals: {
          where: { status: 'ACCEPTED' },
          select: { id: true },
        },
        _count: {
          select: {
            reviews: true,
            portfolios: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'کسب‌وکار مورد نظر یافت نشد' },
        { status: 404 }
      );
    }

    // Compute rating (avg of received reviews — reviews given TO this specialist)
    const reviewRatings = user.givenReviews.map((r) => r.rating);
    const rating = reviewRatings.length > 0
      ? Math.round((reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length) * 10) / 10
      : 0;

    // Compute project count (accepted proposals)
    const projectCount = user.sentProposals.length;

    // Compute completion rate
    const totalReviews = user._count.reviews;
    const completionRate = totalReviews > 0
      ? Math.round((projectCount / totalReviews) * 100)
      : 0;

    const mappedPortfolios = user.portfolios.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      imageUrls: JSON.parse(p.imageUrls),
      videoUrl: p.videoUrl,
      projectUrl: p.projectUrl,
      clientName: p.clientName,
      completedAt: p.completedAt?.toISOString() || null,
      createdAt: p.createdAt.toISOString(),
    }));

    const mappedReviews = user.reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      response: r.response,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
      request: r.request,
    }));

    const result = {
      id: user.id,
      email: user.email,
      hasPhone: Boolean(user.phone?.trim()),
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
      createdAt: user.createdAt.toISOString(),
      // Computed fields
      rating,
      projectCount,
      completionRate,
      portfolioCount: user._count.portfolios,
      // Relations
      skills: user.skills.map((us) => ({
        id: us.skill.id,
        name: us.skill.name,
        level: us.level,
        experience: us.experience,
      })),
      portfolios: mappedPortfolios,
      reviews: mappedReviews,
    };

    return NextResponse.json({ specialist: result });
  } catch (error) {
    console.error('Specialist detail GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
