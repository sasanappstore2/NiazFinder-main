import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { canAccessUserContact } from '@/lib/contact/can-access-contact';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { id: targetUserId } = await params;
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'نمی‌توانید با خودتان تماس بگیرید' },
        { status: 400 }
      );
    }

    const requestId = new URL(request.url).searchParams.get('requestId') ?? undefined;
    const allowed = await canAccessUserContact(user.id, targetUserId, { requestId });
    if (!allowed) {
      return NextResponse.json(
        { error: 'دسترسی به اطلاعات تماس مجاز نیست' },
        { status: 403 }
      );
    }

    const target = await db.user.findFirst({
      where: { id: targetUserId, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        phone: true,
        businessProfile: {
          select: { phone: true, chatEnabled: true },
        },
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const phone = target.businessProfile?.phone ?? target.phone ?? null;
    const chatEnabled = target.businessProfile?.chatEnabled ?? true;
    const displayName =
      target.displayName?.trim() ||
      `${target.firstName} ${target.lastName}`.trim();

    return NextResponse.json({
      userId: target.id,
      phone,
      hasPhone: Boolean(phone?.trim()),
      chatEnabled,
      displayName,
    });
  } catch (error) {
    console.error('user contact GET error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
