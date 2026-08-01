'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Heart,
  MessageCircle,
  Share2,
  Plus,
  RefreshCw,
  Loader2,
  Send,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { useInfiniteFeed, useLikePost } from '@/hooks/use-social';
import type { Post } from '@/lib/types';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────
interface PostUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  avatar?: string;
  username?: string;
}

// ─── Animation variants ─────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ─── Color helpers ──────────────────────────────────────
const AVATAR_SOLID = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
];

function getAvatarSolid(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_SOLID[hash % AVATAR_SOLID.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
}

// ─── Persian relative time ──────────────────────────────
function getTimeAgo(dateInput: string | Date): string {
  try {
    const now = new Date();
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);

    if (diffSec < 60) return 'لحظاتی پیش';
    if (diffMin < 60) return `${diffMin.toLocaleString('fa-IR')} دقیقه پیش`;
    if (diffHour < 24) return `${diffHour.toLocaleString('fa-IR')} ساعت پیش`;
    if (diffDay < 7) return `${diffDay.toLocaleString('fa-IR')} روز پیش`;
    if (diffWeek < 4) return `${diffWeek.toLocaleString('fa-IR')} هفته پیش`;
    if (diffMonth < 12) return `${diffMonth.toLocaleString('fa-IR')} ماه پیش`;
    return date.toLocaleDateString('fa-IR');
  } catch {
    return String(dateInput);
  }
}

// ─── Skeleton Loader ────────────────────────────────────
function PostCardSkeleton() {
  return (
    <Card className="border-border/60 bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="animate-shimmer-loading size-11 rounded-xl bg-muted/40" />
          <div className="flex-1 space-y-2">
            <div className="animate-shimmer-loading h-4 w-32 rounded-md bg-muted/40" />
            <div className="animate-shimmer-loading h-3 w-24 rounded-md bg-muted/30" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="animate-shimmer-loading h-4 w-full rounded-md bg-muted/30" />
          <div className="animate-shimmer-loading h-4 w-3/4 rounded-md bg-muted/30" />
        </div>
        <div className="animate-shimmer-loading h-40 w-full rounded-xl bg-muted/30 mb-4" />
        <div className="flex items-center gap-4">
          <div className="animate-shimmer-loading h-8 w-20 rounded-lg bg-muted/30" />
          <div className="animate-shimmer-loading h-8 w-20 rounded-lg bg-muted/30" />
          <div className="animate-shimmer-loading h-8 w-20 rounded-lg bg-muted/30" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Heart animation component ──────────────────────────
function LikeButton({
  isLiked,
  count,
  onToggle,
}: {
  isLiked: boolean;
  count: number;
  onToggle: () => void;
}) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    onToggle();
    setTimeout(() => setAnimating(false), 600);
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/20"
    >
      <motion.span
        animate={
          animating
            ? { scale: [1, 1.4, 0.9, 1.2, 1], rotate: [0, -10, 10, -5, 0] }
            : { scale: 1 }
        }
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      >
        <Heart
          className={`size-5 transition-colors ${
            isLiked
              ? 'fill-rose-500 text-rose-500'
              : 'text-muted-foreground hover:text-rose-400'
          }`}
        />
      </motion.span>
      <span
        className={`text-sm font-medium tabular-nums ${
          isLiked ? 'text-rose-500' : 'text-muted-foreground'
        }`}
      >
        {count > 0 ? count.toLocaleString('fa-IR') : ''}
      </span>
    </button>
  );
}

