'use client';

import { getClientIceServers } from './ice-servers-client';
import { useAppStore } from '@/lib/store';
import { getClientAuthToken } from '@/lib/auth/client-auth';
import type { VoiceCallPeer } from '@/lib/voice/voice-call-peer';
import {
  startOutgoingRingtone,
  startIncomingRingtone,
  stopCallTones,
  playBusyTone,
  playUnavailableTone,
} from '@/lib/voice/call-audio';

const OUTGOING_RING_TIMEOUT_MS = 45_000;
const IGNORED_CALL_TTL_MS = 60_000;

type CallStatus = 'idle' | 'ringing' | 'active' | 'ended';
type PatchAction = 'accept' | 'reject' | 'cancel' | 'end';

let outgoingRingTimeoutId: ReturnType<typeof setTimeout> | null = null;
const ignoredCallExpiry = new Map<string, number>();

function clearOutgoingRingTimeout(): void {
  if (outgoingRingTimeoutId) {
    clearTimeout(outgoingRingTimeoutId);
    outgoingRingTimeoutId = null;
  }
}

function scheduleOutgoingRingTimeout(callId: string): void {
  clearOutgoingRingTimeout();
  outgoingRingTimeoutId = setTimeout(() => {
    const state = useAppStore.getState();
    if (
      state.voiceCallId !== callId ||
      state.voiceCallType !== 'outgoing' ||
      state.voiceCallStatus !== 'ringing'
    ) {
      return;
    }
    void endOutgoingWithUnavailable('پاسخی دریافت نشد');
  }, OUTGOING_RING_TIMEOUT_MS);
}

async function endOutgoingWithUnavailable(message: string): Promise<void> {
  stopCallTones();
  clearOutgoingRingTimeout();
  await playUnavailableTone();
  const { toast } = await import('sonner');
  toast.info(message);
  await hangupVoiceCall();
}

function syncRingtoneWithState(
  status: CallStatus,
  callType: 'incoming' | 'outgoing'
): void {
  if (status === 'ringing') {
    if (callType === 'outgoing') startOutgoingRingtone();
    else startIncomingRingtone();
  } else {
    stopCallTones();
    clearOutgoingRingTimeout();
  }
}

export type ExistingCallConflict = {
  callId: string;
  status: 'RINGING' | 'ACTIVE' | string;
  callType: 'incoming' | 'outgoing';
  peer: VoiceCallPeer;
};

function mapServerStatus(status: string): CallStatus {
  if (status === 'ACTIVE') return 'active';
  if (status === 'RINGING') return 'ringing';
  return 'ringing';
}

export function restoreExistingCallUI(existing: ExistingCallConflict): void {
  patch().setState({
    voiceCallOpen: true,
    voiceCallTarget: existing.peer,
    voiceCallType: existing.callType,
    voiceCallStatus: mapServerStatus(existing.status),
    voiceCallId: existing.callId,
    voiceCallMuted: useAppStore.getState().voiceCallMuted,
  });
  const mapped = mapServerStatus(existing.status);
  syncRingtoneWithState(mapped, existing.callType);
  if (mapped === 'ringing' && existing.callType === 'outgoing') {
    scheduleOutgoingRingTimeout(existing.callId);
  }
}

function hasLocalActiveCall(): boolean {
  const { voiceCallOpen, voiceCallId, voiceCallStatus } = useAppStore.getState();
  return Boolean(
    voiceCallOpen &&
      voiceCallId &&
      (voiceCallStatus === 'ringing' || voiceCallStatus === 'active')
  );
}

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
let connectingOutgoing = false;
let pendingRemoteCandidates: RTCIceCandidateInit[] = [];
let remoteDescriptionReady = false;

function resetIceSignalingState(): void {
  pendingRemoteCandidates = [];
  remoteDescriptionReady = false;
}

async function flushPendingIceCandidates(): Promise<void> {
  if (!pc || !remoteDescriptionReady) return;
  const queue = pendingRemoteCandidates.splice(0);
  for (const candidate of queue) {
    try {
      await pc.addIceCandidate(candidate);
    } catch (e) {
      console.warn('[voice] addIceCandidate (flush) failed', e);
    }
  }
}

