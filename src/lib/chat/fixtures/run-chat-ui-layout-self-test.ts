import {
  getBubbleRadiusStyle,
  toBubbleGroupSlot,
} from '@/lib/chat/ui/bubble-geometry';
import {
  classifyMessageContent,
  messageTextClassName,
} from '@/lib/chat/ui/message-layout';
import { shouldShowPeerAvatar } from '@/lib/chat/message-thread-layout';
import type { Message } from '@/lib/types';

const stub = (senderId: string, id: string): Message => ({
  id,
  conversationId: 'c',
  senderId,
  content: 'x',
  type: 'TEXT',
  isRead: true,
  createdAt: new Date().toISOString(),
});

const peerRun: Message[] = [
  stub('me', '1'),
  stub('peer', '2'),
  stub('peer', '3'),
];
assert(shouldShowPeerAvatar(peerRun, 1, 'me'), 'avatar first peer in run');
assert(!shouldShowPeerAvatar(peerRun, 2, 'me'), 'no avatar on second peer');

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(toBubbleGroupSlot({ isFirst: true, isLast: true, isSingle: true }) === 'single', 'single slot');
assert(toBubbleGroupSlot({ isFirst: true, isLast: false, isSingle: false }) === 'first', 'first slot');

const sentTail = getBubbleRadiusStyle('sent', 'single');
assert(sentTail.borderBottomRightRadius === 4, 'sent bottom-right tail');

const recvTail = getBubbleRadiusStyle('received', 'last');
assert(recvTail.borderBottomLeftRadius === 4, 'received bottom-left tail');
assert(recvTail.borderTopLeftRadius === 10, 'received cluster join top-left');

const shortText = classifyMessageContent({
  id: '1',
  conversationId: 'c',
  senderId: 'u',
  content: 'سلام',
  type: 'TEXT',
  isRead: true,
  createdAt: new Date().toISOString(),
});
assert(!shortText.useUnbrokenWrap, 'short Persian no unbroken');
assert(messageTextClassName(shortText) === 'chat-message-text', 'normal wrap class');

const spam = classifyMessageContent({
  id: '2',
  conversationId: 'c',
  senderId: 'u',
  content: 'س'.repeat(60),
  type: 'TEXT',
  isRead: true,
  createdAt: new Date().toISOString(),
});
assert(spam.useUnbrokenWrap, 'repeated chars unbroken');
assert(messageTextClassName(spam).includes('unbroken'), 'unbroken class');

console.log('chat-ui-layout self-test: ok');
