'use client';

import { MessageCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ContactActions } from '@/components/contact/ContactActions';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';
import type { NeedChatPreview } from '@/lib/contact/need-chat-preview';
import type { BookmarkProposalStatus } from '@/lib/bookmarks/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface NeedBusinessActionsProps {
  otherUserId: string;
  requestId: string;
  displayName?: string;
  needPreview?: Omit<NeedChatPreview, 'id'>;
  conversationId?: string | null;
  proposalStatus?: BookmarkProposalStatus | null;
  compact?: boolean;
  className?: string;
}

export function NeedBusinessActions({
  otherUserId,
  requestId,
  displayName,
  needPreview,
  conversationId,
  proposalStatus,
  compact = false,
  className,
}: NeedBusinessActionsProps) {
  const router = useRouter();
  const btnClass = compact
    ? 'h-10 min-h-10 rounded-xl text-sm font-semibold'
    : 'h-11 min-h-11 rounded-xl text-sm font-semibold sm:text-base';

  const hasPendingProposal = proposalStatus === 'PENDING';
  const hasFinalProposal =
    proposalStatus === 'ACCEPTED' ||
    proposalStatus === 'REJECTED' ||
    proposalStatus === 'WITHDRAWN';

  return (
    <div
      className={cn('grid grid-cols-2 gap-2', className)}
      role="group"
      aria-label="اقدامات کسب‌وکار"
    >
      {conversationId ? (
        <Button
          type="button"
          className={cn(btnClass, 'w-full')}
          onClick={(e) => {
            e.stopPropagation();
            router.push(routeBuilder.chatConversation(conversationId));
          }}
        >
          <MessageCircle className="size-4 ml-1 shrink-0" aria-hidden />
          <span className="truncate max-[360px]:hidden">ادامه گفتگو</span>
          <span className="truncate hidden max-[360px]:inline">گفتگو</span>
        </Button>
      ) : (
        <ContactActions
          otherUserId={otherUserId}
          requestId={requestId}
          displayName={displayName}
          needPreview={needPreview}
          chatLabel={compact ? 'پیام' : 'پیام و گفتگو'}
          variant="stacked"
          hasPhone={false}
          showProfile={false}
          className={cn(
            'min-w-0 gap-0 [&>button]:w-full [&>button]:rounded-xl [&>button]:text-sm [&>button]:font-semibold',
            compact
              ? '[&>button]:h-10 [&>button]:min-h-10'
              : '[&>button]:h-11 [&>button]:min-h-11 sm:[&>button]:text-base'
          )}
        />
      )}

      {hasPendingProposal ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  btnClass,
                  'w-full border-2 bg-muted/30 font-medium text-muted-foreground'
                )}
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                <Send className="size-4 ml-1 shrink-0" aria-hidden />
                پیشنهاد ارسال شد
              </Button>
            </TooltipTrigger>
            <TooltipContent>پیشنهاد شما در انتظار پاسخ است</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : hasFinalProposal ? (
        <Button
          variant="outline"
          className={cn(btnClass, 'w-full border-2 bg-background/80 font-medium')}
          asChild
        >
          <Link href={routeBuilder.listing(requestId)} onClick={(e) => e.stopPropagation()}>
            <Send className="size-4 ml-1 shrink-0" aria-hidden />
            مشاهده آگهی
          </Link>
        </Button>
      ) : (
        <Button
          variant="outline"
          className={cn(
            btnClass,
            'w-full border-2 bg-background/80 font-medium hover:bg-muted/40'
          )}
          asChild
        >
          <Link href={routeBuilder.needPropose(requestId)} onClick={(e) => e.stopPropagation()}>
            <Send className="size-4 ml-1 shrink-0" aria-hidden />
            <span className="truncate max-[360px]:hidden">ارسال پیشنهاد</span>
            <span className="truncate hidden max-[360px]:inline">پیشنهاد</span>
          </Link>
        </Button>
      )}
    </div>
  );
}
