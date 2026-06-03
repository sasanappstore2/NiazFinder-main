import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { normalizePhone } from '@/lib/super-admin';
import { issueAuthToken, mapDbUserToResponse } from '@/lib/auth/phone-auth-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedPhone = normalizePhone(String(body.phone ?? ''));
    const password = String(body.password ?? '');

    if (!normalizedPhone || !password) {
      return NextResponse.json(
        { error: 'شماره موبایل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'کاربری با این شماره موبایل یافت نشد' },
        { status: 404 }
      );
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

    if (!user.password) {
      return NextResponse.json(
        { error: 'رمز عبور برای این حساب تنظیم نشده است. لطفاً از «ورود با پیامک» استفاده کنید.' },
        { status: 400 }
      );
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    const token = await issueAuthToken(user.id);

    return NextResponse.json({
      message: 'ورود با موفقیت انجام شد',
      user: mapDbUserToResponse(user),
      token,
      isNewUser: false,
    });
  } catch (error) {
    console.error('Phone login error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
