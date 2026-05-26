'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Forward,
  Search,
  MessageSquare,
  X,
  ArrowLeft,
  Quote,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { useChatSocket } from '@/lib/chat-socket';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: {
    id: string;
    content: string;
    type: string;
    senderId: string;
  } | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-pink-500',
  ];
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: 16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ForwardMessageDialog({
  open,
  onOpenChange,
  message,
}: ForwardMessageDialogProps) {
  const { conversations } = useAppStore();
  const { sendMessage } = useChatSocket();

  // ─── Local State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [forwarding, setForwarding] = useState<string | null>(null); // conversationId being forwarded to

  // ─── Reset State on Close ─────────────────────────────────────────────
  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSearchQuery('');
        setForwarding(null);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  // ─── Filtered Conversations ──────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (!conv.otherUser) return false;
      const displayName = `${conv.otherUser.firstName ?? ''} ${conv.otherUser.lastName ?? ''}`.trim().toLowerCase();
      return !q || displayName.includes(q);
    });
  }, [conversations, searchQuery]);

  // ─── Handle Forward ──────────────────────────────────────────────────
  const handleForward = useCallback(
    (conversationId: string) => {
      if (!message || forwarding) return;

      setForwarding(conversationId);

      const success = sendMessage(conversationId, message.content, message.type);

      if (success) {
        toast.success('پیام با موفقیت منتقل شد');
        handleClose(false);
      } else {
        toast.error('خطا در انتقال پیام. لطفاً دوباره تلاش کنید.');
        setForwarding(null);
      }
    },
    [message, forwarding, sendMessage, handleClose]
  );

  // ─── Message Type Label ──────────────────────────────────────────────
  const getMessageTypeLabel = (type: string) => {
    switch (type) {
      case 'TEXT':
        return 'متن';
      case 'IMAGE':
        return 'تصویر';
      case 'FILE':
        return 'فایل';
      case 'VOICE':
        return 'صوتی';
      case 'VIDEO':
        return 'ویدیو';
      default:
        return type;
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[480px] max-h-[80vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border-border/50 backdrop-blur-xl bg-background/95"
      >
        {/* ─── Glass decorative elements ──────────────────────────────── */}
        <div className="absolute top-0 left-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Forward className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                انتقال پیام
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                گفتگوی مقصد را برای انتقال انتخاب کنید
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-muted transition-colors"
            onClick={() => handleClose(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* ─── Body (scrollable) ─────────────────────────────────────── */}
        <ScrollArea className="flex-1 max-h-[calc(80vh-140px)] overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            {/* ─── Message Preview Card ────────────────────────────────── */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="relative rounded-xl border border-border/50 bg-muted/50 p-3.5"
              >
                {/* Gradient accent line */}
                <div className="absolute top-0 right-3 w-8 h-0.5 rounded-full bg-gradient-to-l from-emerald-400 to-emerald-600" />

                <div className="flex items-start gap-3">
                  {/* Quote icon */}
                  <div className="shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Quote className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge
                        variant="secondary"
                        className="text-caption px-1.5 py-0 h-4 font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        {getMessageTypeLabel(message.type)}
                      </Badge>
                      <span className="text-caption text-muted-foreground">
                        پیام منتقل‌شده
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ─── Search Input ────────────────────────────────────────── */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی مخاطب..."
                className="pr-10 pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all text-sm placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* ─── Conversation List ──────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {filteredConversations.length > 0 ? (
                <motion.div
                  key="list"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground">
                      گفتگوها ({filteredConversations.length})
                    </p>
                  </div>

                  {filteredConversations.map((conv) => {
                    const displayName =
                      `${conv.otherUser?.firstName ?? ''} ${conv.otherUser?.lastName ?? ''}`.trim();
                    const isForwarding = forwarding === conv.id;

                    return (
                      <motion.button
                        key={conv.id}
                        variants={itemVariants}
                        onClick={() => handleForward(conv.id)}
                        disabled={!!forwarding}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-start group',
                          'border-transparent bg-muted/30',
                          'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                          isForwarding && 'ring-2 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20'
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              'h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold',
                              'group-hover:shadow-md transition-shadow',
                              getAvatarColor(displayName)
                            )}
                          >
                            {getInitials(displayName)}
                          </div>
                          {conv.otherUser?.online && (
                            <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                          )}
                          {isForwarding && (
                            <span className="absolute inset-0 rounded-full border-2 border-emerald-500 animate-ping" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {displayName}
                            </span>
                            {isForwarding && (
                              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {conv.lastMessage}
                            </p>
                          )}
                        </div>

                        {/* Unread Badge + Arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          {conv.unreadCount > 0 && (
                            <Badge className="text-caption px-1.5 py-0 h-4 min-w-[20px] justify-center bg-emerald-600 text-white border-0">
                              {conv.unreadCount}
                            </Badge>
                          )}
                          <ArrowLeft className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-500 group-hover:-translate-x-0.5 transition-all" />
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex flex-col items-center justify-center py-10 text-center"
                >
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <MessageSquare className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {searchQuery ? 'گفتگویی یافت نشد' : 'گفتگویی موجود نیست'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {searchQuery
                      ? 'عبارت دیگری را جستجو کنید'
                      : 'ابتدا یک گفتگو ایجاد کنید'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
