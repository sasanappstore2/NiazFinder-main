/**
 * Self-test: optimistic user must stay before agent-stream after socket merge.
 * Run: npx --yes tsx src/lib/chat/fixtures/run-append-incoming-order-self-test.ts
 */
import { appendIncomingMessageToStore } from '@/lib/chat/append-incoming-message';
import { compareMessages } from '@/lib/chat/message-order';
import type { Message } from '@/lib/types';

function msg(partial: Partial<Message> & Pick<Message, 'id' | 'content' | 'createdAt'>): Message {
  return {
    conversationId: 'c1',
    senderId: 'u1',
    type: 'TEXT',
    isRead: false,
    attachmentUrls: [],
    ...partial,
  };
}

function assert(cond: unknown, m: string) {
  if (!cond) throw new Error(m);
}

const clientTempId = 'temp-1';
const t0 = '2026-07-10T10:00:00.000Z';
const t1 = '2026-07-10T10:00:00.050Z';

let messages: Message[] = [
  msg({ id: clientTempId, clientTempId, content: 'سلام', createdAt: t0, senderId: 'user' }),
  msg({
    id: `agent-stream-${clientTempId}`,
    content: '',
    createdAt: t0,
    senderId: 'bot',
    agentStreaming: true,
  }),
];

messages = appendIncomingMessageToStore(
  messages,
  msg({
    id: 'real-user-id',
    clientTempId,
    content: 'سلام',
    createdAt: t1,
    senderId: 'user',
  }),
);

assert(messages.length === 2, `expected 2 msgs, got ${messages.length}`);
assert(messages[0]!.id === 'real-user-id', `user should stay first, got ${messages[0]!.id}`);
assert(
  messages[1]!.id === `agent-stream-${clientTempId}`,
  `agent stream should stay second, got ${messages[1]!.id}`,
);

// Server user ack is later than stream bubble timestamp — sort must not invert
messages = [
  msg({ id: 'real-user-id', clientTempId, content: 'سلام', createdAt: t1, senderId: 'user' }),
  msg({
    id: `agent-stream-${clientTempId}`,
    content: '…',
    createdAt: t0,
    senderId: 'bot',
    agentStreaming: true,
  }),
];
messages = [...messages].sort(compareMessages);
assert(messages[0]!.id === 'real-user-id', 'compareMessages must keep user before stream');

// Persisted assistant via socket replaces stream bubble in place
messages = appendIncomingMessageToStore(messages, msg({
  id: 'assistant-id',
  clientTempId: `agent-reply:${clientTempId}`,
  content: 'سلام! چطور می‌تونم کمکتون کنم؟',
  createdAt: '2026-07-10T10:00:01.000Z',
  senderId: 'bot',
}));
assert(messages.length === 2, `expected 2 after assistant merge, got ${messages.length}`);
assert(messages[1]!.id === 'assistant-id', `assistant should replace stream, got ${messages[1]!.id}`);

console.log('PASS append-incoming-order self-test');
