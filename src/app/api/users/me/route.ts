import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.id },
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
        _count: {
          select: {
            reviews: true,
            portfolios: true,
            sentProposals: true,
            requests: true,
          },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
    }

    // Compute rating
    const reviewRatings = fullUser.givenReviews.map((r) => r.rating);
    const rating = reviewRatings.length > 0
      ? Math.round((reviewRatings.reduce((sum, r) => sum + r, 0) / reviewRatings.length) * 10) / 10
      : 0;

    // Compute project count
    const projectCount = fullUser.sentProposals.length;

    // Compute completion rate
    const totalReviews = fullUser._count.reviews;
    const completionRate = totalReviews > 0
      ? Math.round((projectCount / totalReviews) * 100)
      : 0;

    const result = {
      id: fullUser.id,
      email: fullUser.email,
      phone: fullUser.phone,
      firstName: fullUser.firstName,
      lastName: fullUser.lastName,
      displayName: fullUser.displayName,
      avatar: fullUser.avatar,
      bio: fullUser.bio,
      city: fullUser.city,
      province: fullUser.province,
      role: fullUser.role,
      isVerified: fullUser.isVerified,
      isActive: fullUser.isActive,
      online: fullUser.online,
      createdAt: fullUser.createdAt.toISOString(),
      updatedAt: fullUser.updatedAt.toISOString(),
      // Computed fields
      rating,
      projectCount,
      completionRate,
      reviewCount: totalReviews,
      portfolioCount: fullUser._count.portfolios,
      proposalCount: fullUser._count.sentProposals,
      requestCount: fullUser._count.requests,
      // Relations
      skills: fullUser.skills.map((us) => ({
        id: us.skill.id,
        name: us.skill.name,
        level: us.level,
        experience: us.experience,
      })),
    };

    return NextResponse.json({ user: result });
  } catch (error) {
    console.error('User me GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ PUT handler ============

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      displayName,
      bio,
      city,
      province,
      phone,
      avatar,
    } = body;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim() || '' }),
        ...(lastName !== undefined && { lastName: lastName.trim() || '' }),
        ...(displayName !== undefined && { displayName: displayName?.trim() || null }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(province !== undefined && { province: province?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(avatar !== undefined && { avatar: avatar?.trim() || null }),
      },
    });

    const result = {
      id: updatedUser.id,
      email: updatedUser.email,
      phone: updatedUser.phone,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      displayName: updatedUser.displayName,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      city: updatedUser.city,
      province: updatedUser.province,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      isActive: updatedUser.isActive,
      online: updatedUser.online,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    };

    return NextResponse.json(
      { message: 'پروفایل با موفقیت بروزرسانی شد', user: result }
    );
  } catch (error) {
    console.error('User me PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
