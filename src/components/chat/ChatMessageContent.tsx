'use client';

import { ExternalLink, FileIcon } from 'lucide-react';
import type { Message } from '@/lib/types';
import { parseNeedCardSnapshot } from '@/contracts/need-card-snapshot';
import {
  parseChatProductCardContent,
  parseLegacyProductIntroText,
  parseProductCardSnapshot,
} from '@/contracts/product-card-snapshot';
import { NeedLeadCard } from '@/components/need/NeedLeadCard';
import { ProductChatCard } from '@/components/chat/ProductChatCard';
import { parseChatContactShareContent } from '@/lib/chat/contact-share';
import { ChatContactShareCard } from '@/components/chat/ChatContactShareCard';
import { ChatImageMessage } from '@/components/chat/ChatImageMessage';
import { ChatVoiceMessage } from '@/components/chat/ChatVoiceMessage';

interface ChatMessageContentProps {
  message: Message;
  isOwn: boolean;
  /** For IMAGE bubbles: time + read ticks rendered on the photo. */
  imageMeta?: { timeLabel: string; isRead?: boolean };
  /** For VOICE bubbles: time + read ticks below the player. */
  voiceMeta?: { timeLabel: string; isRead?: boolean };
  onImageOpen?: () => void;
}

export function ChatMessageContent({
  message,
  isOwn,
  imageMeta,
  voiceMeta,
  onImageOpen,
}: ChatMessageContentProps) {
  if (message.type === 'NEED_CARD') {
    const snapshot = parseNeedCardSnapshot(message.content);
    if (snapshot) {
      return <NeedLeadCard need={snapshot} isOwn={isOwn} />;
    }
    return (
      <p className="text-sm text-muted-foreground">کارت نیاز قابل نمایش نیست</p>
    );
  }

  if (message.type === 'OFFER_CARD') {
    const snapshot = parseProductCardSnapshot(message.content);
    if (snapshot) {
      return <ProductChatCard product={snapshot} isOwn={isOwn} />;
    }
    return (
      <p className="text-sm text-muted-foreground">کارت محصول قابل نمایش نیست</p>
    );
  }

  if (message.type === 'IMAGE') {
    const url = message.content.trim();
    return (
      <ChatImageMessage
        url={url}
        isOwn={isOwn}
        timeLabel={imageMeta?.timeLabel ?? ''}
        isRead={imageMeta?.isRead}
        onOpen={onImageOpen}
      />
    );
  }

  if (message.type === 'VOICE') {
    const url = message.content.trim();
    return (
      <ChatVoiceMessage
        url={url}
        isOwn={isOwn}
        timeLabel={voiceMeta?.timeLabel ?? ''}
        isRead={voiceMeta?.isRead}
      />
    );
  }

  if (message.type === 'FILE') {
    const url = message.content.trim();
    const label = /\.pdf(?:\?|$)/i.test(url) ? 'دانلود PDF' : 'باز کردن فایل';
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex max-w-[min(100%,260px)] items-center gap-2 rounded-lg border border-primary/25 bg-background/90 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
      >
        <FileIcon className="size-4 shrink-0 opacity-80" aria-hidden />
        <span className="truncate">{label}</span>
        <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden />
      </a>
    );
  }

  if (message.type === 'TEXT') {
    const product =
      parseChatProductCardContent(message.content) ??
      parseLegacyProductIntroText(message.content);
    if (product) {
      return <ProductChatCard product={product} isOwn={isOwn} />;
    }

    const shared = parseChatContactShareContent(message.content);
    if (shared) {
      return (
        <ChatContactShareCard phone={shared.phone} avatarSrc={shared.avatar} isOwn={isOwn} />
      );
    }
  }

  return <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>;
}
