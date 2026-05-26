'use client';

import { getClientIceServers } from './ice-servers-client';
import { useAppStore } from '@/lib/store';
import type { VoiceCallPeer } from '@/lib/voice/voice-call-peer';

type CallStatus = 'idle' | 'ringing' | 'active' | 'ended';

interface CallControllerStore {
  getVoiceCallId: () => string | null;
  setState: (partial: Record<string, unknown>) => void;
  getAuthToken: () => string | null;
  getCurrentUserId: () => string | null;
  incrementCallDuration: () => void;
}

let storeApi: CallControllerStore | null = null;
let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let durationTimer: ReturnType<typeof setInterval> | null = null;
let socketEmit: ((event: string, payload: unknown) => void) | null = null;

export function registerCallController(api: CallControllerStore) {
  storeApi = api;
}

export function registerCallSocketEmit(emit: (event: string, payload: unknown) => void) {
  socketEmit = emit;
}

function emitSocket(event: string, payload: unknown) {
  socketEmit?.(event, payload);
}

function patch() {
  return storeApi;
}

function stopLocalMedia() {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pc?.close();
  pc = null;
}

function startDurationTimer() {
  if (durationTimer) clearInterval(durationTimer);
  patch()?.setState({ callDuration: 0 });
  durationTimer = setInterval(() => {
    patch()?.incrementCallDuration?.();
  }, 1000);
}

function stopDurationTimer() {
  if (durationTimer) clearInterval(durationTimer);
  durationTimer = null;
}

