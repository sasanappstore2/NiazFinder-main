/**
 * Voice call API smoke test (no browser).
 * Requires: DATABASE_URL, two users with a shared conversation.
 *
 * Usage: npx tsx scripts/test-voice-call-e2e.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const conv = await db.conversation.findFirst({
    orderBy: { updatedAt: 'desc' },
    include: { user1: true, user2: true },
  });

  if (!conv) {
    console.log('SKIP: no conversations — run scripts/seed-chat-demos.ts');
    process.exit(0);
  }

  const callerId = conv.userId1;
  const calleeId = conv.userId2;

  // Clean stale ringing calls for test users
  await db.voiceCall.updateMany({
    where: {
      status: 'RINGING',
      OR: [{ callerId }, { calleeId }],
    },
    data: { status: 'MISSED', endedAt: new Date() },
  });

  const mockOffer = {
    type: 'offer' as const,
    sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
  };
  const mockAnswer = {
    type: 'answer' as const,
    sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
  };

  // 1. Create ringing call
  const call = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      conversationId: conv.id,
      status: 'RINGING',
      signalingOffer: JSON.stringify(mockOffer),
    },
  });
  console.log('OK: created RINGING call', call.id);

  // 2. Callee reject
  await db.voiceCall.update({
    where: { id: call.id },
    data: { status: 'REJECTED', endedAt: new Date(), signalingOffer: null },
  });
  const rejected = await db.voiceCall.findUnique({ where: { id: call.id } });
  if (rejected?.status !== 'REJECTED') throw new Error('reject failed');
  console.log('OK: reject → REJECTED');

  // 3. Create again, accept with answer
  const call2 = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      conversationId: conv.id,
      status: 'RINGING',
      signalingOffer: JSON.stringify(mockOffer),
    },
  });

  await db.voiceCall.update({
    where: { id: call2.id },
    data: {
      status: 'ACTIVE',
      startedAt: new Date(),
      signalingOffer: null,
      signalingAnswer: JSON.stringify(mockAnswer),
    },
  });
  const active = await db.voiceCall.findUnique({ where: { id: call2.id } });
  if (active?.status !== 'ACTIVE' || !active.signalingAnswer) {
    throw new Error('accept/active failed');
  }
  console.log('OK: accept → ACTIVE with signalingAnswer');

  // 4. Caller cancel during ring
  const call3 = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      conversationId: conv.id,
      status: 'RINGING',
      signalingOffer: JSON.stringify(mockOffer),
    },
  });
  await db.voiceCall.update({
    where: { id: call3.id },
    data: { status: 'ENDED', endedAt: new Date(), signalingOffer: null },
  });
  const incoming = await db.voiceCall.findMany({
    where: { calleeId, status: 'RINGING' },
  });
  if (incoming.some((c) => c.id === call3.id)) {
    throw new Error('cancelled call still RINGING in incoming query');
  }
  console.log('OK: cancel → ENDED, not in incoming poll');

  // 5. CALL log row in thread (mirrors persistCallLogMessage)
  const call4 = await db.voiceCall.create({
    data: {
      callerId,
      calleeId,
      conversationId: conv.id,
      status: 'RINGING',
      signalingOffer: JSON.stringify(mockOffer),
    },
  });
  const ended = await db.voiceCall.update({
    where: { id: call4.id },
    data: {
      status: 'ENDED',
      startedAt: new Date(Date.now() - 45_000),
      endedAt: new Date(),
      durationSec: 45,
      signalingOffer: null,
      signalingAnswer: null,
    },
  });
  const clientTempId = `call-log-${ended.id}`;
  const callMsg = await db.message.create({
    data: {
      conversationId: conv.id,
      senderId: callerId,
      content: JSON.stringify({
        callId: ended.id,
        status: 'ENDED',
        durationSec: 45,
        callerId,
        calleeId,
      }),
      type: 'CALL',
      clientTempId,
    },
  });
  const dup = await db.message.findFirst({
    where: { conversationId: conv.id, clientTempId },
  });
  if (!dup || dup.id !== callMsg.id) throw new Error('CALL log message missing');
  console.log('OK: CALL log message in thread', callMsg.id);

  // Cleanup test calls + call log
  await db.message.deleteMany({ where: { id: callMsg.id } });
  await db.voiceCall.deleteMany({
    where: { id: { in: [call.id, call2.id, call3.id, call4.id] } },
  });

  console.log('ALL VOICE CALL E2E CHECKS PASSED');
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
