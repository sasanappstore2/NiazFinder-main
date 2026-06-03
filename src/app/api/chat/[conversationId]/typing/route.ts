import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { publishTypingEvent } from '@/lib/communication/typing-publish';
import {
  getConversationTypingState,
  setConversationTypingState,
} from '@/lib/communication/typing-state';

type TypingBody = { isTyping?: boolean };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (conversation.userId1 !== user.id && conversation.userId2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const state = await getConversationTypingState(conversationId);
    if (!state?.isTyping || state.userId === user.id) {
      return NextResponse.json({ isTyping: false });
    }

    return NextResponse.json({
      isTyping: true,
      userId: state.userId,
      displayName: `${state.firstName} ${state.lastName}`.trim(),
    });
  } catch (error) {
    console.error('[typing] GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { userId1: true, userId2: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (conversation.userId1 !== user.id && conversation.userId2 !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as TypingBody;
    const isTyping = body.isTyping === true;

    const targetUserId =
      conversation.userId1 === user.id ? conversation.userId2 : conversation.userId1;

    const now = Date.now();
    if (isTyping) {
      await setConversationTypingState(conversationId, {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isTyping: true,
        updatedAt: now,
      });
    } else {
      await setConversationTypingState(conversationId, null);
    }

    void publishTypingEvent({
      conversationId,
      userId: user.id,
      targetUserId,
      isTyping,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[typing] POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