async function markRemoteDescriptionReady(): Promise<void> {
  remoteDescriptionReady = true;
  await flushPendingIceCandidates();
}

async function addRemoteIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
  if (!pc || !remoteDescriptionReady) {
    pendingRemoteCandidates.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch (e) {
    console.warn('[voice] addIceCandidate failed', e);
  }
}

function attachRemoteAudio(stream: MediaStream): void {
  const audio = document.getElementById('voice-call-remote-audio') as HTMLAudioElement | null;
  if (!audio) return;
  audio.srcObject = stream;
  audio.autoplay = true;
  void audio.play().catch((err) => {
    console.warn('[voice] remote audio play blocked', err);
  });
}

async function fetchCallIceServers(callId: string): Promise<RTCIceServer[] | undefined> {
  const token = resolveAuthToken();
  if (!token) return undefined;
  try {
    const res = await fetch(`/api/calls/${callId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { iceServers?: RTCIceServer[] };
    return data.iceServers;
  } catch {
    return undefined;
  }
}

export function registerCallController(api: CallControllerStore) {
  storeApi = api;
}

export function markCallIgnored(callId: string): void {
  ignoredCallExpiry.set(callId, Date.now() + IGNORED_CALL_TTL_MS);
}

export function isCallIgnored(callId: string): boolean {
  const expiry = ignoredCallExpiry.get(callId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    ignoredCallExpiry.delete(callId);
    return false;
  }
  return true;
}

function clearCallIgnored(callId: string): void {
  ignoredCallExpiry.delete(callId);
}

function ensureStoreApi(): CallControllerStore {
  if (!storeApi) {
    registerCallController({
      getVoiceCallId: () => useAppStore.getState().voiceCallId,
      setState: (partial) => useAppStore.setState(partial),
      getAuthToken: () => useAppStore.getState().authToken ?? getClientAuthToken(),
      getCurrentUserId: () => useAppStore.getState().currentUser?.id ?? null,
      incrementCallDuration: () =>
        useAppStore.setState((s) => ({ voiceCallDuration: s.voiceCallDuration + 1 })),
    });
  }
  return storeApi!;
}

function patch() {
  return ensureStoreApi();
}

export function registerCallSocketEmit(emit: (event: string, payload: unknown) => void) {
  socketEmit = emit;
}

function emitSocket(event: string, payload: unknown) {
  socketEmit?.(event, payload);
}

function resolveAuthToken(): string | null {
  return patch().getAuthToken() ?? getClientAuthToken();
}

async function relayCallInvite(
  callId: string,
  sdpOffer: RTCSessionDescriptionInit
): Promise<boolean> {
  const token = resolveAuthToken();
  if (!token) {
    console.warn('[voice] relayCallInvite: no auth token');
    return false;
  }

  try {
    const res = await fetch(`/api/calls/${callId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sdpOffer }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[voice] relayCallInvite HTTP failed', res.status, detail);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[voice] relayCallInvite error', e);
    return false;
  }
}

async function fetchCallOffer(callId: string): Promise<RTCSessionDescriptionInit | null> {
  const token = resolveAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`/api/calls/${callId}/offer`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sdpOffer?: RTCSessionDescriptionInit | null };
    return data.sdpOffer ?? null;
  } catch {
    return null;
  }
}

async function fetchCallAnswer(callId: string): Promise<RTCSessionDescriptionInit | null> {
  const token = resolveAuthToken();
  if (!token) return null;
  try {
    const res = await fetch(`/api/calls/${callId}/answer`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sdpAnswer?: RTCSessionDescriptionInit | null };
    return data.sdpAnswer ?? null;
  } catch {
    return null;
  }
}

async function fetchPendingOffer(callId: string): Promise<RTCSessionDescriptionInit | null> {
  const cached = (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit })
    .__pendingCallOffer;
  if (cached?.sdp) return cached;
  const offer = await fetchCallOffer(callId);
  if (offer) {
    (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer =
      offer;
  }
  return offer;
}

async function waitForOffer(
  callId: string,
  maxMs = 8_000
): Promise<RTCSessionDescriptionInit | null> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const offer = await fetchPendingOffer(callId);
    if (offer?.sdp) return offer;
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

