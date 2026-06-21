import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { fetchLivePresence } from '@/lib/chat/live-presence';
import { resolveUserOnline } from '@/lib/chat/resolve-online';
import { db } from '@/lib/db';

/** Live presence for chat peers (proxies chat-service + DB fallback). */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams
      .get('userIds')
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ?? [];

    if (ids.length === 0) {
      return NextResponse.json({ presence: {} });
    }

    const unique = [...new Set(ids)].slice(0, 50);
    const live = await fetchLivePresence(unique);

    const dbUsers = await db.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, online: true, lastSeenAt: true },
    });

    const presence: Record<string, boolean> = {};
    for (const id of unique) {
      const row = dbUsers.find((u) => u.id === id);
      presence[id] = resolveUserOnline(id, live, {
        online: row?.online,
        lastSeenAt: row?.lastSeenAt?.toISOString() ?? null,
      });
    }

    return NextResponse.json({ presence });
  } catch (error) {
    console.error('GET /api/chat/presence error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
