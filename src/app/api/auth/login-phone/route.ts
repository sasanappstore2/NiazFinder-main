import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, passwordNeedsRehash } from '@/lib/auth/password';
import { normalizePhone, resolveSuperAdminRoleUpdate } from '@/lib/super-admin';
import { issueAuthToken, mapDbUserToResponse } from '@/lib/auth/phone-auth-response';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedPhone = normalizePhone(String(body.phone ?? ''));
    const password = String(body.password ?? '');

    const ipLimit = checkRateLimit(`login:ip:${clientIp(request)}`, 20, 60_000);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: 'تعداد تلاش بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.' },
        { status: 429 }
      );
    }

    if (!normalizedPhone || !password) {
      return NextResponse.json(
        { error: 'شماره موبایل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    let user = await db.user.findUnique({
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

    if (passwordNeedsRehash(user.password)) {
      await db.user.update({
        where: { id: user.id },
        data: { password: hashPassword(password) },
      });
    }

    const roleUpdate = resolveSuperAdminRoleUpdate(normalizedPhone, user.role);
    if (roleUpdate) {
      user = await db.user.update({
        where: { id: user.id },
        data: { role: roleUpdate },
      });
    }

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
    console.error('Phone login error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
