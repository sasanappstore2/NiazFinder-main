import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ============ POST handler ============

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (token) {
      await db.authToken.deleteMany({
        where: { token, userId: user.id },
      });
    }

    // Update user online status
    await db.user.update({
      where: { id: user.id },
      data: { online: false, lastSeenAt: new Date() },
    });

    return NextResponse.json({ message: 'با موفقیت خارج شدید' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
