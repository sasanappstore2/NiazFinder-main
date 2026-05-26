/** Client-side ICE config (public STUN only unless TURN exposed via NEXT_PUBLIC_*). */
export function getClientIceServers(): RTCIceServer[] {
  const stunRaw =
    process.env.NEXT_PUBLIC_STUN_URLS ?? 'stun:stun.l.google.com:19302';
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
