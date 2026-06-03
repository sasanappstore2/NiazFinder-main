'use client';

import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  getBubbleRadiusStyle,
  bubbleGroupClassName,
  type BubbleSide,
  type BubbleGroupPosition,
  toBubbleGroupSlot,
} from '@/lib/chat/ui/bubble-geometry';
import type { MessageLayoutHints } from '@/lib/chat/ui/message-layout';

export interface ChatBubbleShellProps {
  side: BubbleSide;
  group: BubbleGroupPosition;
  hints: MessageLayoutHints;
  radiusStyle?: CSSProperties;
  hasFooter?: boolean;
  children: ReactNode;
  className?: string;
}

export function ChatBubbleShell({
  side,
  group,
  hints,
  radiusStyle,
  hasFooter = false,
  children,
  className,
}: ChatBubbleShellProps) {
  const slot = toBubbleGroupSlot(group);
  const radius = radiusStyle ?? getBubbleRadiusStyle(side, slot);

  return (
    <div
      className={cn(
        'chat-bubble',
        bubbleGroupClassName(slot),
        side === 'sent' ? 'chat-bubble--sent' : 'chat-bubble--received',
        hasFooter && 'chat-bubble--has-footer',
        hints.kind === 'deleted' && 'chat-bubble--deleted',
        hints.isCard && 'chat-bubble--card',
        hints.isMedia && 'chat-bubble--media',
        hints.kind === 'contact_share' && 'chat-bubble--contact',
        className
      )}
      style={radius}
    >
      {children}
    </div>
  );
}
