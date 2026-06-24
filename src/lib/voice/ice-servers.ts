// Reachable public STUN fallback — the old `stun:127.0.0.1:3478` loopback default
// failed ICE for any real (cross-machine) call. Self-hosted STUN/TURN still wins.
const PUBLIC_STUN_FALLBACK = 'stun:stun.l.google.com:19302';

/** ICE servers for WebRTC (STUN + optional TURN). */
export function getIceServers(): RTCIceServer[] {
  const turnHost = process.env.NEXT_PUBLIC_TURN_HOST || process.env.TURN_HOST;
  const defaultStun = turnHost ? `stun:${turnHost}:3478` : PUBLIC_STUN_FALLBACK;
  const stunRaw = process.env.NEXT_PUBLIC_STUN_URLS ?? defaultStun;
  const stunUrls = stunRaw.split(',').map((s) => s.trim()).filter(Boolean);

  const servers: RTCIceServer[] = stunUrls.map((urls) => ({ urls }));

  const turnUrl = process.env.TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }

  return servers;
}
