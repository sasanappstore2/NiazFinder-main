import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/super-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const normalizedPhone = normalizePhone(String(body.phone ?? ''));

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'شماره موبایل معتبر نیست (مثال: 09123456789)' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { phone: normalizedPhone },
      select: { password: true },
    });

    return NextResponse.json({
      exists: Boolean(user),
      hasPassword: Boolean(user?.password),
    });
  } catch (error) {
    console.error('Check phone error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
