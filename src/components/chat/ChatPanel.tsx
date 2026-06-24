'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { routeBuilder } from '@/config/routes';
import {
  buildChatContactShareContent,
  CHAT_CONTACT_SHARE_PREFIX,
} from '@/lib/chat/contact-share';
import { buildChatLocationShareContent } from '@/lib/chat/location-share';
import { extFromChatMime, fileTypeForVoiceUpload } from '@/lib/chat/attachment-mime';
import {
  MessageSquare,
  Search,
  ArrowRight,
  Plus,
  Reply,
  X,
  BadgeCheck,
  Loader2,
  Users,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  CircleUserRound,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';
import { ChatThread } from '@/components/chat/thread/ChatThread';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { canDeleteForEveryone } from '@/lib/chat/message-delete';
import { canEditChatMessage } from '@/lib/chat/message-edit';
import type { Message } from '@/lib/types';
import { ChatInfoPanel } from '@/components/chat/ChatInfoPanel';
import { ConversationNeedContextBanner } from '@/components/chat/ConversationNeedContextBanner';
import {
  ChatImageLightbox,
  type ChatGalleryImage,
} from '@/components/chat/ChatImageLightbox';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatLocationPickerDialog } from '@/components/chat/ChatLocationPickerDialog';
import { toVoiceCallPeer } from '@/lib/voice/voice-call-peer';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useChatTypingEmitter } from '@/hooks/useChatTypingEmitter';
import { ChatConversationList } from '@/components/chat/ChatConversationList';
import { ChatPresenceDot } from '@/components/chat/ChatPresenceDot';
import { useChatMessageScroll } from '@/hooks/useChatMessageScroll';
import { tryJoinConversation } from '@/lib/chat/socket-bridge';
import { useChatPollingFallback } from '@/hooks/useChatPollingFallback';
import { usePeerPresenceRefresh } from '@/hooks/usePeerPresenceRefresh';
import { markConversationRead } from '@/lib/chat/mark-conversation-read';
import { ChatPeerTyping, ChatTypingHeaderStatus } from '@/components/chat/ChatPeerTyping';
// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
};

const formatTime = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const raw = d.toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return toPersianDigits(raw);
  } catch {
    return '';
  }
};

// ─── User search result type ──────────────────────────────────────────────────

interface SearchedUser {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  username?: string;
  avatar?: string;
  isVerified?: boolean;
  online?: boolean;
  city?: string;
  bio?: string;
  role?: string;
}

type SidebarTab = 'messages' | 'calls';

interface VoiceCallUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatar?: string | null;
}

interface VoiceCallRecord {
  id: string;
  callerId: string;
  calleeId: string;
  conversationId: string | null;
  status: 'RINGING' | 'ACTIVE' | 'ENDED' | 'REJECTED' | 'MISSED';
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  caller: VoiceCallUser;
  callee: VoiceCallUser;
}

