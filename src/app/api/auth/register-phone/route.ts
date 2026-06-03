import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { simpleHash } from '@/lib/auth/password';
import { findValidOtp, findRecentlyVerifiedOtp, markOtpVerified } from '@/lib/otp-store';
import { isTestOtpCode } from '@/lib/auth/test-otp';
import { toAsciiDigits } from '@/lib/format/digits';
import { isSuperAdminPhone, normalizePhone } from '@/lib/super-admin';
import { issueAuthToken, mapDbUserToResponse } from '@/lib/auth/phone-auth-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedPhone = normalizePhone(String(body.phone ?? ''));
    const password = String(body.password ?? '');
    const code = toAsciiDigits(String(body.code ?? ''));

    if (!normalizedPhone || !password || !code) {
      return NextResponse.json(
        { error: 'شماره موبایل، رمز عبور و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'این شماره موبایل قبلاً ثبت شده است' },
        { status: 409 }
      );
    }

    const otpRecord = findValidOtp(normalizedPhone, code);
    const recentlyVerified = findRecentlyVerifiedOtp(normalizedPhone, code);
    const acceptedTestOtp = isTestOtpCode(code);

    if (!otpRecord && !recentlyVerified && !acceptedTestOtp) {
      return NextResponse.json(
        { error: 'کد تایید نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    if (otpRecord) {
      markOtpVerified(normalizedPhone, code);
    }

    const grantSuperAdmin = isSuperAdminPhone(normalizedPhone);

    const user = await db.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone: normalizedPhone,
          email: `${normalizedPhone}@needfinder.local`,
          password: simpleHash(password),
          role: grantSuperAdmin ? ('SUPER_ADMIN' as const) : ('CLIENT' as const),
          isVerified: true,
          phoneVerified: true,
        },
      });

      await tx.wallet.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    const token = await issueAuthToken(user.id);

    return NextResponse.json(
      {
        message: 'ثبت‌نام و ورود با موفقیت انجام شد',
        user: mapDbUserToResponse(user),
        token,
        isNewUser: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Phone register error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
