'use client';

import { Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Sent = single check; read by peer = double check (WhatsApp-style). */
export function ChatReadReceiptIcon({
  isRead,
  className,
}: {
  isRead?: boolean;
  className?: string;
}) {
  const Icon = isRead ? CheckCheck : Check;

  return (
    <Icon
      className={cn(className, isRead && 'chat-meta-read--read')}
      aria-hidden
    />
  );
}
