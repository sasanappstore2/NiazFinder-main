/** Client-side ICE config (public STUN only unless TURN exposed via NEXT_PUBLIC_*). */
export function getClientIceServers(): RTCIceServer[] {
  const turnHost = process.env.NEXT_PUBLIC_TURN_HOST;
  const defaultStun = turnHost ? `stun:${turnHost}:3478` : 'stun:127.0.0.1:3478';
  const stunRaw = process.env.NEXT_PUBLIC_STUN_URLS ?? defaultStun;
  const stunUrls = stunRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const servers: RTCIceServer[] = stunUrls.map((urls) => ({ urls }));

  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL?.trim();
  if (turnUrl) {
    servers.push({
      urls: turnUrl,
      username: process.env.NEXT_PUBLIC_TURN_USERNAME,
      credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL,
    });
  }

  return servers;
}
