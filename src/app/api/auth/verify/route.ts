import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateToken, daysFromNow } from '@/lib/auth';
import type { User } from '@/lib/types';
import { findValidOtp, markOtpVerified } from '@/lib/otp-store';
import { isTestOtpCode } from '@/lib/auth/test-otp';
import { isSuperAdminPhone, normalizePhone } from '@/lib/super-admin';

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

    const normalizedPhone = normalizePhone(phone);
    const grantSuperAdmin = isSuperAdminPhone(normalizedPhone);

    // Valid OTP from store, or fixed test code (1234) in non-production
    const otpRecord = findValidOtp(normalizedPhone, code);
    const acceptedTestOtp = isTestOtpCode(code);

    if (!otpRecord && !acceptedTestOtp) {
      return NextResponse.json(
        { error: 'کد تایید نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    if (otpRecord) {
      markOtpVerified(normalizedPhone, code);
    }

    // SUPER_ADMIN is only granted to the owner phone (09374333028), never from request body.
    let user = await db.user.findUnique({
      where: { phone: normalizedPhone },
    });

    let isNewUser = false;

    if (!user) {
      // Auto-create new user
      isNewUser = true;

      user = await db.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            phone: normalizedPhone,
            email: `${normalizedPhone}@needfinder.local`,
            role: grantSuperAdmin ? ('SUPER_ADMIN' as const) : ('CLIENT' as const),
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

      user = await db.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          isVerified: true,
          ...(grantSuperAdmin
            ? { role: 'SUPER_ADMIN' as const }
            : user.role === 'SUPER_ADMIN'
              ? { role: 'CLIENT' as const }
              : {}),
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
      phone: user.phone ?? undefined,
      username: user.username ?? undefined,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName ?? undefined,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
      city: user.city ?? undefined,
      province: user.province ?? undefined,
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
