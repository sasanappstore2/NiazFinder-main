'use client';

import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  children: React.ReactNode;
  className?: string;
}

export function ChatBubble({ role, children, className }: ChatBubbleProps) {
  const isUser = role === 'user';
  return (
    <div
      className={cn(
        'flex w-full',
        isUser ? 'justify-start' : 'justify-end',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {children}
      </div>
    </div>
  );
}
