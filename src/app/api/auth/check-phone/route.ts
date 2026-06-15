import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/super-admin';
import { clientIp } from '@/lib/security/rate-limit';
import { checkAuthRateLimit } from '@/lib/auth/auth-rate-limit';
import {
  devAuthFallbackEnabled,
  devUserExists,
  devUserHasPassword,
} from '@/lib/auth/dev-phone-auth';
import { DATABASE_UNAVAILABLE_FA, isPrismaUnavailableError } from '@/lib/db-health';

export async function POST(request: NextRequest) {
  try {
    const ipLimit = checkAuthRateLimit(`check-phone:ip:${clientIp(request)}`, 20, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'تعداد درخواست بیش از حد مجاز است' }, { status: 429 });
    }

    const body = await request.json();
    const normalizedPhone = normalizePhone(String(body.phone ?? ''));

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'شماره موبایل معتبر نیست (مثال: 09123456789)' },
        { status: 400 }
      );
    }

    const phoneLimit = checkAuthRateLimit(`check-phone:${normalizedPhone}`, 10, 60_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: 'تعداد درخواست بیش از حد مجاز است' }, { status: 429 });
    }

    try {
      const user = await db.user.findUnique({
        where: { phone: normalizedPhone },
        select: { password: true },
      });

      return NextResponse.json({
        exists: Boolean(user),
        hasPassword: Boolean(user?.password),
        continue: true,
      });
    } catch (dbError) {
      if (isPrismaUnavailableError(dbError) && devAuthFallbackEnabled()) {
        return NextResponse.json({
          exists: devUserExists(normalizedPhone),
          hasPassword: devUserHasPassword(normalizedPhone),
          continue: true,
        });
      }
      if (isPrismaUnavailableError(dbError)) {
        return NextResponse.json({ error: DATABASE_UNAVAILABLE_FA }, { status: 503 });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Check phone error:', error);
    if (isPrismaUnavailableError(error)) {
      return NextResponse.json({ error: DATABASE_UNAVAILABLE_FA }, { status: 503 });
    }
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
