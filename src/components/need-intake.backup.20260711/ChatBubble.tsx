'use client';

import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  className?: string;
}

/** Intake chat — shares main chat thread alignment tokens */
export function ChatBubble({ role, children, className }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div className={cn('chat-thread', className)} dir="rtl">
    <div
      className={cn(
        'chat-thread-row',
        isUser ? 'chat-thread-row--sent' : 'chat-thread-row--received'
      )}
    >
      <div
        className={cn(
          'chat-bubble',
          isUser ? 'chat-bubble--sent chat-bubble--single' : 'chat-bubble--received chat-bubble--single'
        )}
      >
        {children}
      </div>
    </div>
    </div>
  );
}