async function getUserMediaWithTimeout(ms = 15_000): Promise<MediaStream> {
  return Promise.race([
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }),
    new Promise<MediaStream>((_, reject) =>
      setTimeout(() => reject(new Error('mic_timeout')), ms)
    ),
  ]);
}

export function dismissCallUI(): void {
  stopCallTones();
  clearOutgoingRingTimeout();
  stopLocalMedia();
  stopDurationTimer();
  connectingOutgoing = false;
  const activeConversationId = useAppStore.getState().activeConversationId;
  patch().setState({
    voiceCallOpen: false,
    voiceCallTarget: null,
    voiceCallStatus: 'idle',
    voiceCallId: null,
    voiceCallDuration: 0,
    voiceCallMuted: false,
  });
  delete (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer;

  if (activeConversationId) {
    const { fetchConversationMessages, fetchConversations } = useAppStore.getState();
    void fetchConversationMessages(activeConversationId);
    void fetchConversations();
  }
}

function stopLocalMedia() {
  localStream?.getTracks().forEach((t) => t.stop());
  localStream = null;
  pc?.close();
  pc = null;
  resetIceSignalingState();
}

function startDurationTimer() {
  if (durationTimer) clearInterval(durationTimer);
  patch().setState({ voiceCallDuration: 0 });
  durationTimer = setInterval(() => {
    patch().incrementCallDuration();
  }, 1000);
}

function stopDurationTimer() {
  if (durationTimer) clearInterval(durationTimer);
  durationTimer = null;
}

async function apiPatchCall(
  callId: string,
  action: PatchAction,
  extra?: { sdpAnswer?: RTCSessionDescriptionInit }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const token = resolveAuthToken();
  if (!token) {
    console.warn('[voice] apiPatchCall: no auth token');
    return { ok: false, message: 'لطفاً دوباره وارد شوید' };
  }
  try {
    const res = await fetch(`/api/calls/${callId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const message = body.error ?? `خطا (${res.status})`;
      console.warn('[voice] apiPatchCall failed', action, res.status, message);
      return { ok: false, message };
    }
    return { ok: true };
  } catch (e) {
    console.warn('[voice] apiPatchCall error', action, e);
    return { ok: false, message: 'خطا در ارتباط با سرور' };
  }
}

async function connectOutgoingCaller(callId: string, sdpAnswer?: RTCSessionDescriptionInit): Promise<void> {
  if (connectingOutgoing) return;
  const state = useAppStore.getState();
  if (state.voiceCallId !== callId || state.voiceCallType !== 'outgoing') return;
  if (state.voiceCallStatus === 'active') return;

  connectingOutgoing = true;
  try {
    const answer = sdpAnswer?.sdp ? sdpAnswer : await fetchCallAnswer(callId);
    if (!answer?.sdp || !pc) return;

    await pc.setRemoteDescription(answer);
    await markRemoteDescriptionReady();
    stopCallTones();
    clearOutgoingRingTimeout();
    patch().setState({ voiceCallStatus: 'active' });
    startDurationTimer();
  } catch (e) {
    console.warn('[voice] connectOutgoingCaller failed', e);
  } finally {
    connectingOutgoing = false;
  }
}

/** همگام‌سازی UI با وضعیت سرور — برای poll و socket fallback */
export async function applyServerStatus(callId: string): Promise<void> {
  const token = resolveAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`/api/calls/${callId}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return;

    const data = (await res.json()) as { call?: { status?: string } };
    const status = data.call?.status;
    if (!status) return;

    const state = useAppStore.getState();
    if (state.voiceCallId !== callId) return;

    if (status === 'RINGING') return;

    if (status === 'ACTIVE') {
      if (state.voiceCallType === 'outgoing' && state.voiceCallStatus === 'ringing') {
        await connectOutgoingCaller(callId);
        return;
      }
      if (state.voiceCallType === 'incoming' && state.voiceCallStatus === 'ringing') {
        patch().setState({ voiceCallStatus: 'active' });
        stopCallTones();
        startDurationTimer();
      }
      return;
    }

    if (['REJECTED', 'ENDED', 'MISSED'].includes(status)) {
      markCallIgnored(callId);
      if (state.voiceCallType === 'outgoing' && status === 'REJECTED') {
        stopCallTones();
        clearOutgoingRingTimeout();
        await playBusyTone();
        const { toast } = await import('sonner');
        toast.info('تماس رد شد');
      }
      dismissCallUI();
    }
  } catch {
    /* ignore */
  }
}

/** @deprecated use applyServerStatus */
export const syncCallFromServer = applyServerStatus;

async function createPeer(iceServers?: RTCIceServer[]) {
  remoteDescriptionReady = false;
  pc = new RTCPeerConnection({
    iceServers: iceServers ?? getClientIceServers(),
    iceCandidatePoolSize: 4,
  });

  pc.onicecandidate = (e) => {
    const callId = patch().getVoiceCallId();
    if (!callId) return;
    if (!e.candidate) return;
    emitSocket('call:ice-candidate', {
      callId,
      candidate: e.candidate.toJSON(),
    });
  };

  pc.ontrack = (e) => {
    const stream = e.streams[0] ?? (e.track ? new MediaStream([e.track]) : null);
    if (stream) attachRemoteAudio(stream);
  };

  pc.oniceconnectionstatechange = () => {
    const state = pc?.iceConnectionState;
    if (state === 'failed' || state === 'disconnected') {
      console.warn('[voice] ICE connection', state);
      try {
        pc?.restartIce();
      } catch {
        /* ignore */
      }
    }
  };

  pc.onconnectionstatechange = () => {
    const state = pc?.connectionState;
    if (state === 'connected') {
      const audio = document.getElementById('voice-call-remote-audio') as HTMLAudioElement | null;
      if (audio?.srcObject) void audio.play().catch(() => {});
    }
    if (state === 'failed' || state === 'disconnected') {
      void hangupVoiceCall();
    }
  };

  try {
    localStream = await getUserMediaWithTimeout();
    localStream.getTracks().forEach((track) => pc!.addTrack(track, localStream!));
  } catch (e) {
    const { toast } = await import('sonner');
    if ((e as Error).message === 'mic_timeout') {
      toast.error('دسترسی به میکروفون زمان‌بر شد. دوباره تلاش کنید.');
      throw new Error('mic_timeout');
    }
    toast.error('دسترسی به میکروفون رد شد');
    throw new Error('mic_denied');
  }
}

export async function startOutgoingCall(
  target: VoiceCallPeer,
  conversationId?: string
): Promise<void> {
  const s = patch();
  const token = resolveAuthToken();
  if (!token) return;

  const local = useAppStore.getState();
  if (hasLocalActiveCall()) {
    const { toast } = await import('sonner');
    restoreExistingCallUI({
      callId: local.voiceCallId!,
      status: local.voiceCallStatus === 'active' ? 'ACTIVE' : 'RINGING',
      callType: local.voiceCallType,
      peer: local.voiceCallTarget!,
    });
    if (local.voiceCallTarget?.id !== target.id) {
      toast.info('تماس قبلی هنوز باز است — برای تماس جدید ابتدا قطع کنید');
    }
    return;
  }

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
      const err = (await res.json().catch(() => ({}))) as {
        error?: string;
        existingCall?: ExistingCallConflict;
        unavailableReason?: 'offline' | 'busy';
      };
      const { toast } = await import('sonner');
      if (res.status === 422 && err.unavailableReason) {
        if (err.unavailableReason === 'busy') {
          await playBusyTone();
          toast.info('طرف مقابل مشغول است');
        } else {
          await playUnavailableTone();
          toast.info('کاربر آفلاین است یا در دسترس نیست');
        }
        return;
      }
      if (res.status === 409 && err.existingCall) {
        restoreExistingCallUI(err.existingCall);
        toast.info('تماس قبلی هنوز باز است — برای تماس جدید ابتدا قطع کنید');
        return;
      }
      toast.error(err.error ?? 'خطا در برقراری تماس');
      return;
    }

    const data = (await res.json()) as {
      callId: string;
      iceServers: RTCIceServer[];
      calleePresence?: 'online' | 'offline';
    };

    s.setState({
      voiceCallOpen: true,
      voiceCallTarget: target,
      voiceCallType: 'outgoing',
      voiceCallStatus: 'ringing',
      voiceCallId: data.callId,
      voiceCallDuration: 0,
      voiceCallMuted: false,
    });

    const { trackAnalyticsEvent } = await import('@/lib/analytics/track');
    trackAnalyticsEvent('call_started', { callId: data.callId, conversationId }, {
      userId: useAppStore.getState().currentUser?.id,
    });

    await createPeer(data.iceServers);
    const offer = await pc!.createOffer();
    await pc!.setLocalDescription(offer);

    const invited = await relayCallInvite(data.callId, offer);
    if (!invited) {
      const { toast } = await import('sonner');
      toast.error('خطا در ارسال دعوت تماس');
      await hangupVoiceCall();
      return;
    }

    startOutgoingRingtone();
    scheduleOutgoingRingTimeout(data.callId);

    if (data.calleePresence === 'offline') {
      const { toast } = await import('sonner');
      toast.message('در حال زنگ خوردن…', {
        description: 'اگر طرف مقابل اپ را باز نداشته باشد ممکن است پاسخ ندهد.',
      });
    }
  } catch (e) {
    stopCallTones();
    clearOutgoingRingTimeout();
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

export async function acceptIncomingCall(): Promise<boolean> {
  const callId = useAppStore.getState().voiceCallId;
  if (!callId) return false;

  clearOutgoingRingTimeout();
  stopCallTones();

  try {
    const offer = await waitForOffer(callId);
    if (!offer?.sdp) {
      const { toast } = await import('sonner');
      toast.error(
        'اطلاعات تماس هنوز آماده نیست. چند ثانیه صبر کنید یا تماس را رد کنید.'
      );
      startIncomingRingtone();
      return false;
    }

    await createPeer((await fetchCallIceServers(callId)) ?? undefined);
    await pc!.setRemoteDescription(offer);
    const answer = await pc!.createAnswer();
    await pc!.setLocalDescription(answer);
    await markRemoteDescriptionReady();

    const patchResult = await apiPatchCall(callId, 'accept', { sdpAnswer: answer });
    if (!patchResult.ok) {
      stopLocalMedia();
      pc = null;
      const { toast } = await import('sonner');
      toast.error(patchResult.message || 'خطا در پذیرش تماس');
      startIncomingRingtone();
      return false;
    }

    clearCallIgnored(callId);
    patch().setState({ voiceCallStatus: 'active' });
    startDurationTimer();
    return true;
  } catch (e) {
    console.error('acceptIncomingCall', e);
    stopLocalMedia();
    pc = null;
    if ((e as Error).message !== 'mic_denied') {
      await rejectIncomingCall();
    }
    return false;
  }
}

export async function rejectIncomingCall(): Promise<boolean> {
  const callId = useAppStore.getState().voiceCallId;
  stopCallTones();
  clearOutgoingRingTimeout();
  let success = true;
  if (callId) {
    markCallIgnored(callId);
    const patchResult = await apiPatchCall(callId, 'reject');
    if (!patchResult.ok) {
      success = false;
      const { toast } = await import('sonner');
      toast.error(patchResult.message || 'خطا در رد تماس');
    }
  }
  dismissCallUI();
  return success;
}

export async function hangupVoiceCall(): Promise<void> {
  const callId = useAppStore.getState().voiceCallId;
  const state = useAppStore.getState();
  stopCallTones();
  clearOutgoingRingTimeout();

  if (callId) {
    markCallIgnored(callId);
    if (state.voiceCallStatus === 'ringing') {
      if (state.voiceCallType === 'outgoing') {
        await apiPatchCall(callId, 'cancel');
      } else {
        await apiPatchCall(callId, 'reject');
      }
    } else if (state.voiceCallStatus === 'active') {
      await apiPatchCall(callId, 'end');
    }
  }

  stopLocalMedia();
  stopDurationTimer();

  if (state.voiceCallStatus === 'ringing') {
    dismissCallUI();
    return;
  }

  patch().setState({ voiceCallStatus: 'ended' });
  setTimeout(() => {
    dismissCallUI();
  }, 1500);
}

export function toggleMute(): void {
  if (!localStream) return;
  const next = !useAppStore.getState().voiceCallMuted;
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = !next;
  });
  patch().setState({ voiceCallMuted: next });
}