import {
  formatCallDuration,
  formatCallLogLabel,
} from '@/lib/voice/call-log-labels';
import { formatTimeAgo, peerPresenceLabel } from '@/lib/chat/presence-label';

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatPanel({ conversationId: initialConversationId }: { conversationId?: string } = {}) {
  const router = useRouter();
  const {
    isAuthenticated,
    currentUser,
    conversations,
    messages,
    activeConversationId,
    isLoading,
    authToken,
  } = useAppStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      currentUser: s.currentUser,
      conversations: s.conversations,
      messages: s.messages,
      activeConversationId: s.activeConversationId,
      isLoading: s.isLoading,
      authToken: s.authToken,
    }))
  );
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const fetchConversations = useAppStore((s) => s.fetchConversations);
  const fetchConversationMessages = useAppStore((s) => s.fetchConversationMessages);
  const sendMessage = useAppStore((s) => s.sendMessage);
  const sendPlatformAgentMessage = useAppStore((s) => s.sendPlatformAgentMessage);
  const reactToMessage = useAppStore((s) => s.reactToMessage);
  const deleteChatMessage = useAppStore((s) => s.deleteChatMessage);
  const editChatMessage = useAppStore((s) => s.editChatMessage);
  const pinChatMessage = useAppStore((s) => s.pinChatMessage);
  const setActiveConversationId = useAppStore((s) => s.setActiveConversationId);
  const addOrUpdateConversation = useAppStore((s) => s.addOrUpdateConversation);
  const openVoiceCall = useAppStore((s) => s.openVoiceCall);

  const { peerTyping } = useChatRealtime(activeConversationId);
  const { onDraftChange, stopTyping } = useChatTypingEmitter(activeConversationId);
  useChatPollingFallback(activeConversationId);
  usePeerPresenceRefresh(activeConversationId);

  const threadActive = Boolean(activeConversationId);

  useEffect(() => {
    if (activeConversationId) tryJoinConversation(activeConversationId);
  }, [activeConversationId]);

  // ── Local state ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [showMessages, setShowMessages] = useState(false);
  const [replyTo, setReplyTo] = useState<{ messageId: string; senderName: string; content: string } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    messageId: string;
    originalContent: string;
  } | null>(null);

  const handleMessageChange = useCallback(
    (value: string) => {
      setNewMessage(value);
      onDraftChange(value);
    },
    [onDraftChange]
  );

  const threadMessages = useMemo(
    () =>
      activeConversationId
        ? messages.filter((m) => m.conversationId === activeConversationId)
        : [],
    [messages, activeConversationId]
  );

  const pinnedMessage = useMemo(() => {
    const pinned = threadMessages.filter((m) => m.isPinned && !m.deletedAt);
    if (pinned.length === 0) return null;
    return pinned.reduce((latest, m) => {
      const latestAt = latest.pinnedAt ? Date.parse(latest.pinnedAt) : 0;
      const at = m.pinnedAt ? Date.parse(m.pinnedAt) : 0;
      return at >= latestAt ? m : latest;
    });
  }, [threadMessages]);

  const { endRef: messagesEndRef, scrollRootRef: messagesScrollRootRef, scrollToBottomForced } =
    useChatMessageScroll({
      conversationId: activeConversationId,
      messageCount: threadMessages.length,
      enabled: Boolean(activeConversationId && showMessages),
    });

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      setShowMessages(true);
    }
  }, [initialConversationId, setActiveConversationId]);

  useEffect(() => {
    setEditingMessage(null);
  }, [activeConversationId]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageAttachmentRef = useRef<HTMLInputElement>(null);
  const fileAttachmentRef = useRef<HTMLInputElement>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const [deleteConfirmMsgId, setDeleteConfirmMsgId] = useState<string | null>(null);

  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // ── New Chat / User Search state ────────────────────────────────────────
  const [showNewChat, setShowNewChat] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('messages');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [callHistory, setCallHistory] = useState<VoiceCallRecord[]>([]);
  const [callsLoading, setCallsLoading] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSearchInputRef = useRef<HTMLInputElement>(null);

  // ── Derived state ───────────────────────────────────────────────────────
  const selectedConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const otherUser = selectedConversation?.otherUser;

  // Stable peer descriptor for the thread — a fresh object here would defeat the
  // message-list memoization (it's one of its deps), re-rendering every bubble on
  // each composer keystroke.
  const threadPeer = useMemo(() => {
    if (!otherUser) return undefined;
    const name = `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim() || 'کاربر';
    return {
      name,
      avatarUrl: otherUser.avatar,
      initials: getInitials(name),
      avatarClassName: getAvatarColor(name),
    };
  }, [otherUser]);

  const filteredConversations = searchQuery.trim()
    ? conversations.filter((c) => {
        const name = `${c.otherUser?.firstName ?? ''} ${c.otherUser?.lastName ?? ''}`.trim();
        return name.includes(searchQuery) || (c.lastMessage?.includes(searchQuery) ?? false);
      })
    : conversations;

  const filteredCalls = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return callHistory;
    return callHistory.filter((call) => {
      const isOutgoing = call.callerId === currentUser?.id;
      const peer = isOutgoing ? call.callee : call.caller;
      const name =
        peer.displayName?.trim() ||
        `${peer.firstName ?? ''} ${peer.lastName ?? ''}`.trim() ||
        '';
      return name.includes(q);
    });
  }, [callHistory, searchQuery, currentUser?.id]);

  const galleryImages = useMemo((): ChatGalleryImage[] => {
    const otherName =
      `${otherUser?.firstName ?? ''} ${otherUser?.lastName ?? ''}`.trim() || 'کاربر';
    return messages
      .filter((m) => m.type === 'IMAGE')
      .map((m) => ({
        id: m.id,
        url: m.content.trim(),
        createdAt: m.createdAt,
        senderLabel: m.senderId === currentUser?.id ? 'شما' : otherName,
      }));
  }, [messages, currentUser?.id, otherUser]);

  const openImageLightbox = useCallback(
    (messageId: string) => {
      const idx = galleryImages.findIndex((g) => g.id === messageId);
      if (idx >= 0) setLightboxIndex(idx);
    },
    [galleryImages]
  );

  // ── Fetch call history ─────────────────────────────────────────────────
  const fetchCallHistory = useCallback(async () => {
    if (!authToken) return;
    setCallsLoading(true);
    try {
      const res = await fetch('/api/calls?limit=50', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        setCallHistory([]);
        return;
      }
      const data = await res.json();
      setCallHistory(Array.isArray(data.data) ? data.data : []);
    } catch {
      setCallHistory([]);
    } finally {
      setCallsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (sidebarTab === 'calls' && isAuthenticated && authToken) {
      void fetchCallHistory();
    }
  }, [sidebarTab, isAuthenticated, authToken, fetchCallHistory]);

  // ── Fetch conversations on mount ───────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && authToken) {
      fetchConversations();
    }
  }, [isAuthenticated, authToken, fetchConversations]);

  // ── Fetch messages when conversation changes ───────────────────────────
  useEffect(() => {
    if (activeConversationId && authToken) {
      fetchConversationMessages(activeConversationId);
      setLightboxIndex(null);
      void markConversationRead(activeConversationId);
    }
    return () => stopTyping();
  }, [activeConversationId, authToken, fetchConversationMessages, stopTyping]);

  // ── Debounced user search ──────────────────────────────────────────────
  useEffect(() => {
    if (!showNewChat) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = userSearchQuery.trim();

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const token = authToken;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(trimmedQuery)}`,
          { headers }
        );

        if (!res.ok) {
          setSearchResults([]);
          return;
        }

        const data = await res.json();
        const users: SearchedUser[] = (data.data ?? data.users ?? []).map((u: any) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: u.displayName,
          username: u.username,
          avatar: u.avatar,
          isVerified: u.isVerified,
          online: u.online,
          city: u.city,
          bio: u.bio,
          role: u.role,
        }));
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [userSearchQuery, showNewChat, authToken]);

  // ── Focus user search input when toggling ──────────────────────────────
  useEffect(() => {
    if (showNewChat) {
      requestAnimationFrame(() => {
        userSearchInputRef.current?.focus();
      });
    }
  }, [showNewChat]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Select conversation ────────────────────────────────────────────────
  const handleSelectConversation = useCallback(
    (convId: string) => {
      setActiveConversationId(convId);
      setShowMessages(true);
      setReplyTo(null);
      router.push(routeBuilder.chatConversation(convId));
      inputRef.current?.focus();
    },
    [setActiveConversationId, router]
  );

  // ── Create / select conversation from search result ─────────────────────
  const handleSelectSearchUser = useCallback(
    async (user: SearchedUser) => {
      if (isCreatingConversation) return;
      setIsCreatingConversation(true);

      try {
        const token = authToken;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ otherUserId: user.id }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'خطا در ایجاد گفتگو');
        }

        const data = await res.json();
        const conversation = data.conversation ?? data;

        // Add to store
        addOrUpdateConversation({
          id: conversation.id,
          requestId: conversation.requestId,
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt ? String(conversation.lastMessageAt) : undefined,
          unreadCount: conversation.unreadCount ?? 0,
          otherUser: {
            id: user.id,
            firstName: user.firstName ?? '',
            lastName: user.lastName ?? '',
            avatar: user.avatar ?? undefined,
            online: user.online ?? false,
          },
        });

        // Select it
        handleSelectConversation(conversation.id);
        setShowNewChat(false);
        setUserSearchQuery('');
        setSearchResults([]);
      } catch (err: any) {
        console.error('Error creating conversation:', err);
      } finally {
        setIsCreatingConversation(false);
      }
    },
    [authToken, isCreatingConversation, addOrUpdateConversation, handleSelectConversation]
  );

  // ── Toggle new chat panel ───────────────────────────────────────────────
  const handleToggleNewChat = useCallback(() => {
    setSidebarTab('messages');
    setShowNewChat((prev) => !prev);
    if (showNewChat) {
      setUserSearchQuery('');
      setSearchResults([]);
    }
  }, [showNewChat]);

  const handleSidebarTabChange = useCallback((tab: SidebarTab) => {
    setSidebarTab(tab);
    setShowNewChat(false);
    setUserSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleSelectCall = useCallback(
    (call: VoiceCallRecord) => {
      if (call.conversationId) {
        handleSelectConversation(call.conversationId);
        return;
      }
      const peerId = call.callerId === currentUser?.id ? call.calleeId : call.callerId;
      const existing = conversations.find((c) => c.otherUser?.id === peerId);
      if (existing) {
        handleSelectConversation(existing.id);
        return;
      }
      toast.message('گفتگویی با این کاربر یافت نشد', {
        description: 'از دکمه + برای شروع گفتگوی جدید استفاده کنید.',
      });
    },
    [conversations, currentUser?.id, handleSelectConversation]
  );

  const handleRedial = useCallback(
    (call: VoiceCallRecord, e: React.MouseEvent) => {
      e.stopPropagation();
      const isOutgoing = call.callerId === currentUser?.id;
      const peer = isOutgoing ? call.callee : call.caller;
      openVoiceCall(
        toVoiceCallPeer({
          id: peer.id,
          firstName: peer.firstName ?? '',
          lastName: peer.lastName ?? '',
          displayName: peer.displayName,
          avatar: peer.avatar,
        }),
        call.conversationId ?? undefined
      );
    },
    [currentUser?.id, openVoiceCall]
  );

  // ── Back to conversation list ──────────────────────────────────────────
  const handleBack = useCallback(() => {
    setShowMessages(false);
    setActiveConversationId(null);
    setReplyTo(null);
    setEditingMessage(null);
    router.push(routeBuilder.chat());
  }, [setActiveConversationId, router]);

  // ── Send message ───────────────────────────────────────────────────────
  const handleSendMessage = useCallback(() => {
    const text = newMessage.trim();
    if (!text || !activeConversationId || isSendingMessage || attachmentBusy) return;

    if (editingMessage) {
      if (text === editingMessage.originalContent.trim()) {
        setNewMessage('');
        setEditingMessage(null);
        inputRef.current?.focus();
        return;
      }

      const messageId = editingMessage.messageId;
      setIsSendingMessage(true);
      void (async () => {
        const success = await editChatMessage(messageId, text);
        if (success) {
          setNewMessage('');
          setEditingMessage(null);
          toast.success('پیام ویرایش شد');
        } else {
          toast.error('ویرایش پیام ناموفق بود');
        }
        setIsSendingMessage(false);
        inputRef.current?.focus();
      })();
      return;
    }

    const savedReply = replyTo;
    const convId = activeConversationId;
    const isPlatformBot = selectedConversation?.isPlatformBot === true;

    setNewMessage('');
    setReplyTo(null);
    stopTyping();
    setIsSendingMessage(true);

    void (async () => {
      const sendTimeout = window.setTimeout(() => {
        setIsSendingMessage(false);
      }, 30_000);

      try {
      if (isPlatformBot) {
        const result = await sendPlatformAgentMessage(convId, text, {
          replyToId: savedReply?.messageId,
          platformBotUserId: selectedConversation?.otherUser?.id,
        });

        if (!result.ok) {
          setNewMessage(text);
          if (savedReply) setReplyTo(savedReply);
          if (result.code === 'INSUFFICIENT_BALANCE') {
            toast.error('موجودی کیف پول کافی نیست', {
              description: 'برای استفاده از دستیار هوشمند، کیف پول خود را شارژ کنید.',
              action: {
                label: 'کیف پول',
                onClick: () => router.push(routeBuilder.dashboardTab('wallet')),
              },
            });
          } else {
            const errMsg = useAppStore.getState().error;
            toast.error(errMsg || 'پاسخ دستیار هوشمند دریافت نشد');
            useAppStore.getState().clearError();
          }
        }

        inputRef.current?.focus();
        scrollToBottomForced();
        return;
      }

      const success = await sendMessage(convId, text, 'TEXT', {
        replyToId: savedReply?.messageId,
      });

      if (!success) {
        setNewMessage(text);
        if (savedReply) setReplyTo(savedReply);
        const errMsg = useAppStore.getState().error;
        toast.error(errMsg || 'ارسال پیام ناموفق بود');
        useAppStore.getState().clearError();
      }

      inputRef.current?.focus();
      scrollToBottomForced();
      } finally {
        window.clearTimeout(sendTimeout);
        setIsSendingMessage(false);
      }
    })();
  }, [
    newMessage,
    editingMessage,
    replyTo,
    activeConversationId,
    isSendingMessage,
    attachmentBusy,
    sendMessage,
    sendPlatformAgentMessage,
    selectedConversation?.isPlatformBot,
    selectedConversation?.otherUser?.id,
    router,
    editChatMessage,
    stopTyping,
    scrollToBottomForced,
  ]);

  const uploadAndSendAttachment = useCallback(
    async (file: File, preferType: 'IMAGE' | 'FILE' | 'VOICE') => {
      if (!activeConversationId || !authToken) {
        toast.error('ابتدا وارد حساب شوید');
        return;
      }
      setAttachmentBusy(true);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch('/api/chat/attachment', {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: form,
        });
        const json = (await res.json().catch(() => ({}))) as { url?: string; mime?: string; error?: string };
        if (!res.ok) throw new Error(json.error || 'خطا در آپلود فایل');
        const url = json.url;
        if (!url) throw new Error('آدرس فایل نامعتبر است');
        const mime = json.mime || '';
        const messageType: 'IMAGE' | 'FILE' | 'VOICE' =
          preferType === 'VOICE'
            ? 'VOICE'
            : preferType === 'IMAGE' || mime.startsWith('image/')
              ? 'IMAGE'
              : 'FILE';
        setIsSendingMessage(true);
        let ok = false;
        try {
          ok = await sendMessage(activeConversationId, url, messageType);
        } finally {
          setIsSendingMessage(false);
        }
        if (!ok) {
          toast.error('ارسال پیام ناموفق بود');
          return;
        }
        toast.success(
          messageType === 'IMAGE'
            ? 'عکس ارسال شد'
            : messageType === 'VOICE'
              ? 'پیام صوتی ارسال شد'
              : 'فایل ارسال شد'
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در آپلود');
      } finally {
        setAttachmentBusy(false);
      }
    },
    [activeConversationId, authToken, sendMessage]
  );

  const handleSendFiles = useCallback(
    async (files: File[], caption: string) => {
      for (const file of files) {
        const preferType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
        await uploadAndSendAttachment(file, preferType);
      }
      if (caption.trim() && activeConversationId) {
        setIsSendingMessage(true);
        try {
          await sendMessage(activeConversationId, caption.trim(), 'TEXT', {
            replyToId: replyTo?.messageId,
          });
        } finally {
          setIsSendingMessage(false);
        }
      }
    },
    [uploadAndSendAttachment, activeConversationId, sendMessage, replyTo?.messageId]
  );

  const sendVoiceBlob = useCallback(
    async (blob: Blob) => {
      if (!activeConversationId || !authToken) {
        toast.error('ابتدا وارد حساب شوید');
        return;
      }
      const mime = fileTypeForVoiceUpload(blob);
      const ext = extFromChatMime(mime) || '.webm';
      const file = new File([blob], `voice-${Date.now()}${ext}`, { type: mime });
      await uploadAndSendAttachment(file, 'VOICE');
    },
    [activeConversationId, authToken, uploadAndSendAttachment]
  );

  const handleImageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) void uploadAndSendAttachment(file, 'IMAGE');
    },
    [uploadAndSendAttachment]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) void uploadAndSendAttachment(file, 'FILE');
    },
    [uploadAndSendAttachment]
  );

  const shareGeolocation = useCallback(() => {
    if (!activeConversationId) return;
    setLocationPickerOpen(true);
  }, [activeConversationId]);

  const sendSharedLocation = useCallback(
    async (coords: { lat: number; lng: number }) => {
      if (!activeConversationId) return;
      setIsSendingMessage(true);
      let ok = false;
      try {
        const content = buildChatLocationShareContent({
          v: 1,
          lat: coords.lat,
          lng: coords.lng,
        });
        ok = await sendMessage(activeConversationId, content, 'TEXT');
      } finally {
        setIsSendingMessage(false);
      }
      if (ok) {
        setLocationPickerOpen(false);
        toast.success('موقعیت ارسال شد');
      } else {
        toast.error('ارسال موقعیت ناموفق بود');
      }
    },
    [activeConversationId, sendMessage]
  );

  const locationPickerCity = currentUser?.city?.trim() || 'تهران';

  const shareMyContactCard = useCallback(async () => {
    if (!activeConversationId || !currentUser) {
      toast.error('ابتدا وارد حساب شوید');
      return;
    }
    const rawPhone = currentUser.phone?.trim();
    if (!rawPhone) {
      toast.error('در پروفایل شمارهٔ موبایل ثبت نشده است — از تنظیمات حساب آن را وارد کنید.');
      return;
    }
    const content = buildChatContactShareContent({
      v: 1,
      phone: rawPhone,
      avatar: currentUser.avatar ?? null,
    });
    setIsSendingMessage(true);
    let ok = false;
    try {
      ok = await sendMessage(activeConversationId, content, 'TEXT');
    } finally {
      setIsSendingMessage(false);
    }
    if (ok) toast.success('شمارهٔ تماس با کارت اشتراک گذاشته شد');
    else toast.error('ارسال ناموفق بود');
  }, [activeConversationId, currentUser, sendMessage]);

  // ─── Reply helper ────────────────────────────────────────────────────────
  const startReply = useCallback((msg: Message) => {
    setEditingMessage(null);
    const isMe = msg.senderId === currentUser?.id;
    setReplyTo({
      messageId: msg.id,
      senderName: isMe ? 'شما' : (otherUser ? `${otherUser.firstName} ${otherUser.lastName}`.trim() : 'ناشناس'),
      content:
        msg.type === 'VOICE'
          ? 'پیام صوتی'
          : msg.type === 'TEXT' &&
              typeof msg.content === 'string' &&
              msg.content.startsWith(CHAT_CONTACT_SHARE_PREFIX)
            ? 'اشتراک شمارهٔ تماس'
            : msg.type === 'IMAGE'
              ? 'عکس'
              : msg.content,
    });
    inputRef.current?.focus();
  }, [currentUser?.id, otherUser]);

  const startEdit = useCallback(
    (msg: Message) => {
      if (!canEditChatMessage(msg, currentUser?.id)) return;
      setReplyTo(null);
      setEditingMessage({ messageId: msg.id, originalContent: msg.content });
      setNewMessage(msg.content);
      inputRef.current?.focus();
    },
    [currentUser?.id]
  );

  const clearEdit = useCallback(() => {
    setEditingMessage(null);
    setNewMessage('');
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.querySelector(`[data-message-id="${messageId}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleReact = useCallback(
    async (messageId: string, emoji: string) => {
      const ok = await reactToMessage(messageId, emoji);
      if (!ok) toast.error('ثبت واکنش ناموفق بود');
    },
    [reactToMessage]
  );

  const handleDeleteForMe = useCallback(
    async (messageId: string) => {
      try {
        const ok = await deleteChatMessage(messageId, false);
        if (ok) toast.success('پیام به‌صورت یک‌طرفه حذف شد');
        else toast.error('حذف یک‌طرفه ناموفق بود');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'حذف یک‌طرفه ناموفق بود');
      }
    },
    [deleteChatMessage]
  );

  const handleDeleteForEveryone = useCallback(async () => {
    if (!deleteConfirmMsgId) return;
    const id = deleteConfirmMsgId;
    setDeleteConfirmMsgId(null);
    try {
      const ok = await deleteChatMessage(id, true);
      if (ok) toast.success('پیام به‌صورت دوطرفه حذف شد');
      else toast.error('حذف دوطرفه ناموفق بود');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف دوطرفه ناموفق بود');
    }
  }, [deleteChatMessage, deleteConfirmMsgId]);

  const handlePin = useCallback(
    async (messageId: string) => {
      const msg = threadMessages.find((m) => m.id === messageId);
      if (!msg || !activeConversationId) return;
      const unpin = Boolean(msg.isPinned);
      try {
        const ok = await pinChatMessage(messageId, activeConversationId, unpin);
        if (ok) {
          toast.success(unpin ? 'سنجاق برداشته شد' : 'پیام سنجاق شد');
        } else {
          toast.error('سنجاق پیام ناموفق بود');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'سنجاق پیام ناموفق بود');
      }
    },
    [threadMessages, activeConversationId, pinChatMessage]
  );

  const handleUnpinPinned = useCallback(() => {
    if (!pinnedMessage || !activeConversationId) return;
    void handlePin(pinnedMessage.id);
  }, [pinnedMessage, activeConversationId, handlePin]);

  // ─── Auth Guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-h3 font-semibold">دسترسی به پیام‌ها</h3>
            <p className="text-body-sm text-muted-foreground">
              برای مشاهده و ارسال پیام، ابتدا وارد حساب کاربری شوید
            </p>
          </div>
          <Button onClick={() => setAuthModalOpen(true)} className="mt-2">
            ورود / ثبت‌نام
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden max-md:rounded-none max-md:border-0 max-md:shadow-none md:rounded-xl md:border md:shadow-sm bg-background">
      {/* ── Conversation List ── */}
      <div
        className={cn(
          'flex w-full min-h-0 flex-col overflow-hidden border-l md:w-[min(380px,35vw)] md:max-w-[420px] md:border-l',
          activeConversationId && showMessages ? 'hidden md:flex' : 'flex'
        )}
        role="navigation"
        aria-label="لیست مکالمات"
      >
        {/* Header: بازگشت | پیام‌ها | تماس‌ها | + */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-lg"
            onClick={() => router.back()}
            aria-label="بازگشت"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <div
            className="flex flex-1 rounded-lg bg-muted/60 p-1"
            role="tablist"
            aria-label="بخش‌های گفتگو"
          >
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'messages' && !showNewChat}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-all',
                sidebarTab === 'messages' && !showNewChat
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => handleSidebarTabChange('messages')}
            >
              <MessageSquare className="h-4 w-4" />
              پیام‌ها
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'calls'}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-all',
                sidebarTab === 'calls'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => handleSidebarTabChange('calls')}
            >
              <Phone className="h-4 w-4" />
              تماس‌ها
            </button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-10 w-10 shrink-0 rounded-lg',
              showNewChat && 'bg-primary/10 text-primary hover:bg-primary/15'
            )}
            aria-label={showNewChat ? 'بازگشت به لیست' : 'مکالمه جدید'}
            title={showNewChat ? 'بازگشت به لیست' : 'جستجوی کاربر و مکالمه جدید'}
            onClick={handleToggleNewChat}
          >
            {showNewChat ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Search */}
        <div className="p-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {showNewChat ? (
              <Input
                ref={userSearchInputRef}
                placeholder="جستجوی کاربر (نام، آیدی، شماره...)"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="h-10 pr-9 text-sm"
                aria-label="جستجوی کاربر"
              />
            ) : (
              <Input
                placeholder={
                  sidebarTab === 'calls' ? 'جستجو در تماس‌ها...' : 'جستجوی مکالمه...'
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pr-9 text-sm"
                aria-label={sidebarTab === 'calls' ? 'جستجوی تماس' : 'جستجوی مکالمه'}
              />
            )}
          </div>
        </div>

        {/* Content area */}
        {showNewChat ? (
          /* ── User Search Results ── */
          <ScrollArea className="min-h-0 flex-1" role="list" aria-label="نتایج جستجوی کاربر">
            <div className="space-y-0.5 p-2">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="mr-2 text-sm text-muted-foreground">در حال جستجو...</span>
                </div>
              )}

              {!isSearching && userSearchQuery.trim() === '' && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">نام، آیدی یا شماره کاربر را جستجو کنید</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    مثال: @sasan_rashidi یا ساسان رشیدی
                  </p>
                </div>
              )}

              {!isSearching && userSearchQuery.trim() !== '' && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">کاربری یافت نشد</p>
                </div>
              )}

              {!isSearching &&
                searchResults.map((user) => {
                  const name =
                    (user.displayName ??
                    `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()) ||
                    'کاربر';
                  const avatarColor = getAvatarColor(name);
                  const initials = getInitials(name);

                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectSearchUser(user)}
                      disabled={isCreatingConversation}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg p-3 text-right transition-all duration-150',
                        'hover:bg-muted/50 border border-transparent',
                        'disabled:opacity-60 disabled:cursor-wait'
                      )}
                      role="listitem"
                      aria-label={`شروع مکالمه با ${name}`}
                    >
                      <div className="relative shrink-0">
                        <div
                          className={cn(
                            'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white',
                            avatarColor
                          )}
                        >
                          {initials}
                        </div>
                        <ChatPresenceDot
                          online={user.online}
                          className="absolute bottom-0 left-0"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold">{name}</span>
                          {user.isVerified && (
                            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {user.username && (
                            <p className="truncate text-xs text-muted-foreground">
                              @{user.username}
                            </p>
                          )}
                          {user.role && user.role !== 'CLIENT' && (
                            <Badge variant="secondary" className="text-caption px-1 py-0 h-3.5">
                              {user.role === 'SPECIALIST' ? 'کسب‌وکار' : user.role === 'ADMIN' ? 'مدیر' : user.role}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isCreatingConversation ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                      ) : (
                        user.online && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-emerald-300 text-emerald-600 dark:text-emerald-400 text-caption px-1.5 py-0 h-5"
                          >
                            آنلاین
                          </Badge>
                        )
                      )}
                    </button>
                  );
                })}
            </div>
          </ScrollArea>
        ) : sidebarTab === 'calls' ? (
          <ScrollArea className="min-h-0 flex-1" role="list" aria-label="تاریخچه تماس‌ها">
            {callsLoading && callHistory.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <Phone className="mb-3 h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'تماسی یافت نشد' : 'هنوز تماسی ثبت نشده'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/60">
                  تماس‌های صوتی درون‌سایت اینجا نمایش داده می‌شوند
                </p>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {filteredCalls.map((call) => {
                  const isOutgoing = call.callerId === currentUser?.id;
                  const peer = isOutgoing ? call.callee : call.caller;
                  const name =
                    peer.displayName?.trim() ||
                    `${peer.firstName ?? ''} ${peer.lastName ?? ''}`.trim() ||
                    'کاربر';
                  const isMissed = call.status === 'MISSED' || call.status === 'REJECTED';
                  const CallIcon = isMissed
                    ? PhoneMissed
                    : isOutgoing
                      ? PhoneOutgoing
                      : PhoneIncoming;
                  const statusLabel =
                    call.status === 'RINGING'
                      ? 'در حال زنگ'
                      : call.status === 'ACTIVE'
                        ? 'در جریان'
                        : formatCallLogLabel(
                            call.status === 'ENDED'
                              ? 'ENDED'
                              : call.status === 'REJECTED'
                                ? 'REJECTED'
                                : 'MISSED',
                            isOutgoing,
                            call.durationSec
                          );

                  return (
                    <div
                      key={call.id}
                      role="listitem"
                      className={cn(
                        'flex w-full items-center gap-1 rounded-lg border border-transparent p-1',
                        'hover:bg-muted/50 transition-all duration-150'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectCall(call)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-right"
                        aria-label={`تماس با ${name}`}
                      >
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white',
                              getAvatarColor(name)
                            )}
                          >
                            {getInitials(name)}
                          </div>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-background',
                              isMissed ? 'bg-rose-500 text-white' : 'bg-primary/90 text-primary-foreground'
                            )}
                          >
                            <CallIcon className="h-2.5 w-2.5" />
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold">{name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatTimeAgo(call.startedAt)}
                            </span>
                          </div>
                          <p
                            className={cn(
                              'mt-0.5 truncate text-xs text-right',
                              isMissed ? 'text-rose-500' : 'text-muted-foreground'
                            )}
                          >
                            {statusLabel}
                          </p>
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label={`تماس مجدد با ${name}`}
                        title="تماس مجدد"
                        onClick={(e) => handleRedial(call, e)}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        ) : (
          <ChatConversationList
            enabled={Boolean(isAuthenticated && authToken)}
            isLoading={isLoading}
            searchQuery={searchQuery}
            conversations={filteredConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onStartNewChat={handleToggleNewChat}
            getAvatarColor={getAvatarColor}
            getInitials={getInitials}
            formatTimeAgo={formatTimeAgo}
          />
        )}
      </div>

      {/* ── Message Area ── */}
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          threadActive
            ? showMessages
              ? 'flex'
              : 'hidden md:flex'
            : 'hidden md:flex'
        )}
      >
        {threadActive ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 md:hidden"
                onClick={handleBack}
                aria-label="بازگشت"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="relative">
                {otherUser?.avatar ? (
                  <div
                    className="h-10 w-10 rounded-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${otherUser.avatar})` }}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white',
                      getAvatarColor(
                        otherUser
                          ? `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim() || 'کاربر'
                          : 'کاربر'
                      )
                    )}
                  >
                    {otherUser ? (
                      getInitials(
                        `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim() || 'کاربر'
                      )
                    ) : (
                      <Loader2 className="size-4 animate-spin text-white/90" aria-hidden />
                    )}
                  </div>
                )}
                {otherUser ? (
                  <ChatPresenceDot
                    online={otherUser.online}
                    className="absolute bottom-0 left-0"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate">
                  {otherUser
                    ? `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim() || 'کاربر'
                    : 'در حال بارگذاری…'}
                </h3>
                {peerTyping.isTyping ? (
                  <ChatTypingHeaderStatus visible />
                ) : selectedConversation?.businessContext ? (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedConversation.businessContext.contactLabel} ·{' '}
                    {selectedConversation.businessContext.businessName}
                  </p>
                ) : otherUser ? (
                  <p
                    className={cn(
                      'text-xs transition-colors',
                      otherUser.online
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground'
                    )}
                  >
                    {peerPresenceLabel(otherUser)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">گفتگو</p>
                )}
              </div>
              {/* Call button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-9 md:min-w-9"
                aria-label="اطلاعات گفتگو"
                title="جزئیات تماس و پروفایل"
                onClick={() => setInfoPanelOpen(true)}
              >
                <CircleUserRound className="h-4 w-4" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 min-h-[44px] min-w-[44px] md:min-h-9 md:min-w-9"
                aria-label="تماس"
                title="تماس صوتی"
                onClick={() => {
                  if (!otherUser) return;
                  openVoiceCall(
                    toVoiceCallPeer(otherUser),
                    activeConversationId ?? undefined
                  );
                }}
                disabled={!otherUser}
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>

            <ChatInfoPanel
              open={infoPanelOpen}
              onClose={() => setInfoPanelOpen(false)}
              messages={threadMessages.map((m) => ({
                id: m.id,
                content:
                  m.type === 'NEED_CARD'
                    ? 'نیاز'
                    : m.type === 'OFFER_CARD'
                      ? 'محصول'
                      : m.type === 'IMAGE'
                      ? '[تصویر]'
                      : m.type === 'FILE'
                        ? '[فایل]'
                        : m.type === 'TEXT' &&
                            typeof m.content === 'string' &&
                            m.content.startsWith(CHAT_CONTACT_SHARE_PREFIX)
                          ? 'شمارهٔ تماس'
                          : m.content,
                type: m.type,
                senderId: m.senderId,
                createdAt: m.createdAt,
              }))}
            />

            <ChatThread
              scrollRootRef={messagesScrollRootRef}
              messagesEndRef={messagesEndRef}
              pinnedMessage={pinnedMessage}
              onUnpinPinned={handleUnpinPinned}
              messages={threadMessages}
              peer={threadPeer}
              currentUserId={currentUser?.id}
              isLoading={isLoading}
              formatTime={formatTime}
              canDeleteForEveryone={canDeleteForEveryone}
              onReply={startReply}
              onEdit={startEdit}
              onReact={handleReact}
              onDeleteForMe={handleDeleteForMe}
              onDeleteForEveryoneRequest={setDeleteConfirmMsgId}
              onPin={handlePin}
              onScrollToMessage={scrollToMessage}
              onImageOpen={openImageLightbox}
              peerTyping={{
                isTyping: peerTyping.isTyping,
                displayName:
                  peerTyping.displayName ??
                  (otherUser
                    ? `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim()
                    : undefined),
              }}
              needBanner={
                selectedConversation?.requestId ? (
                  <ConversationNeedContextBanner
                    requestId={selectedConversation.requestId}
                    embedded
                  />
                ) : null
              }
            />

            <input
              ref={imageAttachmentRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageInputChange}
            />
            <input
              ref={fileAttachmentRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf"
              onChange={handleFileInputChange}
            />

            <ChatComposer
              key={activeConversationId ?? 'no-conv'}
              textareaRef={inputRef}
              message={newMessage}
              onMessageChange={handleMessageChange}
              onSendText={handleSendMessage}
              onSendVoice={sendVoiceBlob}
              isSending={isSendingMessage}
              attachmentBusy={attachmentBusy}
              replyTo={
                replyTo
                  ? { senderName: replyTo.senderName, content: replyTo.content }
                  : null
              }
              onClearReply={() => setReplyTo(null)}
              editing={
                editingMessage
                  ? { preview: editingMessage.originalContent }
                  : null
              }
              onClearEdit={clearEdit}
              onPickImage={() => imageAttachmentRef.current?.click()}
              onPickFile={() => fileAttachmentRef.current?.click()}
              onSendFiles={handleSendFiles}
              onShareLocation={shareGeolocation}
              onShareContact={() => void shareMyContactCard()}
            />

            {lightboxIndex !== null && galleryImages.length > 0 && (
              <ChatImageLightbox
                images={galleryImages}
                index={lightboxIndex}
                onIndexChange={setLightboxIndex}
                onClose={() => setLightboxIndex(null)}
              />
            )}
          </>
        ) : (
          /* Empty state — desktop only (mobile shows conversation list) */
          <div className="hidden h-full items-center justify-center p-6 md:flex">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">یک گفتگو انتخاب کنید</h3>
                <p className="text-sm text-muted-foreground max-w-[250px]">
                  از لیست کنار صفحه یک مکالمه را انتخاب کنید یا گفتگوی جدید شروع کنید
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleToggleNewChat}
                className="mt-2"
              >
                <Plus className="h-4 w-4 ml-1" />
                گفتگوی جدید
              </Button>
            </div>
          </div>
        )}
      </div>
      <ChatLocationPickerDialog
        open={locationPickerOpen}
        onOpenChange={setLocationPickerOpen}
        city={locationPickerCity}
        onConfirm={sendSharedLocation}
        busy={isSendingMessage}
      />
      <AlertDialog
        open={Boolean(deleteConfirmMsgId)}
        onOpenChange={(open) => !open && setDeleteConfirmMsgId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف دوطرفه؟</AlertDialogTitle>
            <AlertDialogDescription>
              این پیام برای هر دو طرف با متن «این پیام حذف شد» جایگزین می‌شود. فقط تا ۴۸ ساعت پس
              از ارسال امکان‌پذیر است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDeleteForEveryone()}
            >
              حذف دوطرفه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
