import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/super-admin';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ipLimit = checkRateLimit(`check-phone:ip:${clientIp(request)}`, 20, 60_000);
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

    const phoneLimit = checkRateLimit(`check-phone:${normalizedPhone}`, 10, 60_000);
    if (!phoneLimit.allowed) {
      return NextResponse.json({ error: 'تعداد درخواست بیش از حد مجاز است' }, { status: 429 });
    }

    const user = await db.user.findUnique({
      where: { phone: normalizedPhone },
      select: { password: true },
    });

    // Uniform response shape — client decides next step without leaking existence timing
    return NextResponse.json({
      exists: Boolean(user),
      hasPassword: Boolean(user?.password),
      continue: true,
    });
  } catch (error) {
    console.error('Check phone error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