// ─── Post Card ──────────────────────────────────────────
function PostCard({
  post,
  onLike,
  onNavigateToDetail,
  onNavigateToProfile,
}: {
  post: Post;
  onLike: (postId: string) => void;
  onNavigateToDetail: (postId: string) => void;
  onNavigateToProfile: (userId: string) => void;
}) {
  const displayName =
    post.user.displayName ||
    `${post.user.firstName} ${post.user.lastName}`;
  const initials = getInitials(displayName);
  const avatarColor = getAvatarSolid(displayName);

  let imageUrls: string[] = [];
  if (post.imageUrls) {
    try {
      const parsed = typeof post.imageUrls === 'string' ? JSON.parse(post.imageUrls) : post.imageUrls;
      if (Array.isArray(parsed)) imageUrls = parsed;
    } catch {
      // ignore parse errors
    }
  }

  const handleShare = async () => {
    const shareText = `پست از ${displayName} در نیاز فایندر`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('لینک پست کپی شد');
    } catch {
      toast.error('خطا در کپی لینک');
    }
  };

  return (
    <Card className="border-border/60 bg-card transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm">
      <CardContent className="p-4 sm:p-5">
        {/* Author header */}
        <div className="mb-3 flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToProfile(post.user.id);
            }}
            className="shrink-0"
          >
            <Avatar className="size-11 rounded-xl">
              <AvatarFallback
                className={`${avatarColor} rounded-xl text-white font-bold text-sm`}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          <div className="min-w-0 flex-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToProfile(post.user.id);
              }}
              className="block text-sm font-bold truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              {displayName}
            </button>
            <p className="text-xs text-muted-foreground">
              @{post.user.username || 'کاربر'}
              {' · '}
              {getTimeAgo(post.createdAt)}
            </p>
          </div>
        </div>

        {/* Post content */}
        <button
          onClick={() => onNavigateToDetail(post.id)}
          className="block w-full text-right"
        >
          <p className="mb-3 text-sm leading-7 text-foreground/90 whitespace-pre-wrap wrap-break-word">
            {post.content}
          </p>

          {/* Images */}
          {imageUrls.length > 0 && (
            <div
              className={`mb-3 grid gap-2 rounded-xl overflow-hidden ${
                imageUrls.length === 1
                  ? 'grid-cols-1'
                  : imageUrls.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-2'
              }`}
            >
              {imageUrls.slice(0, 4).map((url, i) => (
                <div
                  key={i}
                  className={`relative overflow-hidden bg-muted/30 ${
                    imageUrls.length === 3 && i === 0 ? 'row-span-2 min-h-48' : 'min-h-32'
                  } ${imageUrls.length > 4 && i === 3 ? 'relative' : ''}`}
                >
                  <img
                    src={url}
                    alt={`تصویر ${i + 1}`}
                    className="size-full object-cover transition-transform duration-300 hover:scale-105"
                    loading="lazy"
                  />
                  {imageUrls.length > 4 && i === 3 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs">
                      <span className="text-lg font-bold text-white">
                        +{(imageUrls.length - 4).toLocaleString('fa-IR')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </button>

        <Separator className="bg-border/40 my-2" />

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <LikeButton
              isLiked={post.isLiked ?? false}
              count={post.likeCount ?? 0}
              onToggle={() => onLike(post.id)}
            />
            <button
              onClick={() => onNavigateToDetail(post.id)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <MessageCircle className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {(post.commentCount ?? 0) > 0
                  ? (post.commentCount ?? 0).toLocaleString('fa-IR')
                  : ''}
              </span>
            </button>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <Share2 className="size-5 text-muted-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────
export function SocialFeedPage() {
  const { push } = useAppRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const parentRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // ── Infinite query ────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteFeed(20);

  // Flatten all pages into a single posts array
  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  // ── Virtualizer ───────────────────────────────────────
  const rowVirtualizer = useVirtualizer({
    count: posts.length + (hasNextPage ? 1 : 0), // +1 for the sentinel
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 5,
  });

  // ── Infinite scroll observer ──────────────────────────
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── Like handler ──────────────────────────────────────
  const likeMutationsRef = useRef<Map<string, { mutate: () => void }>>(new Map());

  const getLikeMutation = useCallback(
    (postId: string) => {
      if (!likeMutationsRef.current.has(postId)) {
        // We use a lightweight wrapper: create mutation, trigger it
        likeMutationsRef.current.set(postId, {
          mutate: () => {
            if (!isAuthenticated) {
              setAuthModalOpen(true);
              return;
            }
            // Direct fetch for like (simple, no complex optimistic cache management needed)
            fetch(`/api/posts/${postId}/like`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('nf_auth_token') || ''}`,
              },
            }).catch(() => {
              toast.error('خطا در ثبت لایک');
            });
            refetch();
          },
        });
      }
      return likeMutationsRef.current.get(postId)!;
    },
    [isAuthenticated, setAuthModalOpen, refetch],
  );

  const handleLike = useCallback(
    (postId: string) => {
      if (!isAuthenticated) {
        setAuthModalOpen(true);
        return;
      }
      getLikeMutation(postId).mutate();
    },
    [isAuthenticated, setAuthModalOpen, getLikeMutation],
  );

  // ── Navigation helpers ────────────────────────────────
  const handleNavigateToProfile = (userId: string) => {
    push('user-profile', { id: userId });
  };

  const handleNavigateToDetail = (postId: string) => {
    push('post-detail', { id: postId });
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    push('create-post');
  };

  // ── Refresh ───────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
    toast.success('پست‌ها بروزرسانی شدند');
  };

  // ── Loading state ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full min-h-[40vh]" dir="rtl">
        <div className="w-full py-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-h3 font-extrabold">فید اجتماعی</h2>
            <div className="animate-shimmer-loading h-9 w-28 rounded-xl bg-muted/40" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[40vh]" dir="rtl">
      <div className="w-full py-4">
        {/* ── Header ──────────────────────────────────── */}
        <motion.div
          {...fadeIn}
          className="mb-6 flex items-center justify-between"
        >
          <h2 className="text-h3 font-extrabold">فید اجتماعی</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 rounded-xl"
          >
            <RefreshCw
              className={`size-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            بروزرسانی
          </Button>
        </motion.div>

        {/* ── Error state ─────────────────────────────── */}
        {isError && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              خطا در بارگذاری پست‌ها
            </p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2 rounded-xl">
              <RefreshCw className="size-4" />
              تلاش مجدد
            </Button>
          </div>
        )}

        {/* ── Virtualized posts list ─────────────────── */}
        {posts.length > 0 && (
          <div
            ref={parentRef}
            className="h-[calc(100vh-220px)] overflow-y-auto rounded-xl"
            style={{ contain: 'strict' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                // Sentinel row for infinite scroll
                if (virtualRow.index === posts.length) {
                  return (
                    <div
                      key={virtualRow.key}
                      ref={loadMoreRef}
                      style={{
                        position: 'absolute',
                        top: 0,
                        transform: `translateY(${virtualRow.start}px)`,
                        width: '100%',
                      }}
                      className="flex items-center justify-center py-8"
                    >
                      {isFetchingNextPage && (
                        <Loader2 className="size-6 animate-spin text-emerald-500" />
                      )}
                    </div>
                  );
                }

                const post = posts[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                      paddingLeft: '0.5rem',
                      paddingRight: '0.5rem',
                    }}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                  >
                    <div className="pb-4">
                      <PostCard
                        post={post}
                        onLike={handleLike}
                        onNavigateToDetail={handleNavigateToDetail}
                        onNavigateToProfile={handleNavigateToProfile}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ─────────────────────────────── */}
        {!isLoading && !isError && posts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="py-20 text-center"
          >
            <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-2xl bg-muted">
              <Send className="size-10 text-muted-foreground/30" />
            </div>
            <h3 className="mb-2 text-lg font-bold">هنوز پستی وجود ندارد</h3>
            <p className="mb-6 max-w-xs mx-auto text-sm leading-6 text-muted-foreground">
              اولین نفری باشید که پست جدیدی منتشر می‌کنید و با جامعه نیاز فایندر ارتباط برقرار کنید!
            </p>
            <Button
              onClick={handleCreatePost}
              className="gap-2 rounded-xl"
            >
              <Plus className="size-4" />
              ایجاد اولین پست
            </Button>
          </motion.div>
        )}
      </div>

      {/* ── FAB: Create new post ────────────────────────── */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
        className="fixed bottom-24 left-5 z-30 sm:bottom-8 sm:left-8"
      >
        <Button
          onClick={handleCreatePost}
          size="lg"
          className="gap-2 rounded-2xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-shadow"
        >
          <Plus className="size-5" />
          <span className="hidden sm:inline">پست جدید</span>
        </Button>
      </motion.div>
    </div>
  );
}
