/** ICE servers for WebRTC (STUN + optional TURN). */
export function getIceServers(): RTCIceServer[] {
  const turnHost = process.env.NEXT_PUBLIC_TURN_HOST || process.env.TURN_HOST;
  const defaultStun = turnHost ? `stun:${turnHost}:3478` : 'stun:127.0.0.1:3478';
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
