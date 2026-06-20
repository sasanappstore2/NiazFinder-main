import { isValidLatLng } from '@/lib/map/coords';

/** Marker for v1 structured location-share payloads inside message `content` (type TEXT). */
export const CHAT_LOCATION_SHARE_PREFIX = '__NF_LOCATION_V1__:' as const;

export type ChatLocationSharePayloadV1 = {
  v: 1;
  lat: number;
  lng: number;
  label?: string;
};

export function buildChatLocationShareContent(payload: ChatLocationSharePayloadV1): string {
  return `${CHAT_LOCATION_SHARE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseChatLocationShareContent(content: string): ChatLocationSharePayloadV1 | null {
  if (!content.startsWith(CHAT_LOCATION_SHARE_PREFIX)) return null;
  try {
    const raw = JSON.parse(content.slice(CHAT_LOCATION_SHARE_PREFIX.length)) as ChatLocationSharePayloadV1;
    if (raw?.v !== 1) return null;
    if (!isValidLatLng(raw.lat, raw.lng)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function formatLocationCoordsDisplay(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/** Opens internal needs browse map centered on shared coordinates. */
export function buildChatLocationMapHref(lat: number, lng: number, zoom = 15): string {
  const params = new URLSearchParams({
    view: 'map',
    lat: String(lat),
    lng: String(lng),
    zoom: String(zoom),
  });
  return `/n/iran?${params.toString()}`;
}

export const CHAT_LOCATION_LIST_PREVIEW = 'موقعیت روی نقشه';
