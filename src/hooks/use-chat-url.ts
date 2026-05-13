'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { AppView } from '@/lib/types';

/**
 * هوک مدیریت deep linking چت
 * پشتیبانی از لینک‌های مشترک چت و انکر پیام
 *
 * قالب‌های URL پشتیبانی شده:
 * - #/chat/123 → باز کردن مکالمه 123
 * - #/chat/123?msg=456 → باز کردن مکالمه 123 و اسکرول به پیام 456
 *
 * @example
 * ```tsx
 * // در کامپوننت چت
 * const { conversationId, messageAnchor, clearAnchor } = useChatUrl();
 *
 * // استفاده از انکر برای اسکرول
 * useEffect(() => {
 *   if (messageAnchor) {
 *     scrollToMessage(messageAnchor);
 *     clearAnchor();
 *   }
 * }, [messageAnchor]);
 * ```
 */
export function useChatUrl(): {
  /** شناسه مکالمه استخراج شده از URL */
  conversationId: string | null;
  /** شناسه پیام انکر شده */
  messageAnchor: string | null;
  /** پاک کردن انکر پیام */
  clearAnchor: () => void;
  /** ساخت لینک قابل اشتراک برای مکالمه */
  buildShareUrl: (conversationId: string, messageId?: string) => string;
  /** ساخت لینک قابل اشتراک برای پیام خاص */
  buildMessageUrl: (conversationId: string, messageId: string) => string;
} {
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const viewParams = useAppStore((s) => s.viewParams);
  const currentView = useAppStore((s) => s.currentView);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const messageAnchor = useAppStore((s) => s.messageAnchor);
  const setMessageAnchor = useAppStore((s) => s.setMessageAnchor);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);

  // رفرنس برای جلوگیری از اجرای مضاعف
  const hasInitialized = useRef(false);

  // پاک کردن انکر پیام
  const clearAnchor = useCallback(() => {
    setMessageAnchor(null);
  }, [setMessageAnchor]);

  // ساخت لینک اشتراک مکالمه
  const buildShareUrl = useCallback(
    (conversationId: string, messageId?: string): string => {
      let url = `${window.location.origin}${window.location.pathname}#/chat/${conversationId}`;
      if (messageId) {
        url += `?msg=${messageId}`;
      }
      return url;
    },
    []
  );

  // ساخت لینک پیام خاص
  const buildMessageUrl = useCallback(
    (conversationId: string, messageId: string): string => {
      return buildShareUrl(conversationId, messageId);
    },
    [buildShareUrl]
  );

  // گوش دادن به تغییرات هش URL برای deep linking
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;

      // تجزیه هش
      const cleanHash = hash.replace(/^#\/?/, '');
      const [pathPart, queryPart] = cleanHash.split('?');
      const query = new URLSearchParams(queryPart || '');
      const segments = pathPart.split('/').filter(Boolean);

      // بررسی مسیر چت
      if (segments[0] === 'chat' && segments[1]) {
        const convId = segments[1];
        const msgId = query.get('msg');

        // باز کردن مکالمه
        if (activeConversationId !== convId) {
          setActiveConversationId(convId);
        }

        // تنظیم انکر پیام در صورت وجود
        if (msgId) {
          setMessageAnchor(msgId);
        }
      }
    };

    // بررسی اولیه هش
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      handleHashChange();
    }

    // گوش دادن به تغییرات هش
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeConversationId, setActiveConversationId, setMessageAnchor]);

  // استخراج شناسه مکالمه از پارامترهای نما
  const conversationId = viewParams.conversationId || activeConversationId;

  return {
    conversationId,
    messageAnchor,
    clearAnchor,
    buildShareUrl,
    buildMessageUrl,
  };
}
