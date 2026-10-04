/**
 * Shared loader for optional Janus/TURN credentials (GET /api/voice/credentials).
 * Primary overlay media still uses `/api/calls` ICE via call-controller;
 * this is used when NEXT_PUBLIC_JANUS_WS_URL is set for SFU experiments.
 */
export type VoiceCredentialsResponse = {
  janus: {
    wsUrl: string;
    roomId: number;
    plugin: string;
    iceTransportPolicy: 'relay' | 'all';
  } | null;
  iceServers: RTCIceServer[];
};

export async function loadVoiceCredentials(
  conversationId: string,
  authToken: string
): Promise<VoiceCredentialsResponse | null> {
  const res = await fetch(
    `/api/voice/credentials?conversationId=${encodeURIComponent(conversationId)}`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  if (!res.ok) return null;
  return (await res.json()) as VoiceCredentialsResponse;
}

export function isJanusConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_JANUS_WS_URL?.trim());
}
