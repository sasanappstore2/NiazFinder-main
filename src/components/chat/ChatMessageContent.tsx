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
import { parseChatLocationShareContent } from '@/lib/chat/location-share';
import { ChatContactShareCard } from '@/components/chat/ChatContactShareCard';
import { ChatLocationShareCard } from '@/components/chat/ChatLocationShareCard';
import { ChatImageMessage } from '@/components/chat/ChatImageMessage';
import { ChatVoiceMessage } from '@/components/chat/ChatVoiceMessage';
import { sanitizeUserFacingPersianText } from '@/lib/persian-encoding-guard';
import {
  AGENT_EMPTY_AFTER_SANITIZE,
  sanitizeAgentStreamChunk,
  sanitizeAgentVisibleText,
} from '@/lib/ai-agent/output-sanitizer';
import { parseThinkContent } from '@/lib/ai-agent/think-tag-parser';
import {
  AgentStreamCursor,
  AgentThinkingBlock,
  AgentToolStatusChip,
  AgentTypingDots,
} from '@/components/chat/AgentThinkingBlock';

interface ChatMessageContentProps {
  message: Message;
  isOwn: boolean;
  textClassName?: string;
  /** For IMAGE bubbles: time + read ticks rendered on the photo. */
  imageMeta?: { timeLabel: string; isRead?: boolean };
  /** For VOICE bubbles: time + read ticks below the player. */
  voiceMeta?: { timeLabel: string; isRead?: boolean };
  onImageOpen?: () => void;
}

function AgentTextBubble({
  message,
  textClassName,
}: {
  message: Message;
  textClassName: string;
}) {
  const fromContent = parseThinkContent(message.content);
  const thinking = sanitizeAgentVisibleText(
    message.agentThinking?.trim() || fromContent.thinking,
  );
  // While streaming, keep spaces; after done, full sanitize+trim is fine.
  const rawAnswer = message.agentStreaming
    ? message.content
    : fromContent.answer || (thinking ? '' : message.content);
  const answer = message.agentStreaming
    ? sanitizeAgentStreamChunk(rawAnswer)
    : sanitizeAgentVisibleText(rawAnswer);

  const isLive = Boolean(message.agentStreaming);
  const showTool = message.agentStatus === 'tool';
  const showTyping =
    isLive && !answer.trim() && !thinking && message.agentStatus !== 'tool';

  return (
    <div className="min-w-0">
      {showTool ? <AgentToolStatusChip toolName={message.agentToolName} /> : null}
      {thinking || (isLive && message.agentStatus === 'thinking') ? (
        <AgentThinkingBlock
          thinking={thinking}
          isLive={isLive && (message.agentStatus === 'thinking' || !answer.trim())}
        />
      ) : null}
      {showTyping ? (
        <p className={textClassName}>
          <AgentTypingDots />
        </p>
      ) : answer.trim() ? (
        <p className={textClassName}>
          {sanitizeUserFacingPersianText(answer)}
          {isLive && message.agentStatus === 'streaming' ? <AgentStreamCursor /> : null}
        </p>
      ) : !isLive && message.content.trim() ? (
        <p className={textClassName}>{AGENT_EMPTY_AFTER_SANITIZE}</p>
      ) : null}
    </div>
  );
}

export function ChatMessageContent({
  message,
  isOwn,
  textClassName = 'chat-message-text',
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

  if (message.type === 'PROPOSAL') {
    let title = 'پیشنهاد';
    let price = '';
    try {
      const data = JSON.parse(message.content) as { title?: string; price?: string; amount?: number };
      if (data.title) title = data.title;
      if (data.price) price = data.price;
      else if (typeof data.amount === 'number') price = `${data.amount.toLocaleString('fa-IR')} تومان`;
    } catch {
      title = sanitizeUserFacingPersianText(message.content.slice(0, 120));
    }
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">پیشنهاد</p>
        <p className="mt-1">{sanitizeUserFacingPersianText(title)}</p>
        {price ? <p className="mt-1 text-muted-foreground">{sanitizeUserFacingPersianText(price)}</p> : null}
      </div>
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

    const sharedLocation = parseChatLocationShareContent(message.content);
    if (sharedLocation) {
      return (
        <ChatLocationShareCard
          lat={sharedLocation.lat}
          lng={sharedLocation.lng}
          label={sharedLocation.label}
          isOwn={isOwn}
        />
      );
    }

    const isAgentBubble =
      Boolean(message.agentStreaming) ||
      Boolean(message.agentThinking) ||
      Boolean(message.agentStatus) ||
      /<think>/i.test(message.content);

    if (isAgentBubble && !isOwn) {
      return <AgentTextBubble message={message} textClassName={textClassName} />;
    }
  }

  return <p className={textClassName}>{sanitizeUserFacingPersianText(message.content)}</p>;
}
