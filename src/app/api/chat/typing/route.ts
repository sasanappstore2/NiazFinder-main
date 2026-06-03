import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { listActiveTypingForConversations } from '@/lib/communication/typing-state';

export type TypingInboxResponse = {
  active: Array<{
    conversationId: string;
    userId: string;
    displayName: string;
  }>;
};

/**
 * Batch typing status for sidebar — one request instead of N polls per conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversations = await db.conversation.findMany({
      where: {
        OR: [{ userId1: user.id }, { userId2: user.id }],
      },
      select: { id: true },
    });

    const ids = conversations.map((c) => c.id);
    const active = listActiveTypingForConversations(ids).filter(
      (e) => e.userId !== user.id
    );

    const response: TypingInboxResponse = { active };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[typing inbox] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
