import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, type PaginatedResponse } from '@/lib/auth';

// ============ TYPES ============

interface NotificationListItem {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string>;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

interface MarkReadBody {
  id?: string;
  markAll?: boolean;
}

// ============ GET handler ============

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.notification.count({
        where: { userId: user.id },
      }),
      db.notification.count({
        where: { userId: user.id, isRead: false },
      }),
    ]);

    const mappedNotifications: NotificationListItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: JSON.parse(n.data),
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    }));

    const response: PaginatedResponse<NotificationListItem> & {
      unreadCount: number;
    } = {
      data: mappedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

// ============ PUT handler ============

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'لطفاً ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }

    const body: MarkReadBody = await request.json();

    if (body.markAll) {
      // Mark all notifications as read
      const result = await db.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      return NextResponse.json({
        message: `${result.count} اعلان خوانده شد`,
        count: result.count,
      });
    }

    if (body.id) {
      // Mark a specific notification as read
      const notification = await db.notification.findUnique({
        where: { id: body.id },
      });

      if (!notification) {
        return NextResponse.json(
          { error: 'اعلان مورد نظر یافت نشد' },
          { status: 404 }
        );
      }

      // Verify ownership
      if (notification.userId !== user.id) {
        return NextResponse.json(
          { error: 'شما دسترسی به این اعلان ندارید' },
          { status: 403 }
        );
      }

      if (notification.isRead) {
        return NextResponse.json({
          message: 'این اعلان قبلاً خوانده شده است',
          notification: {
            id: notification.id,
            isRead: notification.isRead,
          },
        });
      }

      const updated = await db.notification.update({
        where: { id: body.id },
        data: { isRead: true, readAt: new Date() },
      });

      return NextResponse.json({
        message: 'اعلان خوانده شد',
        notification: {
          id: updated.id,
          isRead: updated.isRead,
        },
      });
    }

    return NextResponse.json(
      { error: 'شناسه اعلان یا markAll الزامی است' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Notifications PUT error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
