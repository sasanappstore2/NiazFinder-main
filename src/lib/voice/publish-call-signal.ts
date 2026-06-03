import 'server-only';

import { fanoutCommEventHttp, publishCommEvent } from '@/lib/communication/redis-publish';

async function fanoutCallEvent(type: string, payload: Record<string, unknown>) {
  const envelope = { type, payload } as { type: string; payload: Record<string, unknown> };
  await publishCommEvent(envelope as Parameters<typeof publishCommEvent>[0]);
  await fanoutCommEventHttp(envelope as Parameters<typeof fanoutCommEventHttp>[0]);
}

export async function publishCallAccepted(payload: {
  callId: string;
  targetUserId: string;
  sdpAnswer?: RTCSessionDescriptionInit;
}): Promise<void> {
  await fanoutCallEvent('call:accepted', {
    callId: payload.callId,
    targetUserId: payload.targetUserId,
    sdpAnswer: payload.sdpAnswer,
  });
}

export async function publishCallReject(payload: {
  callId: string;
  callerId: string;
  calleeId: string;
}): Promise<void> {
  await fanoutCallEvent('call:reject', {
    callId: payload.callId,
    targetUserId: payload.callerId,
  });
}

export async function publishCallHangup(payload: {
  callId: string;
  targetUserId: string;
}): Promise<void> {
  await fanoutCallEvent('call:hangup', {
    callId: payload.callId,
    targetUserId: payload.targetUserId,
  });
}

/** Alias for semantic clarity when call ends (cancel or hangup). */
export const publishCallEnded = publishCallHangup;
