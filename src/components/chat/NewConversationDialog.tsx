'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquarePlus,
  X,
  User,
  ArrowLeft,
  Sparkles,
  Loader2,
  MessageCircle,
  Check,
  ShieldCheck,
  Star,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fuzzyPersianIncludes } from '@/lib/persian-normalize';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectableUser {
  id: string;
  displayName: string;
  username?: string;
  role: string;
  online?: boolean;
  skills?: string[];
  rating?: number;
  isVerified?: boolean;
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
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

const slideUpVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 40,
    scale: 0.96,
    transition: { duration: 0.2 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const { conversations, setActiveConversationId, addOrUpdateConversation } =
    useAppStore();

  // ─── Local State ──────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<SelectableUser | null>(null);
  const [creating, setCreating] = useState(false);
  const [apiResults, setApiResults] = useState<SelectableUser[]>([]);
  const [isApiSearching, setIsApiSearching] = useState(false);

  // ─── Recent Contacts (from existing conversations) ────────────────────
  const recentContacts = useMemo<SelectableUser[]>(() => {
    const seen = new Set<string>();
    const contacts: SelectableUser[] = [];
    for (const conv of conversations) {
      if (!conv.otherUser) continue;
      if (seen.has(conv.otherUser.id)) continue;
      seen.add(conv.otherUser.id);
      contacts.push({
        id: conv.otherUser.id,
        displayName:
          `${conv.otherUser.firstName ?? ''} ${conv.otherUser.lastName ?? ''}`.trim(),
        role: 'کاربر',
        online: conv.otherUser.online,
      });
    }
    return contacts;
  }, [conversations]);

  // ─── Suggested Specialists (from API) ─────────────────────────────
  const suggestedSpecialists = useMemo<SelectableUser[]>(() => {
    // Combine recent contacts + apiResults for suggestions
    return [];
  }, []);

  // ─── Fetch users from API for search ─────────────────────────────────
  useEffect(() => {
    if (!open || !searchQuery.trim()) {
      setApiResults([]);
      return;
    }
    const trimmed = searchQuery.trim();
    if (trimmed.length < 1) {
      setApiResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
 setIsApiSearching(true);
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
        const res = await fetch(`/api/users?search=${encodeURIComponent(trimmed)}&limit=15`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        const mapped: SelectableUser[] = (json.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          displayName: (u.displayName as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          username: (u.username as string | null) ?? undefined,
          role: u.role === 'SPECIALIST' ? 'متخصص' : u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'مدیر' : 'کاربر',
          online: (u.online as boolean) || false,
          rating: (u.rating as number) || undefined,
          isVerified: (u.isVerified as boolean) || false,
        }));
        setApiResults(mapped);
      } catch {
        setApiResults([]);
      } finally {
        setIsApiSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, searchQuery]);

  // ─── Filtered Results (combine recent contacts + API results) ───────────
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim();
    const seen = new Set<string>();
    const results: SelectableUser[] = [];

    // Add recent contacts that match
    for (const c of recentContacts) {
      if (fuzzyPersianIncludes(c.displayName, q) || (c.username && fuzzyPersianIncludes(c.username, q))) {
        if (!seen.has(c.id)) { seen.add(c.id); results.push(c); }
      }
    }

    // Add API results (deduplicated)
    for (const u of apiResults) {
      if (!seen.has(u.id)) { seen.add(u.id); results.push(u); }
    }

    return results;
  }, [searchQuery, recentContacts, apiResults]);

  // ─── Load initial suggestions from API ──────────────────────────────
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
        const res = await fetch('/api/users?limit=8&sort=newest', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        const mapped: SelectableUser[] = (json.data || []).map((u: Record<string, unknown>) => ({
          id: u.id as string,
          displayName: (u.displayName as string) || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
          username: (u.username as string | null) ?? undefined,
          role: u.role === 'SPECIALIST' ? 'متخصص' : u.role === 'ADMIN' || u.role === 'SUPER_ADMIN' ? 'مدیر' : 'کاربر',
          online: (u.online as boolean) || false,
          rating: (u.rating as number) || undefined,
          isVerified: (u.isVerified as boolean) || false,
        }));
        setInitialSuggestions(mapped);
      } catch { /* ignore */ }
    })();
    return () => controller.abort();
  }, [open]);

  const [initialSuggestions, setInitialSuggestions] = useState<SelectableUser[]>([]);

  const isSearching = searchQuery.trim().length > 0;
  const handleClose = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        setSearchQuery('');
        setSelectedUser(null);
        setCreating(false);
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange]
  );

  // ─── Reset State on Close ─────────────────────────────────────────────
  // ─── Select User ──────────────────────────────────────────────────────
  const handleSelectUser = useCallback((user: SelectableUser) => {
    setSelectedUser(user);
    setSearchQuery('');
    setApiResults([]);
  }, []);

  // ─── Create Conversation ──────────────────────────────────────────────
  const handleCreateConversation = useCallback(async () => {
    if (!selectedUser || creating) return;

    setCreating(true);
    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('nf_auth_token')
          : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ otherUserId: selectedUser.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string }).error ?? 'خطا در ایجاد گفتگو'
        );
      }

      const data = (await res.json()) as {
        message: string;
        conversation: {
          id: string;
          requestId?: string;
          lastMessage?: string;
          lastMessageAt?: string;
          unreadCount: number;
          otherUser: {
            id: string;
            firstName: string;
            lastName: string;
            avatar?: string;
            online: boolean;
          };
          createdAt?: string;
        };
      };

      // Add conversation to store
      addOrUpdateConversation({
        id: data.conversation.id,
        requestId: data.conversation.requestId,
        lastMessage: data.conversation.lastMessage,
        lastMessageAt: data.conversation.lastMessageAt,
        unreadCount: data.conversation.unreadCount,
        otherUser: data.conversation.otherUser,
      });

      // Set active conversation
      setActiveConversationId(data.conversation.id);

      toast.success(
        data.message === 'این گفتگو قبلاً وجود دارد'
          ? 'گفتگو باز شد'
          : 'گفتگو با موفقیت ایجاد شد'
      );

      handleClose(false);
    } catch (err) {
      console.error('Error creating conversation:', err);
      toast.error(
        err instanceof Error ? err.message : 'خطا در ایجاد گفتگو'
      );
    } finally {
      setCreating(false);
    }
  }, [selectedUser, creating, addOrUpdateConversation, setActiveConversationId, handleClose]);

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[520px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden rounded-2xl border-border/50 backdrop-blur-xl bg-background/95"
      >
        {/* ─── Glass decorative elements ──────────────────────────────── */}
        <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <MessageSquarePlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                شروع گفتگوی جدید
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                کاربر یا متخصص مورد نظر خود را انتخاب کنید
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
        <ScrollArea className="flex-1 max-h-[calc(85vh-160px)] overflow-y-auto">
          <div className="px-5 py-4 space-y-5">
            {/* ─── Search Input ────────────────────────────────────────── */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUser(null);
                }}
                placeholder="جستجو با نام، آیدی (@)، شماره تلفن..."
                className="pr-10 pl-10 h-11 rounded-xl bg-muted/50 border-border/50 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all text-sm placeholder:text-muted-foreground/60"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedUser(null);
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 transition-colors"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* ─── Search Results ─────────────────────────────────────── */}
            {isSearching ? (
              <AnimatePresence mode="wait">
                {isApiSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                    <span className="mr-2 text-xs text-muted-foreground">در حال جستجو...</span>
                  </div>
                ) : filteredResults.length > 0 ? (
                  <motion.div
                    key="results"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="space-y-2"
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      نتایج جستجو ({filteredResults.length})
                    </p>
                    {filteredResults.map((user) => (
                      <motion.button
                        key={user.id}
                        variants={itemVariants}
                        onClick={() => handleSelectUser(user)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-start',
                          'hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-200 dark:hover:border-emerald-800',
                          'border-transparent bg-muted/30'
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <div
                            className={cn(
                              'h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold',
                              getAvatarColor(user.displayName)
                            )}
                          >
                            {getInitials(user.displayName)}
                          </div>
                          {user.online && (
                            <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-foreground truncate">
                              {user.displayName}
                            </span>
                            {user.username && (
                              <span className="text-[11px] text-muted-foreground">
                                @{user.username}
                              </span>
                            )}
                            {user.role === 'متخصص' && (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4 font-medium"
                            >
                              {user.role}
                            </Badge>
                            {user.rating && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-500">
                                <Star className="h-2.5 w-2.5 fill-amber-400" />
                                {user.rating}
                              </span>
                            )}
                            {user.skills && user.skills.length > 0 && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                {user.skills.slice(0, 2).join(' · ')}
                              </span>
                            )}
                          </div>
                        </div>

                        <ArrowLeft className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      </motion.button>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-search"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      نتیجه‌ای یافت نشد
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      عبارت دیگری را جستجو کنید
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            ) : (
              <>
              {recentContacts.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-foreground">
                        مخاطبین اخیر
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {recentContacts.length}
                      </Badge>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                      {recentContacts.map((contact, index) => (
                        <motion.button
                          key={contact.id}
                          initial={{ opacity: 0, scale: 0.85 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          onClick={() => handleSelectUser(contact)}
                          className="flex flex-col items-center gap-2 min-w-[72px] group"
                        >
                          <div className="relative">
                            <div
                              className={cn(
                                'h-14 w-14 rounded-full flex items-center justify-center text-white text-base font-bold',
                                'ring-2 ring-transparent group-hover:ring-emerald-300 dark:group-hover:ring-emerald-700',
                                'transition-all duration-200 group-hover:scale-105',
                                getAvatarColor(contact.displayName)
                              )}
                            >
                              {getInitials(contact.displayName)}
                            </div>
                            {contact.online && (
                              <span className="absolute bottom-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
                            )}
                          </div>
                          <span className="text-[11px] font-medium text-foreground truncate max-w-[72px] text-center leading-tight">
                            {contact.displayName.split(' ').slice(0, 2).join(' ')}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Suggested Users (from API) ─────────────────────────── */}
                {initialSuggestions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      <h3 className="text-sm font-bold text-foreground">
                        کاربران پیشنهادی
                      </h3>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {initialSuggestions.length}
                      </Badge>
                    </div>

                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                    >
                      {initialSuggestions.slice(0, 6).map((user) => (
                        <motion.div
                          key={user.id}
                          variants={itemVariants}
                          className="group relative flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all duration-200"
                        >
                          {/* Avatar */}
                          <div className="relative shrink-0 mt-0.5">
                            <div
n                              className={cn(
                                'h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold',
                                'group-hover:shadow-md transition-shadow',
                                getAvatarColor(user.displayName)
                              )}
                            >
                              {getInitials(user.displayName)}
                            </div>
                            {user.online && (
                              <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {user.displayName}
                              </span>
                              {user.isVerified && (
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            {user.username && (
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                @{user.username}
                              </p>
                            )}

                            {/* Rating + Action */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-medium">
                                  {user.role}
                                </Badge>
                                {user.rating && (
                                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    {user.rating}
                                  </span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px] px-2.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                                onClick={() => handleSelectUser(user)}
                              >
                                پیام
                                <ArrowLeft className="h-3 w-3 mr-1" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* ─── Selection Confirmation Card ────────────────────────────── */}
        <AnimatePresence>
          {selectedUser && (
            <motion.div
              key="selection-card"
              variants={slideUpVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="relative border-t border-border/50 bg-muted/30 backdrop-blur-lg"
            >
              {/* Gradient line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

              <div className="flex items-center gap-3 px-5 py-3">
                {/* Selected Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-white text-sm font-bold',
                      'ring-2 ring-emerald-400 dark:ring-emerald-600',
                      getAvatarColor(selectedUser.displayName)
                    )}
                  >
                    {getInitials(selectedUser.displayName)}
                  </div>
                  <div className="absolute -bottom-0.5 -left-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {selectedUser.displayName}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4"
                    >
                      {selectedUser.role}
                    </Badge>
                  </div>
                  {selectedUser.online && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                      آنلاین
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedUser(null)}
                  >
                    تغییر
                  </Button>
                  <Button
                    size="sm"
                    disabled={creating}
                    onClick={handleCreateConversation}
                    className="h-8 text-xs px-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 transition-all"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
                        در حال ایجاد...
                      </>
                    ) : (
                      <>
                        شروع گفتگو
                        <ArrowLeft className="h-3 w-3 mr-1.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
