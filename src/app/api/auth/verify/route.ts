import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findValidOtp, markOtpVerified } from '@/lib/otp-store';
import { isTestOtpCode } from '@/lib/auth/test-otp';
import { issueAuthToken, mapDbUserToResponse } from '@/lib/auth/phone-auth-response';
import { toAsciiDigits } from '@/lib/format/digits';
import { clientIp } from '@/lib/security/rate-limit';
import { checkAuthRateLimit } from '@/lib/auth/auth-rate-limit';
import { normalizePhone, resolveSuperAdminRoleUpdate } from '@/lib/super-admin';
import {
  devAuthFallbackEnabled,
  devIssueAuth,
  devUserExists,
} from '@/lib/auth/dev-phone-auth';
import { DATABASE_UNAVAILABLE_FA, isPrismaUnavailableError } from '@/lib/db-health';

interface VerifyRequestBody {
  phone: string;
  code: string;
  intent?: 'login' | 'register';
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { phone, code, intent = 'register' } = body;

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'شماره موبایل و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone);
    const otpCode = toAsciiDigits(code);

    const ipLimit = checkAuthRateLimit(`verify:ip:${clientIp(request)}`, 30, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'تعداد تلاش بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
        { status: 429 }
      );
    }
    const phoneLimit = checkAuthRateLimit(`verify:phone:${normalizedPhone}`, 10, 60_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: 'تعداد تلاش بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
        { status: 429 }
      );
    }

    const otpRecord = await findValidOtp(normalizedPhone, otpCode);
    const acceptedTestOtp = isTestOtpCode(otpCode);

    if (!otpRecord && !acceptedTestOtp) {
      return NextResponse.json(
        { error: 'کد تایید نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    if (otpRecord) {
      await markOtpVerified(normalizedPhone, code);
    }

    try {
      let user = await db.user.findUnique({
        where: { phone: normalizedPhone },
      });

      if (!user) {
        if (intent === 'login') {
          return NextResponse.json(
            { error: 'کاربری با این شماره موبایل یافت نشد' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          message: 'کد تایید تأیید شد',
          needsPassword: true,
          phone: normalizedPhone,
        });
      }

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

      const roleUpdate = resolveSuperAdminRoleUpdate(normalizedPhone, user.role);

      user = await db.user.update({
        where: { id: user.id },
        data: {
          phoneVerified: true,
          isVerified: true,
          ...(roleUpdate ? { role: roleUpdate } : {}),
        },
      });

      const token = await issueAuthToken(user.id);

      const { acceptBusinessInvitesForUser } = await import('@/lib/business/team/accept-invite');
      await acceptBusinessInvitesForUser(user.id, normalizedPhone);

      return NextResponse.json({
        message: 'ورود با موفقیت انجام شد',
        user: mapDbUserToResponse(user),
        token,
        isNewUser: false,
      });
    } catch (dbError) {
      if (isPrismaUnavailableError(dbError) && devAuthFallbackEnabled()) {
        const exists = devUserExists(normalizedPhone);
        if (intent === 'login' && !exists) {
          return NextResponse.json(
            { error: 'کاربری با این شماره موبایل یافت نشد' },
            { status: 404 }
          );
        }
        if (!exists) {
          return NextResponse.json({
            message: 'کد تایید تأیید شد',
            needsPassword: true,
            phone: normalizedPhone,
          });
        }
        const { user, token } = devIssueAuth(normalizedPhone, false);
        return NextResponse.json({
          message: 'ورود با موفقیت انجام شد (حالت تست بدون دیتابیس)',
          user,
          token,
          isNewUser: false,
        });
      }
      if (isPrismaUnavailableError(dbError)) {
        return NextResponse.json({ error: DATABASE_UNAVAILABLE_FA }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('OTP verify error:', error);
    if (isPrismaUnavailableError(error)) {
      return NextResponse.json({ error: DATABASE_UNAVAILABLE_FA }, { status: 503 });
    }
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
