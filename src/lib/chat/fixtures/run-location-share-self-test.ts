import { chatMessageListPreview } from '@/lib/chat/contact-share';
import {
  buildChatLocationShareContent,
  CHAT_LOCATION_LIST_PREVIEW,
  CHAT_LOCATION_SHARE_PREFIX,
  buildChatLocationMapHref,
  formatLocationCoordsDisplay,
  parseChatLocationShareContent,
} from '@/lib/chat/location-share';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const payload = { v: 1 as const, lat: 35.6892, lng: 51.389 };
const content = buildChatLocationShareContent(payload);

assert(content.startsWith(CHAT_LOCATION_SHARE_PREFIX), 'prefix');
const parsed = parseChatLocationShareContent(content);
assert(parsed?.lat === payload.lat && parsed.lng === payload.lng, 'roundtrip');
assert(parseChatLocationShareContent('invalid') === null, 'reject invalid');
assert(parseChatLocationShareContent('__NF_LOCATION_V1__:{"v":1,"lat":999,"lng":51}') === null, 'reject bad coords');

assert(
  chatMessageListPreview(content, 'TEXT') === CHAT_LOCATION_LIST_PREVIEW,
  'list preview'
);
assert(formatLocationCoordsDisplay(35.6892, 51.389).includes('35.68920'), 'coords format');
assert(buildChatLocationMapHref(35.6, 51.3).includes('view=map'), 'map href');

console.log('location-share self-test: ok');
