import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findValidOtp, markOtpVerified } from '@/lib/otp-store';
import { isTestOtpCode } from '@/lib/auth/test-otp';
import { issueAuthToken, mapDbUserToResponse } from '@/lib/auth/phone-auth-response';
import { toAsciiDigits } from '@/lib/format/digits';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';
import { isSuperAdminPhone, normalizePhone } from '@/lib/super-admin';

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

    const ipLimit = checkRateLimit(`verify:ip:${clientIp(request)}`, 30, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'تعداد تلاش بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
        { status: 429 }
      );
    }
    const phoneLimit = checkRateLimit(`verify:phone:${normalizedPhone}`, 10, 60_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json(
        { error: 'تعداد تلاش بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
        { status: 429 }
      );
    }

    const grantSuperAdmin = isSuperAdminPhone(normalizedPhone);

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

    const token = await issueAuthToken(user.id);

    const { acceptBusinessInvitesForUser } = await import('@/lib/business/team/accept-invite');
    await acceptBusinessInvitesForUser(user.id, normalizedPhone);

    return NextResponse.json({
      message: 'ورود با موفقیت انجام شد',
      user: mapDbUserToResponse(user),
      token,
      isNewUser: false,
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
