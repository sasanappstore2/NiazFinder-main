'use client';

import { ContactActions } from '@/components/contact/ContactActions';
import { Button } from '@/components/ui/button';
import { routeBuilder } from '@/config/routes';
import type { NeedChatPreview } from '@/lib/contact/need-chat-preview';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';
import Link from 'next/link';

interface NeedMobileStickyBarProps {
  isBusinessUser: boolean;
  otherUserId: string;
  requestId: string;
  displayName?: string;
  needPreview?: Omit<NeedChatPreview, 'id'>;
  chatLabel?: string;
  className?: string;
}

export function NeedMobileStickyBar({
  isBusinessUser,
  otherUserId,
  requestId,
  displayName,
  needPreview,
  chatLabel = 'پیام و گفتگو',
  className,
}: NeedMobileStickyBarProps) {
  if (isBusinessUser) {
    return (
      <div
        className={cn(
          'fixed inset-x-0 z-[calc(var(--z-mobile-nav)-1)] border-t border-border/60 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 lg:hidden',
          'bottom-(--mobile-nav-offset) min-h-(--sticky-contact-bar-height)',
          'supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          className
        )}
        role="group"
        aria-label={displayName ? `ارتباط با ${displayName}` : 'گزینه‌های ارتباط'}
      >
        <div className="mx-auto flex max-w-6xl gap-2 px-3 py-2">
          <ContactActions
            otherUserId={otherUserId}
            requestId={requestId}
            displayName={displayName}
            needPreview={needPreview}
            chatLabel={chatLabel}
            variant="default"
            hasPhone={false}
            showProfile={false}
            className="min-w-0 flex-1 gap-2 [&>button]:h-11 [&>button]:min-h-11 [&>button]:flex-1 [&>button]:text-sm"
          />
          <Button
            variant="outline"
            className="h-11 min-h-11 flex-1 text-sm"
            asChild
          >
            <Link href={routeBuilder.needPropose(requestId)}>
              <Send className="size-4 ml-1 shrink-0" aria-hidden />
              <span className="max-[360px]:hidden">ارسال پیشنهاد</span>
              <span className="hidden max-[360px]:inline">پیشنهاد</span>
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ContactActions
      otherUserId={otherUserId}
      requestId={requestId}
      displayName={displayName}
      needPreview={needPreview}
      chatLabel={chatLabel}
      variant="sticky"
      hasPhone
      chatEnabled
      showProfile={false}
      className={cn('max-w-6xl mx-auto lg:hidden', className)}
    />
  );
}
