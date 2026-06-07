'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ConversationTurn } from '@/contracts/need-intake';
import { Sparkles } from 'lucide-react';

function TypewriterText({
  text,
  animate,
  onDone,
}: {
  text: string;
  animate: boolean;
  onDone?: () => void;
}) {
  const [visible, setVisible] = useState(animate ? '' : text);

  useEffect(() => {
    if (!animate) {
      setVisible(text);
      return;
    }
    if (text.length > 150) {
      setVisible(text);
      onDone?.();
      return;
    }
    setVisible('');
    let i = 0;
    const step = () => {
      i += 1;
      setVisible(text.slice(0, i));
      if (i < text.length) {
        window.setTimeout(step, 12);
      } else {
        onDone?.();
      }
    };
    const t = window.setTimeout(step, 40);
    return () => window.clearTimeout(t);
  }, [text, animate, onDone]);

  return <span>{visible}</span>;
}

interface ChatMessageListProps {
  turns: ConversationTurn[];
  isLoading?: boolean;
  /** Index of assistant turn to typewriter-animate (usually the last one). */
  animateTurnIndex?: number | null;
  className?: string;
  onFeedback?: (turnIndex: number) => void;
}

export function ChatMessageList({
  turns,
  isLoading,
  animateTurnIndex = null,
  className,
  onFeedback,
}: ChatMessageListProps) {
  return (
    <div className={cn('flex flex-col gap-4 px-4 py-4', className)}>
      {turns.map((turn, i) => {
        const isUser = turn.role === 'user';
        const shouldAnimate = !isUser && animateTurnIndex === i;
        return (
          <div
            key={`${turn.role}-${i}`}
            className={cn('flex w-full', isUser ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%]',
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-muted/60 text-foreground'
              )}
            >
              {!isUser && (
                <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Sparkles className="size-3" />
                  <span>دستیار</span>
                </div>
              )}
              <p className="whitespace-pre-wrap">
                {isUser ? (
                  turn.content
                ) : (
                  <TypewriterText text={turn.content} animate={shouldAnimate} />
                )}
              </p>
              {!isUser && onFeedback ? (
                <button
                  type="button"
                  className="mt-2 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => onFeedback(i)}
                >
                  این جواب اشتباه بود
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      {isLoading ? (
        <div className="flex justify-end">
          <div className="rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">
            <span className="animate-pulse">…</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
