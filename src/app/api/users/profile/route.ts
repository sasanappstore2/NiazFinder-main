import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ TYPES ============

interface UpdateProfileBody {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  bio?: string;
  city?: string;
  province?: string;
  phone?: string;
  avatar?: string;
  coverImage?: string;
  website?: string;
}

interface ProfileResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    username: string | null;
    firstName: string;
    lastName: string;
    displayName: string | null;
    avatar: string | null;
    coverImage: string | null;
    bio: string | null;
    website: string | null;
    city: string | null;
    province: string | null;
    role: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  walletBalance: number;
  walletFrozen: number;
  skills: {
    id: string;
    name: string;
    slug: string;
    level: number;
    experience: string | null;
  }[];
  portfolioCount: number;
  followerCount: number;
  followingCount: number;
  postCount: number;
}

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
        wallet: {
          select: { balance: true, frozen: true },
        },
        skills: {
          include: {
            skill: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        portfolios: {
          where: { isPublished: true },
          select: { id: true },
        },
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });

    if (!fullUser) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
    }

    const response: ProfileResponse = {
      user: {
        id: fullUser.id,
        email: fullUser.email,
        phone: fullUser.phone,
        username: fullUser.username,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        displayName: fullUser.displayName,
        avatar: fullUser.avatar,
        coverImage: fullUser.coverImage,
        bio: fullUser.bio,
        website: fullUser.website,
        city: fullUser.city,
        province: fullUser.province,
        role: fullUser.role,
        isVerified: fullUser.isVerified,
        createdAt: fullUser.createdAt,
        updatedAt: fullUser.updatedAt,
      },
      walletBalance: fullUser.wallet?.balance ?? 0,
      walletFrozen: fullUser.wallet?.frozen ?? 0,
      skills: fullUser.skills.map((us) => ({
        id: us.skill.id,
        name: us.skill.name,
        slug: us.skill.slug,
        level: us.level,
        experience: us.experience,
      })),
      portfolioCount: fullUser.portfolios.length,
      followerCount: fullUser._count.followers,
      followingCount: fullUser._count.following,
      postCount: fullUser._count.posts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Profile GET error:', error);
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

    const body: UpdateProfileBody = await request.json();
    const { firstName, lastName, displayName, username, bio, city, province, phone: _phone, avatar, coverImage, website } = body;

    // Check username uniqueness if provided
    if (username !== undefined && username.trim()) {
      const existingUsername = await db.user.findFirst({
        where: { username: username.trim().toLowerCase(), id: { not: user.id } },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: 'این نام کاربری قبلاً ثبت شده است' },
          { status: 409 }
        );
      }
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, string | null> = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (displayName !== undefined) updateData.displayName = displayName.trim() || null;
    if (bio !== undefined) updateData.bio = bio.trim() || null;
    if (city !== undefined) updateData.city = city.trim() || null;
    if (province !== undefined) updateData.province = province.trim() || null;
    if (_phone !== undefined) {
      return NextResponse.json(
        { error: 'تغییر شماره تلفن فقط از طریق تأیید پیامکی امکان‌پذیر است' },
        { status: 400 }
      );
    }
    if (avatar !== undefined) updateData.avatar = avatar.trim() || null;
    if (coverImage !== undefined) updateData.coverImage = coverImage.trim() || null;
    if (username !== undefined) updateData.username = username.trim().toLowerCase() || null;
    if (website !== undefined) updateData.website = website.trim() || null;

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({
      message: 'پروفایل با موفقیت به‌روزرسانی شد',
      user: {
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
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
