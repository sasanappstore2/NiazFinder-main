import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, daysFromNow } from '@/lib/auth';
import type { User } from '@/lib/types';

// ============ TYPES ============

interface VerifyRequestBody {
  phone: string;
  code: string;
}

interface VerifyResponseBody {
  user: User;
  token: string;
  isNewUser: boolean;
}

// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { phone, code } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'شماره موبایل و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    // Find valid unexpired OTP
    const otpRecord = await db.otpCode.findFirst({
      where: {
        phone,
        code,
        verified: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'کد تایید نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    // Mark OTP as verified
    await db.otpCode.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Check if user exists with this phone
    let user = await db.user.findUnique({
      where: { phone },
    });

    let isNewUser = false;

    if (!user) {
      // Auto-create new user
      isNewUser = true;

      // Admin special case
      const isAdmin = phone === '09374333028';

      user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone,
            role: isAdmin ? 'ADMIN' : 'CLIENT',
            isVerified: true,
            phoneVerified: true,
          },
        });

        // Create wallet
        await tx.wallet.create({
          data: { userId: newUser.id },
        });

        return newUser;
      });
    } else {
      // Check if user is active and not banned
      if (!user.isActive) {
        return NextResponse.json(
          { error: 'حساب کاربری شما غیرفعال شده است' },
          { status: 403 }
        );
      }

      if (user.isBanned) {
        return NextResponse.json(
          { error: `حساب کاربری شما مسدود شده است: ${user.banReason || 'بدون دلیل'}` },
          { status: 403 }
        );
      }

      // Mark phone as verified
      await db.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          isVerified: true,
        },
      });
    }

    // Generate auth token
    const token = generateToken();
    await db.authToken.create({
      data: {
        userId: user.id,
        token,
        type: 'auth',
        expiresAt: daysFromNow(30),
      },
    });

    // Update last seen
    await db.user.update({
      where: { id: user.id },
      data: { lastSeenAt: new Date(), online: true },
    });

    // Build response
    const responseUser: User = {
      id: user.id,
      phone: user.phone,
      email: user.email || undefined,
      username: user.username || undefined,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || undefined,
      avatar: user.avatar || undefined,
      bio: user.bio || undefined,
      city: user.city || undefined,
      province: user.province || undefined,
      role: user.role as User['role'],
      isVerified: user.isVerified,
      isActive: user.isActive,
      online: true,
      rating: 0,
      projectCount: 0,
      completionRate: 0,
      responseRate: 0,
      createdAt: user.createdAt.toISOString(),
    };

    const responseBody: VerifyResponseBody = {
      user: responseUser,
      token,
      isNewUser,
    };

    return NextResponse.json(
      {
        message: isNewUser ? 'ثبت‌نام و ورود با موفقیت انجام شد' : 'ورود با موفقیت انجام شد',
        ...responseBody,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
