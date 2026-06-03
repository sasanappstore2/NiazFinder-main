import type { Server } from 'socket.io';
import { db } from './prisma';
import type {
  MessageBroadcast,
  ReplyInfo,
  SendMessagePayload,
  SendMessageReplyToPayload,
} from './types';

export function replyInfoFromClientPayload(
  rt: SendMessageReplyToPayload,
  senderId = ''
): ReplyInfo {
  return {
    id: rt.id,
    senderId,
    content: rt.content.slice(0, 200),
    firstName: rt.senderFirstName,
    lastName: rt.senderLastName,
  };
}

type ParticipantMap = Map<string, string>;

export function buildInstantBroadcast(
  payload: SendMessagePayload,
  senderId: string,
  messageId: string,
  replyTo?: MessageBroadcast['replyTo']
): MessageBroadcast {
  return {
    id: messageId,
    conversationId: payload.conversationId,
    senderId,
    content: payload.content.trim(),
    type: payload.type || 'TEXT',
    attachmentUrls: payload.attachmentUrls ?? [],
    isRead: false,
    createdAt: new Date().toISOString(),
    clientTempId: payload.clientTempId,
    replyToId: replyTo?.id,
    replyTo,
  };
}

export function fanoutMessageNew(io: Server, broadcast: MessageBroadcast): void {
  io.to(`conv:${broadcast.conversationId}`).emit('message:new', broadcast);
}

export async function persistMessageSideEffects(
  io: Server,
  args: {
    conversationId: string;
    senderId: string;
    otherUserId: string;
    content: string;
    messageId: string;
    userId1: string;
    userId2: string;
  }
): Promise<void> {
  const { conversationId, senderId, otherUserId, content, messageId, userId1, userId2 } = args;

  await Promise.all([
    db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.slice(0, 200),
        lastMessageAt: new Date(),
      },
    }),
    db.notification.create({
      data: {
        userId: otherUserId,
        type: 'NEW_MESSAGE',
        title: 'پیام جدید',
        message: content.slice(0, 100),
        data: JSON.stringify({
          conversationId,
          messageId,
          senderId,
        }),
      },
    }),
  ]).catch(console.error);

  const unreadCount = await db.message
    .count({
      where: {
        conversationId,
        senderId: { not: otherUserId },
        isRead: false,
      },
    })
    .catch(() => 0);

  io.to(`user:${otherUserId}`).emit('conversation:unread-update', {
    conversationId,
    unreadCount,
    totalUnread: unreadCount,
  });

  for (const uid of [userId1, userId2]) {
    const other = uid === userId1 ? userId2 : userId1;
    const unread = await db.message
      .count({
        where: {
          conversationId,
          senderId: { not: uid },
          isRead: false,
        },
      })
      .catch(() => 0);

    io.to(`user:${uid}`).emit('conversation:updated', {
      id: conversationId,
      lastMessage: content.slice(0, 200),
      lastMessageAt: new Date().toISOString(),
      otherUser: { id: other },
      unreadCount: unread,
    });
  }
}

export async function resolveParticipants(
  conversationId: string,
  loadParticipants: (id: string) => Promise<ParticipantMap | null>,
  cache: Map<string, ParticipantMap>
): Promise<{ map: ParticipantMap; userId1: string; userId2: string } | null> {
  let map = cache.get(conversationId);
  if (!map) {
    map = (await loadParticipants(conversationId)) ?? undefined;
    if (!map) return null;
  }

  const ids = [...map.keys()];
  if (ids.length < 2) return null;

  return { map, userId1: ids[0], userId2: ids[1] };
}

export async function persistMessageSend(
  io: Server,
  senderId: string,
  payload: SendMessagePayload,
  replyToId: string | undefined,
  participants: ParticipantMap
): Promise<void> {
  const { conversationId, content, type, attachmentUrls, clientTempId } = payload;
  const tempId = clientTempId || `tmp-${senderId}-${Date.now()}`;
  const otherUserId = participants.get(senderId);
  if (!otherUserId) return;

  const ids = [...participants.keys()];
  const userId1 = ids[0];
  const userId2 = ids[1];

  try {
    let replyTo: ReplyInfo | undefined;
    if (replyToId) {
      const replied = await db.message.findFirst({
        where: { id: replyToId, conversationId },
        include: { sender: { select: { firstName: true, lastName: true } } },
      });
      if (replied) {
        replyTo = {
          id: replied.id,
          senderId: replied.senderId,
          content: replied.content.slice(0, 200),
          firstName: replied.sender.firstName,
          lastName: replied.sender.lastName,
        };
      }
    }

    const message = await db.message.create({
      data: {
        conversationId,
        senderId,
        content: content.trim(),
        type: type || 'TEXT',
        attachmentUrls: attachmentUrls ? JSON.stringify(attachmentUrls) : '[]',
        isRead: false,
        replyToId: replyTo?.id,
        clientTempId: tempId,
      },
    });

    if (message.id !== tempId) {
      fanoutMessageNew(io, {
        ...buildInstantBroadcast({ ...payload, clientTempId: tempId }, senderId, message.id, replyTo),
        clientTempId: tempId,
      });
    }

    void persistMessageSideEffects(io, {
      conversationId,
      senderId,
      otherUserId,
      content: content.trim(),
      messageId: message.id,
      userId1,
      userId2,
    });
  } catch (error) {
    console.error('[message:send] persist failed:', error);
  }
}
