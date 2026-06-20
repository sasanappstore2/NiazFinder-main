import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { budgetToJson } from '@/lib/budget';
import type { BookmarkProposalStatus } from '@/lib/bookmarks/types';
import { buildEngagement } from '@/lib/bookmarks/types';
import { syncBusinessSaveCount } from '@/lib/business/stars';

interface ToggleBookmarkBody {
  type: 'request' | 'specialist';
  id: string;
}

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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

    let bookmarkedRequests: Array<Record<string, unknown>> = [];
    if (requestBookmarks.length > 0) {
      const requestIds = requestBookmarks.map((b) => b.targetId);
      const requests = await db.serviceRequest.findMany({
        where: { id: { in: requestIds } },
        include: {
          category: { select: { id: true, name: true, icon: true } },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
              city: true,
              createdAt: true,
            },
          },
        },
      });
      const byId = new Map(requests.map((r) => [r.id, r]));

      const [proposals, conversations] = await Promise.all([
        db.proposal.findMany({
          where: {
            userId: user.id,
            requestId: { in: requestIds },
          },
          orderBy: { createdAt: 'desc' },
          select: { requestId: true, status: true },
        }),
        db.conversation.findMany({
          where: {
            requestId: { in: requestIds },
            OR: [{ userId1: user.id }, { userId2: user.id }],
          },
          select: { id: true, requestId: true, userId1: true, userId2: true },
        }),
      ]);

      const proposalByRequest = new Map<string, BookmarkProposalStatus>();
      for (const p of proposals) {
        if (!proposalByRequest.has(p.requestId)) {
          proposalByRequest.set(p.requestId, p.status as BookmarkProposalStatus);
        }
      }

      const conversationByRequest = new Map<string, string>();
      for (const c of conversations) {
        if (!c.requestId) continue;
        const r = byId.get(c.requestId);
        if (!r) continue;
        const involvesOwner =
          (c.userId1 === user.id && c.userId2 === r.userId) ||
          (c.userId2 === user.id && c.userId1 === r.userId);
        if (involvesOwner && !conversationByRequest.has(c.requestId)) {
          conversationByRequest.set(c.requestId, c.id);
        }
      }

      bookmarkedRequests = requestBookmarks
        .map((bookmark) => {
          const r = byId.get(bookmark.targetId);
          if (!r) return null;

          const myProposalStatus = proposalByRequest.get(r.id) ?? null;
          const conversationId = conversationByRequest.get(r.id) ?? null;
          const engagement = buildEngagement(r.status, myProposalStatus, conversationId);

          return {
            id: r.id,
            title: r.title,
            slug: r.slug,
            description: r.description,
            address: r.address,
            budgetMin: budgetToJson(r.budgetMin),
            budgetMax: budgetToJson(r.budgetMax),
            budgetType: r.budgetType,
            deliveryTime: r.deliveryTime,
            deliveryUnit: r.deliveryUnit,
            city: r.city,
            province: r.province,
            priority: r.priority,
            status: r.status,
            tags: parseTags(r.tags),
            viewCount: r.viewCount,
            proposalCount: r.proposalCount,
            categoryId: r.categoryId,
            categoryName: r.category.name,
            categoryIcon: r.category.icon,
            bookmarkedAt: bookmark.createdAt.toISOString(),
            user: r.user,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            engagement,
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;
    }

    let bookmarkedSpecialists: Array<Record<string, unknown>> = [];
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
      const byId = new Map(specialists.map((s) => [s.id, s]));

      bookmarkedSpecialists = specialistBookmarks
        .map((bookmark) => {
          const s = byId.get(bookmark.targetId);
          if (!s) return null;
          return {
            ...s,
            bookmarkedAt: bookmark.createdAt.toISOString(),
          };
        })
        .filter(Boolean) as Array<Record<string, unknown>>;
    }

    return NextResponse.json({
      bookmarkedRequests,
      bookmarkedSpecialists,
    });
  } catch (error) {
    console.error('Bookmarks GET error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: 'نوع علاقه‌مندی نامعتبر است' }, { status: 400 });
    }

    if (type === 'request') {
      const serviceRequest = await db.serviceRequest.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!serviceRequest) {
        return NextResponse.json({ error: 'نیاز مورد نظر یافت نشد' }, { status: 404 });
      }
    } else {
      const specialist = await db.user.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!specialist) {
        return NextResponse.json({ error: 'کسب‌وکار مورد نظر یافت نشد' }, { status: 404 });
      }
    }

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
      await db.bookmark.delete({ where: { id: existing.id } });
      const starCount =
        type === 'specialist' ? await syncBusinessSaveCount(id) : undefined;
      return NextResponse.json({
        message: type === 'specialist' ? 'ستاره برداشته شد' : 'از علاقه‌مندی‌ها حذف شد',
        isBookmarked: false,
        type,
        targetId: id,
        ...(starCount !== undefined ? { starCount } : {}),
      });
    }

    await db.bookmark.create({
      data: {
        userId: user.id,
        type,
        targetId: id,
      },
    });

    const starCount =
      type === 'specialist' ? await syncBusinessSaveCount(id) : undefined;

    return NextResponse.json(
      {
        message: type === 'specialist' ? 'ستاره داده شد' : 'به علاقه‌مندی‌ها اضافه شد',
        isBookmarked: true,
        type,
        targetId: id,
        ...(starCount !== undefined ? { starCount } : {}),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Bookmarks POST error:', error);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}
