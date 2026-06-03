import { chatMessageListPreview } from '@/lib/chat/contact-share';
import type { Message } from '@/lib/types';

export type ReplyToQuote = NonNullable<Message['replyTo']>;

export function buildReplyToQuote(
  source: Pick<Message, 'id' | 'content' | 'type' | 'senderId'>,
  viewerId: string,
  peer?: { firstName?: string | null; lastName?: string | null } | null
): ReplyToQuote {
  const preview = chatMessageListPreview(source.content, source.type);
  if (source.senderId === viewerId) {
    return {
      id: source.id,
      content: preview,
      senderFirstName: 'شما',
      senderLastName: '',
    };
  }
  return {
    id: source.id,
    content: preview,
    senderFirstName: peer?.firstName?.trim() ?? '',
    senderLastName: peer?.lastName?.trim() ?? '',
  };
}

export function formatReplySenderLabel(
  replyTo: ReplyToQuote,
  fallback = 'کاربر'
): string {
  if (replyTo.senderFirstName === 'شما') return 'شما';
  const label = `${replyTo.senderFirstName} ${replyTo.senderLastName}`.trim();
  return label || fallback;
}
