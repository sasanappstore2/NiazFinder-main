import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { fetchLivePresence } from '@/lib/chat/live-presence';

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
    const query = searchParams.get('q')?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'عبارت جستجو باید حداقل ۲ کاراکتر باشد' },
        { status: 400 }
      );
    }

    // Clean query — remove @ prefix for username search
    const cleanQuery = query.startsWith('@') ? query.slice(1).trim() : query;

    if (!cleanQuery || cleanQuery.length < 2) {
      return NextResponse.json(
        { error: 'عبارت جستجو باید حداقل ۲ کاراکتر باشد' },
        { status: 400 }
      );
    }

    // Search by username (exact or prefix match) OR displayName (contains)
    const users = await db.user.findMany({
      where: {
        AND: [
          { isActive: true },
          { isBanned: false },
          { id: { not: user.id } }, // Exclude self
          {
            OR: [
              // Exact username match
              { username: { equals: cleanQuery.toLowerCase() } },
              // Username prefix match
              { username: { startsWith: cleanQuery.toLowerCase() } },
              // Username contains match
              { username: { contains: cleanQuery.toLowerCase() } },
              // displayName contains match (SQLite is case-insensitive for contains)
              { displayName: { contains: cleanQuery } },
              // firstName search
              { firstName: { contains: cleanQuery } },
              // lastName search
              { lastName: { contains: cleanQuery } },
            ],
          },
        ],
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatar: true,
        bio: true,
        city: true,
        online: true,
        lastSeenAt: true,
        isVerified: true,
        role: true,
      },
      take: 20,
      orderBy: [{ isVerified: 'desc' }, { createdAt: 'desc' }],
    });

    const livePresence = await fetchLivePresence(users.map((user) => user.id));

    const results = users.map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName || `${u.firstName} ${u.lastName}`.trim() || u.username || 'کاربر',
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      bio: u.bio,
      city: u.city,
      online: livePresence[u.id] ?? false,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      isVerified: u.isVerified,
      role: u.role,
    }));

    return NextResponse.json({ data: results, count: results.length });
  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json(
      { error: 'خطای سرور رخ داده است' },
      { status: 500 }
    );
  }
}
