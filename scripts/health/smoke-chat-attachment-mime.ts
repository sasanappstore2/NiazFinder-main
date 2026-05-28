/**
 * Smoke: chat voice MIME must accept MediaRecorder output (`audio/webm;codecs=opus`).
 * Run: npx tsx scripts/health/smoke-chat-attachment-mime.ts
 */
import {
  extFromChatMime,
  fileTypeForVoiceUpload,
  isAllowedChatAttachment,
  normalizeChatMime,
} from '../../src/lib/chat/attachment-mime';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const cases = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg',
  'image/png',
  'application/pdf',
];

for (const raw of cases) {
  assert(isAllowedChatAttachment(raw, 'test.bin'), `allowed: ${raw}`);
  assert(normalizeChatMime(raw) === raw.split(';')[0], `normalize: ${raw}`);
}

assert(!isAllowedChatAttachment('audio/flac', 'x.flac'), 'reject flac');
assert(extFromChatMime('audio/webm;codecs=opus') === '.webm', 'ext webm');
assert(fileTypeForVoiceUpload(new Blob([], { type: 'audio/webm;codecs=opus' })) === 'audio/webm', 'upload type');

console.log('OK smoke-chat-attachment-mime');
