import 'server-only';

import { db } from '@/lib/db';
import { createChatMessage } from '@/lib/chat/prisma-message';
import { publishMessageNew } from '@/lib/communication/redis-publish';
import {
  buildCallLogContent,
  callLogListPreview,
  type CallLogSnapshot,
} from '@/lib/voice/call-log-labels';

type VoiceCallRow = {
  id: string;
  conversationId: string | null;
  callerId: string;
  calleeId: string;
  status: string;
  durationSec: number | null;
  endedAt: Date | null;
  startedAt: Date;
};

function toSnapshot(call: VoiceCallRow): CallLogSnapshot | null {
  if (!['ENDED', 'REJECTED', 'MISSED'].includes(call.status)) return null;
  return {
    callId: call.id,
    status: call.status as CallLogSnapshot['status'],
    durationSec: call.durationSec,
    callerId: call.callerId,
    calleeId: call.calleeId,
  };
}

/** Insert a CALL row in the conversation thread + fanout (idempotent per callId). */
export async function persistCallLogMessage(call: VoiceCallRow): Promise<void> {
  if (!call.conversationId) return;

  const snapshot = toSnapshot(call);
  if (!snapshot) return;

  const clientTempId = `call-log-${call.id}`;
  const existing = await db.message.findFirst({
    where: { conversationId: call.conversationId, clientTempId },
    select: { id: true },
  });
  if (existing) return;

  const content = buildCallLogContent(snapshot);
  const listPreview = callLogListPreview(content);

  const result = await db.$transaction(async (tx) => {
    const message = await createChatMessage(tx, {
      conversationId: call.conversationId!,
      senderId: call.callerId,
      content,
      type: 'CALL',
      clientTempId,
    });

    await tx.conversation.update({
      where: { id: call.conversationId! },
      data: {
        lastMessage: listPreview,
        lastMessageAt: message.createdAt,
      },
    });

    return message;
  });

  void publishMessageNew({
    id: result.id,
    conversationId: call.conversationId,
    senderId: call.callerId,
    content,
    type: 'CALL',
    attachmentUrls: [],
    isRead: false,
    createdAt: result.createdAt.toISOString(),
    clientTempId,
  }).catch((e) => console.warn('[calls] publishCallLog message failed:', e));
}
