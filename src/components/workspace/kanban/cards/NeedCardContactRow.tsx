'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ClipboardList, Eye, Loader2, MessageCircle, Phone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useContactCallSheet } from '@/components/contact/use-contact-call-sheet';
import { routeBuilder } from '@/config/routes';
import {
  startConversation,
  syncAndNavigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { savePendingContact } from '@/lib/contact/pending-contact';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import type { WorkspaceNeedItem } from '../../types';

export function NeedCardContactRow({
  item,
  onAddToFollowUp,
  isInFollowUps,
}: {
  item: WorkspaceNeedItem;
  onAddToFollowUp?: (item: WorkspaceNeedItem) => void;
  isInFollowUps?: boolean;
}) {
  const router = useRouter();
  const { openCallSheet, sheet: callSheet } = useContactCallSheet();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const currentUserId = useAppStore((s) => s.currentUser?.id);

  const [chatLoading, setChatLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);

  const contactUserId = item.contactUserId ?? null;
  const canCall = Boolean(contactUserId && currentUserId !== contactUserId);
  const canChat = Boolean(
    currentUserId !== contactUserId && (item.chatUrl || contactUserId)
  );

  const requireAuth = (action: 'chat' | 'call') => {
    if (!contactUserId) return;
    savePendingContact({
      action,
      otherUserId: contactUserId,
      requestId: item.requestId,
      returnTo: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });
    setAuthModalOpen(true);
  };

  const handleChat = async () => {
    if (item.chatUrl) {
      router.push(item.chatUrl);
      return;
    }
    if (!contactUserId) {
      toast.error('برای چت ابتدا لید را بپذیرید یا از صفحه نیاز اقدام کنید');
      return;
    }
    if (!isAuthenticated || !authToken) {
      requireAuth('chat');
      return;
    }
    setChatLoading(true);
    try {
      const result = await startConversation(
        { otherUserId: contactUserId, requestId: item.requestId },
        authToken
      );
      syncAndNavigateToConversation(router, result);
    } catch (err) {
      if (err instanceof ContactAuthRequiredError) {
        requireAuth('chat');
        return;
      }
      toast.error('شروع چت ناموفق بود');
    } finally {
      setChatLoading(false);
    }
  };

  const handleCall = async () => {
    if (!contactUserId) {
      toast.error('اطلاعات تماس در دسترس نیست');
      return;
    }
    if (!isAuthenticated || !authToken) {
      requireAuth('call');
      return;
    }
    setCallLoading(true);
    try {
      await openCallSheet({
        otherUserId: contactUserId,
        requestId: item.requestId,
        displayName: item.userName ?? item.title,
      });
    } finally {
      setCallLoading(false);
    }
  };

  return (
    <>
      {callSheet}
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="اقدامات نیاز">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 w-full min-w-0 shrink"
          aria-label="مشاهده نیاز"
          asChild
        >
          <Link href={item.needUrl}>
            <Eye className="size-3.5" />
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn('size-8 w-full min-w-0 shrink', !canCall && 'opacity-40')}
          disabled={callLoading || !canCall}
          aria-label="تماس"
          onClick={() => void handleCall()}
        >
          {callLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          className={cn('size-8 w-full min-w-0 shrink', !canChat && 'opacity-40')}
          disabled={chatLoading || !canChat}
          aria-label="چت"
          onClick={() => void handleChat()}
        >
          {chatLoading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <MessageCircle className="size-3.5" />
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 w-full min-w-0 shrink"
          aria-label="ارسال پیشنهاد"
          asChild
        >
          <Link href={routeBuilder.needPropose(item.requestId)}>
            <Send className="size-3.5" />
          </Link>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8 w-full min-w-0 shrink', isInFollowUps && 'opacity-40')}
          disabled={isInFollowUps}
          aria-label={isInFollowUps ? 'در پیگیری‌ها ثبت شده' : 'افزودن به پیگیری‌ها'}
          onClick={() => onAddToFollowUp?.(item)}
        >
          <ClipboardList className="size-3.5" />
        </Button>
      </div>
    </>
  );
}
