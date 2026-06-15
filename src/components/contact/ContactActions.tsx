'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Phone, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { routeBuilder } from '@/config/routes';
import {
  startConversation,
  navigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { fetchUserContact } from '@/lib/contact/fetch-contact';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { ensureNeedChatPreview } from '@/lib/contact/need-chat-preview';
import type { NeedChatPreview } from '@/lib/contact/need-chat-preview';
import Link from 'next/link';
import { useBusinessContact } from '@/hooks/use-business-contact';

export interface ContactActionsProps {
  otherUserId: string;
  requestId?: string;
  displayName?: string;
  hasPhone?: boolean;
  chatEnabled?: boolean;
  showProfile?: boolean;
  profileHref?: string;
  /** When set, opens business contact picker instead of direct user chat */
  businessSlug?: string;
  /** Snapshot for chat need-context banner (title, category, city). */
  needPreview?: Omit<NeedChatPreview, 'id'>;
  /** Override chat button label (e.g. primary CTA on need detail aside). */
  chatLabel?: string;
  variant?: 'compact' | 'default' | 'sticky' | 'stacked';
  className?: string;
}

export function ContactActions({
  otherUserId,
  requestId,
  displayName,
  hasPhone = true,
  chatEnabled = true,
  showProfile = true,
  profileHref,
  needPreview,
  chatLabel = 'چت',
  variant = 'default',
  className,
  businessSlug,
}: ContactActionsProps) {
  const router = useRouter();
  const { openBusinessContact, picker } = useBusinessContact();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);
  const currentUserId = useAppStore((s) => s.currentUser?.id);

  const [chatLoading, setChatLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);

  const proHref = profileHref ?? routeBuilder.pro(otherUserId);
  const isSelf = currentUserId === otherUserId;

  const requireAuth = (action: 'chat' | 'call') => {
    savePendingContact({
      action,
      otherUserId,
      requestId,
      returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    setAuthModalOpen(true);
  };

  const handleChat = async () => {
    if (isSelf) {
      toast.info('نمی‌توانید با خودتان گفتگو کنید');
      return;
    }
    if (businessSlug) {
      await openBusinessContact({
        businessSlug,
        requestId,
        returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
      });
      return;
    }
    if (!isAuthenticated || !authToken) {
      requireAuth('chat');
      return;
    }
    setChatLoading(true);
    try {
      if (requestId) {
        ensureNeedChatPreview(requestId, needPreview);
      }
      const { conversationId } = await startConversation(
        { otherUserId, requestId },
        authToken
      );
      navigateToConversation(router, conversationId);
    } catch (e) {
      if (e instanceof ContactAuthRequiredError) {
        setAuthModalOpen(true);
      } else {
        toast.error(e instanceof Error ? e.message : 'خطا در چت');
      }
    } finally {
      setChatLoading(false);
    }
  };

  const handleCall = async () => {
    if (isSelf) return;
    if (!isAuthenticated || !authToken) {
      requireAuth('call');
      return;
    }
    setCallLoading(true);
    try {
      const contact = await fetchUserContact(otherUserId, authToken, { requestId });
      if (!contact.hasPhone) {
        toast.info('این کاربر شماره تماس ثبت نکرده — از چت استفاده کنید');
        return;
      }
      const parts = contact.displayName.split(/\s+/);
      openVoiceCall({
        id: contact.userId,
        firstName: parts[0] ?? contact.displayName,
        lastName: parts.slice(1).join(' ') || '',
        displayName: contact.displayName,
      });
    } catch (e) {
      if (e instanceof ContactAuthRequiredError) {
        setAuthModalOpen(true);
      } else {
        toast.error(e instanceof Error ? e.message : 'خطا در تماس');
      }
    } finally {
      setCallLoading(false);
    }
  };

  if (isSelf) return null;

  const btnSize =
    variant === 'compact' ? 'sm' : variant === 'stacked' ? 'lg' : 'default';
  const layout =
    variant === 'sticky'
      ? 'flex gap-2 px-3 py-2'
      : variant === 'stacked'
        ? 'flex flex-col gap-3'
        : variant === 'compact'
          ? 'flex flex-wrap gap-1.5'
          : 'flex flex-wrap gap-2';
  const fullWidthBtn = variant === 'sticky' || variant === 'stacked';

  return (
    <>
      {picker}
      <div
      className={cn(
        layout,
        variant === 'sticky' &&
          'fixed inset-x-0 z-[calc(var(--z-mobile-nav)-1)] border-t border-border/60 bg-background/95 backdrop-blur-md supports-backdrop-filter:bg-background/80 supports-[padding:max(0px)]:pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        variant === 'sticky' && 'bottom-(--mobile-nav-offset)',
        variant === 'sticky' && 'min-h-(--sticky-contact-bar-height)',
        className
      )}
      role="group"
      aria-label={displayName ? `ارتباط با ${displayName}` : 'گزینه‌های ارتباط'}
    >
      {chatEnabled && (
        <Button
          type="button"
          size={btnSize}
          className={cn(
            fullWidthBtn && 'w-full flex-1',
            variant === 'sticky' && 'h-10 min-h-10 text-sm',
            variant === 'stacked' &&
              'h-12 min-h-12 rounded-xl text-base font-semibold shadow-sm transition-[box-shadow,transform] hover:shadow-md active:scale-[0.99]'
          )}
          disabled={chatLoading}
          onClick={() => void handleChat()}
        >
          {chatLoading ? (
            <Loader2 className="size-4 animate-spin ml-1" />
          ) : (
            <MessageCircle className="size-4 ml-1" />
          )}
          <span className="max-[360px]:hidden">{chatLabel}</span>
          <span className="hidden max-[360px]:inline">پیام</span>
        </Button>
      )}
      {hasPhone && (
        <Button
          type="button"
          variant="outline"
          size={btnSize}
          className={cn(
            fullWidthBtn && 'w-full flex-1',
            variant === 'sticky' && 'h-10 min-h-10 text-sm',
            variant === 'stacked' &&
              'h-12 min-h-12 rounded-xl border-2 text-base font-medium bg-background/80 hover:bg-muted/40'
          )}
          disabled={callLoading}
          onClick={() => void handleCall()}
        >
          {callLoading ? (
            <Loader2 className="size-4 animate-spin ml-1" />
          ) : (
            <Phone className="size-4 ml-1" />
          )}
          تماس
        </Button>
      )}
      {showProfile && (
        <Button
          type="button"
          variant="ghost"
          size={btnSize}
          className={cn(
            variant === 'sticky' && 'shrink-0',
            variant === 'stacked' && 'w-full'
          )}
          asChild
        >
          <Link href={proHref}>
            <User className="size-4 ml-1" />
            {variant !== 'compact' && variant !== 'stacked' && 'پروفایل'}
            {variant === 'stacked' && 'مشاهده پروفایل'}
          </Link>
        </Button>
      )}
    </div>
    </>
  );
}