export function handleCallInvite(payload: {
  callId: string;
  from: VoiceCallPeer;
  sdpOffer?: RTCSessionDescriptionInit;
}) {
  if (isCallIgnored(payload.callId)) return;

  const s = patch();
  const myId = s.getCurrentUserId();
  if (myId && payload.from.id === myId) return;

  if (hasLocalActiveCall()) {
    const current = useAppStore.getState();
    if (current.voiceCallId !== payload.callId) return;
  }

  const current = useAppStore.getState();
  if (
    current.voiceCallOpen &&
    current.voiceCallId === payload.callId &&
    current.voiceCallType === 'incoming'
  ) {
    if (payload.sdpOffer) {
      (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer =
        payload.sdpOffer;
    }
    return;
  }

  if (payload.sdpOffer) {
    (window as unknown as { __pendingCallOffer?: RTCSessionDescriptionInit }).__pendingCallOffer =
      payload.sdpOffer;
  }

  s.setState({
    voiceCallOpen: true,
    voiceCallTarget: payload.from,
    voiceCallType: 'incoming',
    voiceCallStatus: 'ringing',
    voiceCallId: payload.callId,
    voiceCallDuration: 0,
    voiceCallMuted: false,
  });
  startIncomingRingtone();
}

export function handleCallRinging(payload: { callId: string; from: VoiceCallPeer }) {
  if (isCallIgnored(payload.callId)) return;
  handleCallInvite(payload);
}

export async function handleCallAccepted(payload: {
  callId: string;
  sdpAnswer?: RTCSessionDescriptionInit;
}) {
  if (patch().getVoiceCallId() !== payload.callId) return;
  await connectOutgoingCaller(payload.callId, payload.sdpAnswer);
}

/** Legacy socket accept — kept for backward compatibility */
export async function handleCallAccept(payload: {
  callId: string;
  sdpAnswer: RTCSessionDescriptionInit;
}) {
  await handleCallAccepted(payload);
}

export async function handleCallIce(payload: {
  callId: string;
  candidate: RTCIceCandidateInit;
}) {
  if (patch().getVoiceCallId() !== payload.callId) return;
  await addRemoteIceCandidate(payload.candidate);
}

export function handleCallReject(payload: { callId: string }) {
  if (patch().getVoiceCallId() !== payload.callId) return;
  markCallIgnored(payload.callId);
  const wasOutgoing = useAppStore.getState().voiceCallType === 'outgoing';
  stopCallTones();
  clearOutgoingRingTimeout();
  stopLocalMedia();
  stopDurationTimer();
  dismissCallUI();
  void (async () => {
    if (wasOutgoing) {
      await playBusyTone();
      const { toast } = await import('sonner');
      toast.info('تماس رد شد');
    }
  })();
}

export function handleCallUnavailable(payload: {
  callId: string;
  reason: 'offline' | 'busy';
}) {
  if (patch().getVoiceCallId() !== payload.callId) return;
  stopCallTones();
  clearOutgoingRingTimeout();
  stopLocalMedia();
  stopDurationTimer();
  dismissCallUI();
  void (async () => {
    if (payload.reason === 'busy') {
      await playBusyTone();
      const { toast } = await import('sonner');
      toast.info('طرف مقابل مشغول است');
    } else {
      await playUnavailableTone();
      const { toast } = await import('sonner');
      toast.info('کاربر آفلاین است یا در دسترس نیست');
    }
    if (payload.callId) await apiPatchCall(payload.callId, 'cancel');
  })();
}

export function handleCallHangup(payload: { callId: string }) {
  if (patch().getVoiceCallId() !== payload.callId) return;
  markCallIgnored(payload.callId);
  dismissCallUI();
}

export type IncomingCallRow = {
  callId: string;
  sdpOffer: RTCSessionDescriptionInit | null;
  from: VoiceCallPeer;
};

/** @deprecated Incoming calls are delivered via Socket.io `call:invite` only. */
export async function pollIncomingCalls(): Promise<void> {
  /* no-op — socket-only */
}
