import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { buildIceServersFromEnv } from '@/lib/voice/turn-credentials';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = request.nextUrl.searchParams.get('conversationId');
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conv = await db.conversation.findUnique({ where: { id: conversationId } });
    if (!conv || (conv.userId1 !== user.id && conv.userId2 !== user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const janusWsUrl = process.env.NEXT_PUBLIC_JANUS_WS_URL || process.env.JANUS_WS_URL || null;
    const janusRoomId = conv.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 900000 + 100000;

    const iceServers = buildIceServersFromEnv(user.id);

    return NextResponse.json({
      conversationId,
      janus: janusWsUrl
        ? {
            wsUrl: janusWsUrl,
            roomId: janusRoomId,
            plugin: 'janus.plugin.audiobridge',
            iceTransportPolicy:
              process.env.NEXT_PUBLIC_VOICE_RELAY_ONLY === 'true' ? 'relay' : 'all',
          }
        : null,
      iceServers,
      turn: iceServers.find((s) => Array.isArray(s.urls) && String(s.urls[0]).includes('turns:'))
        ? { relayOnly: process.env.NEXT_PUBLIC_VOICE_RELAY_ONLY === 'true' }
        : null,
    });
  } catch (e) {
    console.error('voice/credentials error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