async function apiPatchCall(callId: string, action: 'accept' | 'reject' | 'end') {
  const token = patch()?.getAuthToken();
  if (!token) return;
  await fetch(`/api/calls/${callId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action }),
  });
}

async function createPeer(iceServers?: RTCIceServer[]) {
  pc = new RTCPeerConnection({
    iceServers: iceServers ?? getClientIceServers(),
  });

  pc.onicecandidate = (e) => {
    const callId = patch()?.getVoiceCallId();
    if (e.candidate && callId) {
      emitSocket('call:ice-candidate', {
        callId,
        candidate: e.candidate.toJSON(),
      });
    }
  };

  pc.ontrack = (e) => {
    const audio = document.getElementById('voice-call-remote-audio') as HTMLAudioElement | null;
    if (audio) {
      audio.srcObject = e.streams[0];
      void audio.play().catch(() => {});
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc?.connectionState === 'failed' || pc?.connectionState === 'disconnected') {
      void hangupVoiceCall();
    }
  };

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream!));
  } catch {
    const { toast } = await import('sonner');
    toast.error('دسترسی به میکروفون رد شد');
    throw new Error('mic_denied');
  }
}

export async function startOutgoingCall(
  target: VoiceCallPeer,
  conversationId?: string
): Promise<void> {
  const s = patch();
  if (!s) return;

  const token = s.getAuthToken();
  if (!token) return;

  try {
    const res = await fetch('/api/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ calleeId: target.id, conversationId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const { toast } = await import('sonner');
      toast.error((err as { error?: string }).error ?? 'خطا در برقراری تماس');
      return;
    }

    const data = (await res.json()) as {
      callId: string;
      iceServers: RTCIceServer[];
    };

    s.setState({
      voiceCallOpen: true,
      voiceCallTarget: target,
      voiceCallType: 'outgoing',
      voiceCallStatus: 'ringing',
      voiceCallId: data.callId,
      callDuration: 0,
      voiceCallMuted: false,
    });

    await createPeer(data.iceServers);
    const offer = await pc!.createOffer();
    await pc!.setLocalDescription(offer);

    emitSocket('call:invite', {
      callId: data.callId,
      calleeId: target.id,
      sdpOffer: offer,
    });
  } catch (e) {
    if ((e as Error).message !== 'mic_denied') {
      console.error('startOutgoingCall', e);
    }
    stopLocalMedia();
    s.setState({
      voiceCallOpen: false,
      voiceCallTarget: null,
      voiceCallStatus: 'idle',
      voiceCallId: null,
    });
  }
}

export async function acceptIncomingCall(): Promise<void> {
  const s = patch();
  if (!s) return;
  const callId = s.getVoiceCallId();
  if (!callId) return;

  try {
    await createPeer();
    const pendingOffer = (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit })
      .__pendingCallOffer;
    if (pendingOffer) {
      await pc!.setRemoteDescription(pendingOffer);
    }
    const answer = await pc!.createAnswer();
    await pc!.setLocalDescription(answer);

    await apiPatchCall(callId, 'accept');

    emitSocket('call:accept', {
      callId,
      sdpAnswer: answer,
    });

    s.setState({ voiceCallStatus: 'active' });
    startDurationTimer();
  } catch (e) {
    console.error('acceptIncomingCall', e);
    await rejectIncomingCall();
  }
}

export async function rejectIncomingCall(): Promise<void> {
  const s = patch();
  const callId = s?.getVoiceCallId();
  if (callId) {
    await apiPatchCall(callId, 'reject');
    emitSocket('call:reject', { callId });
  }
  stopLocalMedia();
  stopDurationTimer();
  s?.setState({
    voiceCallOpen: false,
    voiceCallTarget: null,
    voiceCallStatus: 'idle',
    voiceCallId: null,
  });
  delete (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer;
}

export async function hangupVoiceCall(): Promise<void> {
  const s = patch();
  const callId = s?.getVoiceCallId();
  if (callId) {
    await apiPatchCall(callId, 'end');
    emitSocket('call:hangup', { callId });
  }
  stopLocalMedia();
  stopDurationTimer();
  s?.setState({
    voiceCallStatus: 'ended',
  });
  setTimeout(() => {
    patch()?.setState({
      voiceCallOpen: false,
      voiceCallTarget: null,
      voiceCallStatus: 'idle',
      voiceCallId: null,
      callDuration: 0,
    });
  }, 2000);
}

export function toggleMute(): void {
  const s = patch();
  if (!localStream) return;
  const next = !useAppStore.getState().voiceCallMuted;
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = !next;
  });
  s?.setState({ voiceCallMuted: next });
}

export function handleCallInvite(payload: {
  callId: string;
  from: VoiceCallPeer;
  sdpOffer: RTCSessionDescriptionInit;
}) {
  const s = patch();
  if (!s) return;
  const myId = s.getCurrentUserId();
  if (myId && payload.from.id === myId) return;

  (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer =
    payload.sdpOffer;

  s.setState({
    voiceCallOpen: true,
    voiceCallTarget: payload.from,
    voiceCallType: 'incoming',
    voiceCallStatus: 'ringing',
    voiceCallId: payload.callId,
    callDuration: 0,
    voiceCallMuted: false,
  });
}

export async function handleCallAccept(payload: {
  callId: string;
  sdpAnswer: RTCSessionDescriptionInit;
}) {
  const s = patch();
  if (!s || s.getVoiceCallId() !== payload.callId || !pc) return;

  await pc.setRemoteDescription(payload.sdpAnswer);
  s.setState({ voiceCallStatus: 'active' });
  startDurationTimer();
}

export async function handleCallIce(payload: {
  callId: string;
  candidate: RTCIceCandidateInit;
}) {
  const s = patch();
  if (!s || s.getVoiceCallId() !== payload.callId || !pc) return;
  try {
    await pc.addIceCandidate(payload.candidate);
  } catch {
    /* ignore late candidates */
  }
}

export function handleCallReject(payload: { callId: string }) {
  const s = patch();
  if (s?.getVoiceCallId() !== payload.callId) return;
  void import('sonner').then(({ toast }) => toast.info('تماس رد شد'));
  stopLocalMedia();
  stopDurationTimer();
  s.setState({
    voiceCallOpen: false,
    voiceCallTarget: null,
    voiceCallStatus: 'idle',
    voiceCallId: null,
  });
}

export function handleCallHangup(payload: { callId: string }) {
  if (patch()?.getVoiceCallId() !== payload.callId) return;
  void hangupVoiceCall();
}
