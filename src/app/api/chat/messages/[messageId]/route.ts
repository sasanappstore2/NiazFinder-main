import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishCommEvent } from '@/lib/communication/redis-publish';
import {
  canDeleteForEveryone,
  isHiddenForUser,
  MESSAGE_DELETED_TOMBSTONE,
  parseDeletedFor,
  serializeDeletedFor,
} from '@/lib/chat/message-delete';
import { pinOrUnpinMessage } from '@/lib/chat/message-pin';

type PinBody = { pin?: boolean; unpin?: boolean };

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  const body = (await request.json().catch(() => ({}))) as PinBody;
  if (body.pin !== true) {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  }

  const unpin = body.unpin === true;

  try {
    const result = await pinOrUnpinMessage(messageId, user.id, unpin);
    return NextResponse.json(result);
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    if (code === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (code === 'DELETED') {
      return NextResponse.json({ error: 'پیام حذف‌شده قابل سنجاق نیست' }, { status: 400 });
    }
    console.error('[message pin] Error:', err);
    return NextResponse.json({ error: 'خطای سرور رخ داده است' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  const { content } = (await request.json()) as { content?: string };
  if (!content?.trim()) {
    return NextResponse.json({ error: 'content required' }, { status: 400 });
  }

  const message = await db.message.findUnique({ where: { id: messageId } });
  if (!message || message.senderId !== user.id || message.deletedAt) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await db.message.update({
    where: { id: messageId },
    data: { content: content.trim(), editedAt: new Date() },
  });

  void publishCommEvent({
    type: 'message:edit',
    payload: {
      messageId,
      conversationId: updated.conversationId,
      content: updated.content,
      editedAt: updated.editedAt?.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, message: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messageId } = await params;
  const body = (await request.json().catch(() => ({}))) as { forEveryone?: boolean };
  const forEveryone = body.forEveryone === true;

  const message = await db.message.findUnique({
    where: { id: messageId },
    include: { conversation: true },
  });
  if (!message) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const conv = message.conversation;
  if (conv.userId1 !== user.id && conv.userId2 !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (forEveryone) {
    if (message.senderId !== user.id) {
      return NextResponse.json({ error: 'فقط فرستنده می‌تواند برای همه حذف کند' }, { status: 403 });
    }
    if (!canDeleteForEveryone(message.senderId, user.id, message.createdAt)) {
      return NextResponse.json(
        { error: 'بیش از ۴۸ ساعت از ارسال گذشته؛ فقط حذف برای خودتان ممکن است' },
        { status: 400 }
      );
    }
    const updated = await db.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: MESSAGE_DELETED_TOMBSTONE },
    });

    void publishCommEvent({
      type: 'message:delete',
      payload: {
        messageId,
        conversationId: updated.conversationId,
        forEveryone: true,
      },
    });

    return NextResponse.json({ ok: true, forEveryone: true });
  }

  if (isHiddenForUser(message.deletedFor, user.id)) {
    return NextResponse.json({ ok: true, forEveryone: false });
  }

  const ids = parseDeletedFor(message.deletedFor);
  ids.push(user.id);
  await db.message.update({
    where: { id: messageId },
    data: { deletedFor: serializeDeletedFor(ids) },
  });

  void publishCommEvent({
    type: 'message:delete',
    payload: {
      messageId,
      conversationId: message.conversationId,
      forEveryone: false,
      userId: user.id,
    },
  });

  return NextResponse.json({ ok: true, forEveryone: false });
}
