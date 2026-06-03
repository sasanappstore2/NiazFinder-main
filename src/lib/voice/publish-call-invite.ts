import 'server-only';

import { fanoutCommEventHttp, publishCommEvent } from '@/lib/communication/redis-publish';

export type CallSignalFrom = {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
  avatar?: string | null;
};

export type CallRingingFanoutPayload = {
  callId: string;
  calleeId: string;
  callerId: string;
  from: CallSignalFrom;
};

export type CallInviteFanoutPayload = CallRingingFanoutPayload & {
  sdpOffer: RTCSessionDescriptionInit;
};

async function fanoutCall(type: 'call:ringing' | 'call:invite', payload: Record<string, unknown>) {
  const envelope = { type, payload };
  await publishCommEvent(envelope);
  // Always mirror to chat-service HTTP — Redis-only delivery is easy to miss in local dev.
  await fanoutCommEventHttp(envelope);
}

export async function publishCallRinging(payload: CallRingingFanoutPayload): Promise<void> {
  await fanoutCall('call:ringing', payload as unknown as Record<string, unknown>);
}

export async function publishCallInvite(payload: CallInviteFanoutPayload): Promise<void> {
  await fanoutCall('call:invite', payload as unknown as Record<string, unknown>);
}
