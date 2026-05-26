import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { budgetToJson } from '@/lib/budget';

// ============ TYPES ============

interface BookmarkRequestItem {
  id: string;
  title: string;
  slug: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  status: string;
  city: string | null;
  createdAt: Date;
}

interface BookmarkSpecialistItem {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  isVerified: boolean;
  online: boolean;
  role: string;
}

interface ToggleBookmarkBody {
  type: 'request' | 'specialist';
  id: string;
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

    const bookmarks = await db.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    const requestBookmarks = bookmarks.filter((b) => b.type === 'request');
    const specialistBookmarks = bookmarks.filter((b) => b.type === 'specialist');

    // Fetch bookmarked requests
    let bookmarkedRequests: BookmarkRequestItem[] = [];
    if (requestBookmarks.length > 0) {
      const requestIds = requestBookmarks.map((b) => b.targetId);
      const requests = await db.serviceRequest.findMany({
        where: { id: { in: requestIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          budgetMin: true,
          budgetMax: true,
          budgetType: true,
          status: true,
          city: true,
          createdAt: true,
        },
      });
      bookmarkedRequests = requests.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        budgetMin: budgetToJson(r.budgetMin),
        budgetMax: budgetToJson(r.budgetMax),
        budgetType: r.budgetType,
        status: r.status,
        city: r.city,
        createdAt: r.createdAt,
      }));
    }

    // Fetch bookmarked specialists
    let bookmarkedSpecialists: BookmarkSpecialistItem[] = [];
    if (specialistBookmarks.length > 0) {
      const specialistIds = specialistBookmarks.map((b) => b.targetId);
      const specialists = await db.user.findMany({
        where: { id: { in: specialistIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          displayName: true,
          avatar: true,
          bio: true,
          city: true,
          isVerified: true,
          online: true,
          role: true,
        },
      });
      bookmarkedSpecialists = specialists.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        displayName: s.displayName,
        avatar: s.avatar,
        bio: s.bio,
        city: s.city,
        isVerified: s.isVerified,
        online: s.online,
        role: s.role,
      }));
    }

    return NextResponse.json({
      bookmarkedRequests,
      bookmarkedSpecialists,
    });
  } catch (error) {
    console.error('Bookmarks GET error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}

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

    const body: ToggleBookmarkBody = await request.json();
    const { type, id } = body;

    if (!type || !id) {
      return NextResponse.json(
        { error: 'نوع و شناسه مورد نظر الزامی است' },
        { status: 400 }
      );
    }

    if (type !== 'request' && type !== 'specialist') {
      return NextResponse.json(
        { error: 'نوع باید request یا specialist باشد' },
        { status: 400 }
      );
    }

    // Verify target exists
    if (type === 'request') {
      const request = await db.serviceRequest.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!request) {
        return NextResponse.json(
          { error: 'نیاز مورد نظر یافت نشد' },
          { status: 404 }
        );
      }
    } else {
      const specialist = await db.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!specialist) {
        return NextResponse.json(
          { error: 'متخصص مورد نظر یافت نشد' },
          { status: 404 }
        );
      }
    }

    // Check if already bookmarked
    const existing = await db.bookmark.findUnique({
      where: {
        userId_type_targetId: {
          userId: user.id,
          type,
          targetId: id,
        },
      },
    });

    if (existing) {
      // Remove bookmark
      await db.bookmark.delete({ where: { id: existing.id } });
      return NextResponse.json({
        message: 'از علاقه‌مندی‌ها حذف شد',
        isBookmarked: false,
        type,
        targetId: id,
      });
    }

    // Add bookmark
    await db.bookmark.create({
      data: {
        userId: user.id,
        type,
        targetId: id,
      },
    });

    return NextResponse.json(
      {
        message: 'به علاقه‌مندی‌ها اضافه شد',
        isBookmarked: true,
        type,
        targetId: id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bookmarks POST error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
