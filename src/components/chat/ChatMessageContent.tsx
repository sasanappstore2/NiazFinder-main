'use client';

import type { Message } from '@/lib/types';
import { parseNeedCardSnapshot } from '@/contracts/need-card-snapshot';
import { NeedLeadCard } from '@/components/need/NeedLeadCard';

interface ChatMessageContentProps {
  message: Message;
  isOwn: boolean;
}

export function ChatMessageContent({ message, isOwn }: ChatMessageContentProps) {
  if (message.type === 'NEED_CARD') {
    const snapshot = parseNeedCardSnapshot(message.content);
    if (snapshot) {
      return <NeedLeadCard need={snapshot} isOwn={isOwn} />;
    }
    return (
      <p className="text-sm text-muted-foreground">کارت نیاز قابل نمایش نیست</p>
    );
  }

  return <p className="text-sm leading-7 whitespace-pre-wrap">{message.content}</p>;
}
