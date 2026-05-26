/** ICE servers for WebRTC (STUN + optional TURN). */
export function getIceServers(): RTCIceServer[] {
  const stunRaw = process.env.NEXT_PUBLIC_STUN_URLS ?? 'stun:stun.l.google.com:19302';
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
