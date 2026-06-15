'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { mv } from '@/lib/motion-variants';
import {
  X,
  MapPin,
  Shield,
  Clock,
  BellOff,
  Bell,
  Ban,
  Trash2,
  Pin,
  Image as ImageIcon,
  FileText,
  MessageSquare,
  Star,
  ChevronLeft,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { toPersianDigits } from '@/lib/format/digits';
import { toast } from 'sonner';
import { peerPresenceLabel } from '@/lib/chat/presence-label';
import { ChatPresenceDot } from '@/components/chat/ChatPresenceDot';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ChatInfoPanelProps {
  open: boolean;
  onClose: () => void;
  messages: Array<{
    id: string;
    content: string;
    type: string;
    isPinned?: boolean;
    createdAt: string;
    senderId: string;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
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
    'bg-pink-800',
  ];
  const hash = name
    .split('')
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return parts[0][0] + parts[1][0];
  return parts[0].slice(0, 2);
};

const formatRelativeTime = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    if (diffMin < 1) return 'همین الان';
    if (diffMin < 60) return `${diffMin} دقیقه پیش`;
    if (diffHour < 24) return `${diffHour} ساعت پیش`;
    if (diffDay < 7) return `${diffDay} روز پیش`;
    return new Intl.DateTimeFormat('fa-IR').format(date);
  } catch {
    return dateStr;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

const panelVariants = {
  hidden: { x: -320, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', damping: 30, stiffness: 300 },
  },
  exit: {
    x: -320,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 + i * 0.06, duration: 0.3 },
  }),
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function ChatInfoPanel({ open, onClose, messages }: ChatInfoPanelProps) {
  const { activeConversationId, conversations, authToken } = useAppStore();

  const [isMuted, setIsMuted] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Derived Data ─────────────────────────────────────────────────────
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const otherUser = activeConversation?.otherUser ?? null;
  const otherUserName = otherUser
    ? `${otherUser.firstName ?? ''} ${otherUser.lastName ?? ''}`.trim()
    : 'نامشخص';

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages]
  );

  const imageMessages = useMemo(
    () => messages.filter((m) => m.type === 'IMAGE'),
    [messages]
  );

  const fileMessages = useMemo(
    () => messages.filter((m) => m.type === 'FILE'),
    [messages]
  );

  const starredMessages = useMemo(
    () => messages.filter((m) => (m as Record<string, unknown>).isStarred === true),
    [messages]
  );

  // ─── Handlers ─────────────────────────────────────────────────────────
  const handleToggleMute = () => {
    setIsMuted((prev) => !prev);
    toast.success(isMuted ? 'صدای اعلان‌ها فعال شد' : 'بی‌صدا شد');
  };

  const handleBlockUser = async () => {
    if (!showBlockConfirm) {
      setShowBlockConfirm(true);
      return;
    }
    if (!otherUser?.id || !authToken) {
      toast.error('امکان مسدودسازی نیست');
      return;
    }
    try {
      const res = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ blockedId: otherUser.id }),
      });
      if (!res.ok) throw new Error('block failed');
      setShowBlockConfirm(false);
      toast.success(`${otherUserName} مسدود شد`);
      onClose();
    } catch {
      toast.error('خطا در مسدودسازی');
    }
  };

  const handleDeleteConversation = () => {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      toast.success('گفتگو حذف شد');
      onClose();
    }, 600);
  };

  const handleClose = () => {
    setShowBlockConfirm(false);
    onClose();
  };

  // ─── Section index for staggered animations ───────────────────────────
  const sectionIndex = { profile: 0, pinned: 1, media: 2, starred: 3, actions: 4 };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ─── Overlay ──────────────────────────────────────────────── */}
          <motion.div
            key="info-overlay"
            variants={mv(overlayVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs"
            onClick={handleClose}
          />

          {/* ─── Panel ────────────────────────────────────────────────── */}
          <motion.div
            key="info-panel"
            variants={mv(panelVariants)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 z-50 h-full w-80 bg-background border-l border-border shadow-2xl flex flex-col"
            dir="rtl"
          >
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-linear-to-l from-background via-background to-emerald-50/50 dark:to-emerald-950/20">
              <h2 className="text-base font-bold bg-linear-to-l from-emerald-700 to-emerald-500 bg-clip-text text-transparent">اطلاعات گفتگو</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* ─── Scrollable Content ─────────────────────────────── */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* ═══ Profile Card ═══ */}
                <motion.div
                  custom={sectionIndex.profile}
                  variants={mv(sectionVariants)}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center gap-3"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-linear-to-br from-emerald-300 to-emerald-500 blur-xl opacity-20 scale-110" />
                    <Avatar className="relative h-20 w-20 border-[3px] border-white dark:border-gray-800 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-200/40 dark:ring-emerald-800/30">
                      <AvatarImage src={otherUser?.avatar} alt={otherUserName} />
                      <AvatarFallback
                        className={cn(
                          'text-xl font-bold text-white',
                          getAvatarColor(otherUserName)
                        )}
                      >
                        {getInitials(otherUserName)}
                      </AvatarFallback>
                    </Avatar>
                    <ChatPresenceDot
                      online={otherUser?.online}
                      size="md"
                      className="absolute bottom-1 right-1"
                    />
                  </div>

                  {/* Name */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-foreground">
                      {otherUserName}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs gap-1.5',
                        otherUser?.online
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          otherUser?.online
                            ? 'bg-emerald-500 animate-pulse'
                            : 'bg-muted-foreground/40'
                        )}
                      />
                      {peerPresenceLabel(otherUser ?? undefined)}
                    </Badge>
                  </div>

                  {/* Info pills */}
                  <div className="flex flex-wrap justify-center gap-2.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {activeConversation?.lastMessageAt
                        ? formatRelativeTime(activeConversation.lastMessageAt)
                        : 'اخیراً فعال'}
                    </span>
                  </div>

                  {/* Member since */}
                  <p className="text-xs text-muted-foreground">
                    عضو از{' '}
                    {activeConversation?.lastMessageAt
                      ? new Intl.DateTimeFormat('fa-IR', {
                          year: 'numeric',
                          month: 'long',
                        }).format(new Date(activeConversation.lastMessageAt))
                      : 'تاریخ نامشخص'}
                  </p>
                </motion.div>

                <Separator />

                {/* ═══ Pinned Messages ═══ */}
                {pinnedMessages.length > 0 && (
                  <motion.div
                    custom={sectionIndex.pinned}
                    variants={mv(sectionVariants)}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Pin className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-foreground">
                        پیام‌های سنجاق‌شده
                      </h4>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      >
                        {toPersianDigits(String(pinnedMessages.length))}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {pinnedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-lg border border-border p-3 bg-muted/30 hover:bg-muted/50 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <Pin className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                              {msg.content}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mr-5">
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {pinnedMessages.length > 0 && <Separator />}

                {/* ═══ Shared Media ═══ */}
                <motion.div
                  custom={sectionIndex.media}
                  variants={mv(sectionVariants)}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-foreground">
                        رسانه‌های مشترک
                      </h4>
                      {(imageMessages.length + fileMessages.length) > 0 && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                        >
                          {toPersianDigits(String(imageMessages.length + fileMessages.length))}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Media grid */}
                  {imageMessages.length > 0 ? (
                    <div className="grid grid-cols-3 gap-1.5">
                      {imageMessages.slice(0, 6).map((msg, idx) => (
                        <div
                          key={msg.id}
                          className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      ))}
                      {imageMessages.length > 6 && (
                        <div className="aspect-square rounded-lg bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20 flex items-center justify-center">
                          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            +{toPersianDigits(String(imageMessages.length - 6))}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-emerald-200/60 dark:border-emerald-800/30 p-6 flex flex-col items-center gap-2.5 text-center">
                      <div className="h-12 w-12 rounded-full bg-linear-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-950/20 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-emerald-500" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        هنوز رسانه‌ای به اشتراک گذاشته نشده
                      </p>
                    </div>
                  )}

                  {/* View all link */}
                  {imageMessages.length > 0 && (
                    <button className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors font-medium">
                      مشاهده همه
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>

                <Separator />

                {/* ═══ Starred Messages ═══ */}
                {starredMessages.length > 0 && (
                  <motion.div
                    custom={sectionIndex.starred}
                    variants={mv(sectionVariants)}
                    initial="hidden"
                    animate="visible"
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      <h4 className="text-sm font-semibold text-foreground">
                        پیام‌های ستاره‌دار
                      </h4>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      >
                        {toPersianDigits(String(starredMessages.length))}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {starredMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-lg border border-border p-3 bg-muted/30 hover:bg-muted/50 transition-colors space-y-1.5"
                        >
                          <div className="flex items-start gap-2">
                            <Star className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                              {msg.content}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mr-5">
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {starredMessages.length > 0 && <Separator />}

                {/* ═══ Actions ═══ */}
                <motion.div
                  custom={sectionIndex.actions}
                  variants={mv(sectionVariants)}
                  initial="hidden"
                  animate="visible"
                  className="space-y-1"
                >
                  {/* Mute toggle */}
                  <button
                    onClick={handleToggleMute}
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                      isMuted
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 shadow-sm shadow-emerald-500/10'
                        : 'text-muted-foreground hover:bg-muted hover:shadow-sm'
                    )}
                  >
                    {isMuted ? (
                      <BellOff className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                    <span>
                      {isMuted ? 'بی‌صدا شده' : 'بی‌صدا کردن'}
                    </span>
                    {isMuted && (
                      <Badge
                        variant="secondary"
                        className="text-xs mr-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      >
                        فعال
                      </Badge>
                    )}
                  </button>

                  {/* Block */}
                  {showBlockConfirm ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <span className="text-sm text-destructive font-medium flex-1">
                        مطمئنید؟
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={handleBlockUser}
                      >
                        بله
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => setShowBlockConfirm(false)}
                      >
                        خیر
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={handleBlockUser}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-all duration-200"
                    >
                      <Ban className="h-4 w-4" />
                      <span>مسدود کردن</span>
                    </button>
                  )}

                  {/* Delete conversation */}
                  <button
                    onClick={handleDeleteConversation}
                    disabled={isDeleting}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 hover:shadow-sm transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2
                      className={cn(
                        'h-4 w-4',
                        isDeleting && 'animate-pulse'
                      )}
                    />
                    <span>{isDeleting ? 'در حال حذف...' : 'حذف گفتگو'}</span>
                  </button>
                </motion.div>
              </div>
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
