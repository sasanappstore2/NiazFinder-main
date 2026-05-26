'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';

export function useChatUrl(): {
  conversationId: string | null;
  messageAnchor: string | null;
  clearAnchor: () => void;
  buildShareUrl: (conversationId: string, messageId?: string) => string;
  buildMessageUrl: (conversationId: string, messageId: string) => string;
} {
  const params = useParams();
  const pathname = usePathname();
  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const hasInitialized = useRef(false);
  const messageAnchor: string | null = null;

  const clearAnchor = useCallback(() => {}, []);

  const buildShareUrl = useCallback((conversationId: string, messageId?: string): string => {
    let url = `${typeof window !== 'undefined' ? window.location.origin : ''}/chat/${conversationId}`;
    if (messageId) url += `?msg=${messageId}`;
    return url;
  }, []);

  const buildMessageUrl = useCallback(
    (conversationId: string, messageId: string) => buildShareUrl(conversationId, messageId),
    [buildShareUrl]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      const cleanHash = hash.replace(/^#\/?/, '');
      const [pathPart, queryPart] = cleanHash.split('?');
      const query = new URLSearchParams(queryPart || '');
      const segments = pathPart.split('/').filter(Boolean);

      if (segments[0] === 'chat' && segments[1]) {
        const convId = segments[1];
        if (activeConversationId !== convId) {
          setActiveConversationId(convId);
        }
        void query.get('msg');
      }
    };

    if (!hasInitialized.current) {
      hasInitialized.current = true;
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeConversationId, setActiveConversationId]);

  const routeConversationId =
    typeof params?.conversationId === 'string' ? params.conversationId : null;
  const conversationId =
    routeConversationId ??
    (pathname.startsWith('/chat/') ? pathname.split('/')[2] ?? null : null) ??
    activeConversationId;

  return {
    conversationId,
    messageAnchor,
    clearAnchor,
    buildShareUrl,
    buildMessageUrl,
  };
}
