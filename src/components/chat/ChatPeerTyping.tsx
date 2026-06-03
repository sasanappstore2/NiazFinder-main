'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ChatPeerTypingProps {
  visible: boolean;
  peerName?: string;
  className?: string;
  variant?: 'inline' | 'bubble';
}

const fadeTransition = { duration: 0.18, ease: [0.22, 1, 0.36, 1] as const };

function TypingWaveDots({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' }) {
  const dot =
    size === 'xs' ? 'h-1.5 w-1.5' : size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const gap = size === 'xs' ? 'gap-[3px]' : size === 'sm' ? 'gap-1' : 'gap-1.5';

  return (
    <span className={cn('typing-wave-dots inline-flex items-end', gap)} aria-hidden>
      <span className={cn('typing-wave-dot rounded-full bg-foreground/35 dark:bg-foreground/50', dot)} />
      <span className={cn('typing-wave-dot rounded-full bg-foreground/35 dark:bg-foreground/50', dot)} />
      <span className={cn('typing-wave-dot rounded-full bg-foreground/35 dark:bg-foreground/50', dot)} />
    </span>
  );
}

function TypingWaveBar({ compact }: { compact?: boolean }) {
  return (
    <span
      className={cn(
        'typing-wave-bar block rounded-full bg-foreground/20 dark:bg-foreground/30',
        compact ? 'mt-1 h-[1.5px] w-6' : 'mt-1.5 h-0.5 w-8'
      )}
      aria-hidden
    />
  );
}

function TypingWaveIndicator({ size = 'md', showBar = true }: { size?: 'xs' | 'sm' | 'md'; showBar?: boolean }) {
  return (
    <span className="inline-flex flex-col items-center">
      <TypingWaveDots size={size} />
      {showBar && <TypingWaveBar compact={size === 'xs'} />}
    </span>
  );
}

/** Compact typing line for chat header */
export function ChatTypingHeaderStatus({
  visible,
  className,
}: {
  visible: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {visible ? (
        <motion.div
          key="typing-header"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 2 }}
          transition={fadeTransition}
          className={cn('flex items-center gap-2', className)}
          role="status"
          aria-live="polite"
        >
          <TypingWaveIndicator size="xs" showBar={false} />
          <span className="text-xs text-muted-foreground">در حال تایپ</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ChatPeerTyping({
  visible,
  peerName,
  className,
  variant = 'bubble',
}: ChatPeerTypingProps) {
  const label = peerName?.trim() ? `${peerName} در حال نوشتن` : 'در حال نوشتن';

  if (variant === 'inline') {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={fadeTransition}
            className={cn('flex w-full items-center gap-2.5 px-4 py-2 ms-auto', className)}
            role="status"
            aria-live="polite"
            aria-label={label}
          >
            <TypingWaveIndicator size="sm" />
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          key="typing-bubble"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={fadeTransition}
          className={cn('chat-peer-typing-row', className)}
          role="status"
          aria-live="polite"
          aria-label={label}
        >
          <div className="chat-message chat-message--incoming">
            <div className="chat-message-avatar-spacer" aria-hidden />
            <div className="chat-message-column">
              <div
                className="chat-bubble chat-bubble--received chat-bubble--single"
                style={{ borderRadius: 18, borderBottomLeftRadius: 4 }}
              >
                <div className="chat-typing-indicator" aria-hidden>
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                  <span className="chat-typing-dot" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
