import { NextRequest, NextResponse } from 'next/server';
import { findExistingOtp, createOtp } from '@/lib/otp-store';

const iranianPhoneRegex = /^09[0-9]{9}$/;
const DEMO_OTP_CODE = '1234';

// Rate limiting: store attempts in memory (per phone)
const otpAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 60 * 1000; // 1 minute

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    // Validate phone number
    if (!phone || !iranianPhoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'شماره موبایل معتبر نیست (مثال: 09123456789)' },
        { status: 400 }
      );
    }

    // Rate limiting
    const now = Date.now();
    const attempt = otpAttempts.get(phone);
    if (attempt) {
      if (now - attempt.lastAttempt > ATTEMPT_WINDOW) {
        attempt.count = 1;
        attempt.lastAttempt = now;
      } else if (attempt.count >= MAX_ATTEMPTS) {
        return NextResponse.json(
          { error: 'تعداد درخواست کد تایید بیش از حد مجاز است. لطفاً ۱ دقیقه دیگر تلاش کنید.' },
          { status: 429 }
        );
      } else {
        attempt.count++;
        attempt.lastAttempt = now;
      }
    } else {
      otpAttempts.set(phone, { count: 1, lastAttempt: now });
    }

    // Check if there's a valid unexpired OTP for this phone
    const existingOtp = findExistingOtp(phone);

    if (existingOtp) {
      const timeSinceLastOtp = Date.now() - existingOtp.createdAt.getTime();
      if (timeSinceLastOtp < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - timeSinceLastOtp) / 1000);
        return NextResponse.json(
          { error: `لطفاً ${remainingSeconds} ثانیه دیگر تلاش کنید`, retryAfter: remainingSeconds },
          { status: 429 }
        );
      }
    }

    // Generate and store OTP code
    const otpCode = DEMO_OTP_CODE;
    createOtp(phone, otpCode, 'auth');

    return NextResponse.json(
      {
        message: 'کد تایید ارسال شد',
        ...(process.env.NODE_ENV !== 'production' ? { demoCode: otpCode } : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('OTP request error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
