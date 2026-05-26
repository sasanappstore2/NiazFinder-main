'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ArrowRight,
  Send,
  MessageCircle,
  Image as ImageIcon,
  Loader2,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { useParams } from 'next/navigation';
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

interface Post {
  id: string;
  content: string;
  imageUrls?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: string;
  user: PostUser;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    avatar?: string;
    username?: string;
  };
}

// ─── Animation variants ─────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Avatar helpers ─────────────────────────────────────
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

// ─── Auth header helper ─────────────────────────────────
function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Persian relative time ──────────────────────────────
function getTimeAgo(dateString: string): string {
  try {
    const now = new Date();
    const date = new Date(dateString);
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
    return new Date(dateString).toLocaleDateString('fa-IR');
  } catch {
    return dateString;
  }
}

// ─── Skeleton Loader ────────────────────────────────────
function PostDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="animate-shimmer-loading h-9 w-24 rounded-xl bg-muted/40 mb-6" />
      <Card className="border-border/60 bg-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="animate-shimmer-loading size-11 rounded-xl bg-muted/40" />
            <div className="space-y-2">
              <div className="animate-shimmer-loading h-4 w-36 rounded-md bg-muted/40" />
              <div className="animate-shimmer-loading h-3 w-28 rounded-md bg-muted/30" />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="animate-shimmer-loading h-4 w-full rounded-md bg-muted/30" />
            <div className="animate-shimmer-loading h-4 w-full rounded-md bg-muted/30" />
            <div className="animate-shimmer-loading h-4 w-2/3 rounded-md bg-muted/30" />
          </div>
          <div className="animate-shimmer-loading h-48 w-full rounded-xl bg-muted/30 mb-4" />
          <div className="flex items-center gap-4">
            <div className="animate-shimmer-loading h-8 w-20 rounded-lg bg-muted/30" />
            <div className="animate-shimmer-loading h-8 w-20 rounded-lg bg-muted/30" />
          </div>
        </CardContent>
      </Card>
      {/* Comments skeleton */}
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="animate-shimmer-loading size-9 rounded-lg bg-muted/40 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="animate-shimmer-loading h-4 w-28 rounded-md bg-muted/30" />
              <div className="animate-shimmer-loading h-3 w-full rounded-md bg-muted/20" />
              <div className="animate-shimmer-loading h-3 w-3/4 rounded-md bg-muted/20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Heart animation ────────────────────────────────────
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

// ─── Comment Card ───────────────────────────────────────
function CommentCard({ comment }: { comment: Comment }) {
  const displayName =
    comment.user.displayName ||
    `${comment.user.firstName} ${comment.user.lastName}`;
  const initials = getInitials(displayName);
  const avatarColor = getAvatarSolid(displayName);

  return (
    <motion.div variants={item} className="flex gap-3">
      <Avatar className="size-9 rounded-lg shrink-0">
        <AvatarFallback
          className={`${avatarColor} rounded-lg text-white text-xs font-bold`}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold">{displayName}</span>
          <span className="text-caption text-muted-foreground flex items-center gap-1">
            <Clock className="size-3" />
            {getTimeAgo(comment.createdAt)}
          </span>
        </div>
        <p className="text-sm leading-7 text-foreground/85 whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────
export function PostDetailPage() {
  const params = useParams();
  const postId = params.id as string;
  const { push } = useAppRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // ── Fetch post and comments ───────────────────────────
  const fetchData = useCallback(async () => {
    if (!postId) return;

    try {
      // Fetch all posts and find the one with matching ID
      const res = await fetch('/api/posts', {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        const allPosts: Post[] = data.data || data.posts || data || [];
        const foundPost = allPosts.find((p) => p.id === postId);

        if (foundPost) {
          setPost(foundPost);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Toggle like ───────────────────────────────────────
  const handleLike = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (!post) return;

    // Optimistic update
    setPost((prev) =>
      prev
        ? {
            ...prev,
            isLiked: !prev.isLiked,
            likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
          }
        : prev,
    );

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setPost((prev) =>
          prev
            ? {
                ...prev,
                isLiked: data.liked ?? prev.isLiked,
              }
            : prev,
        );
      }
    } catch {
      // Revert
      setPost((prev) =>
        prev
          ? {
              ...prev,
              isLiked: !prev.isLiked,
              likeCount: prev.isLiked ? prev.likeCount - 1 : prev.likeCount + 1,
            }
          : prev,
      );
      toast.error('خطا در ثبت لایک');
    }
  };

  // ── Submit comment ────────────────────────────────────
  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }
    if (!commentText.trim() || !post) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comment`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: commentText.trim() }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setComments((prev) => [newComment, ...prev]);
        setCommentText('');
        toast.success('نظر شما ثبت شد');

        // Update comment count on post
        setPost((prev) =>
          prev
            ? { ...prev, commentCount: prev.commentCount + 1 }
            : prev,
        );
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'خطا در ثبت نظر');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmittingComment(false);
    }
  };

  // ── Navigate to profile ───────────────────────────────
  const handleNavigateToProfile = (userId: string) => {
    push('user-profile', { id: userId });
  };

  // ── Loading state ─────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20" dir="rtl">
        <PostDetailSkeleton />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-muted/20" dir="rtl">
        <div className="mx-auto max-w-2xl px-4 py-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push('social-feed')}
            className="gap-2 text-sm text-muted-foreground mb-6"
          >
            <ArrowRight className="size-4" />
            بازگشت به فید
          </Button>
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <MessageCircle className="size-8 text-muted-foreground/40" />
            </div>
            <h3 className="mb-2 text-lg font-bold">پست یافت نشد</h3>
            <p className="text-sm text-muted-foreground">
              این پست وجود ندارد یا حذف شده است.
            </p>
            <Button
              onClick={() => push('social-feed')}
              className="mt-4 gap-2 rounded-xl"
            >
              بازگشت به فید
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Parse image URLs ──────────────────────────────────
  let imageUrls: string[] = [];
  if (post.imageUrls) {
    try {
      const parsed =
        typeof post.imageUrls === 'string' ? JSON.parse(post.imageUrls) : post.imageUrls;
      if (Array.isArray(parsed)) imageUrls = parsed;
    } catch {
      // ignore
    }
  }

  const displayName =
    post.user.displayName ||
    `${post.user.firstName} ${post.user.lastName}`;
  const initials = getInitials(displayName);
  const avatarColor = getAvatarSolid(displayName);

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-6 pb-28">
        {/* ── Back Button ──────────────────────────────── */}
        <motion.div {...fadeIn} className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push('social-feed')}
            className="gap-2 text-sm text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت به فید
          </Button>
        </motion.div>

        {/* ── Post Card ────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <Card className="border-border/60 bg-card">
            <CardContent className="p-4 sm:p-5">
              {/* Author header */}
              <div className="mb-4 flex items-center gap-3">
                <button
                  onClick={() => handleNavigateToProfile(post.user.id)}
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
                <button
                  onClick={() => handleNavigateToProfile(post.user.id)}
                  className="min-w-0 flex-1 text-right"
                >
                  <p className="text-sm font-bold truncate hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{post.user.username || 'کاربر'}
                    {' · '}
                    {getTimeAgo(post.createdAt)}
                  </p>
                </button>
              </div>

              {/* Post content */}
              <p className="mb-4 text-sm leading-8 text-foreground/90 whitespace-pre-wrap break-words">
                {post.content}
              </p>

              {/* Images */}
              {imageUrls.length > 0 && (
                <div
                  className={`mb-4 grid gap-2 rounded-xl overflow-hidden ${
                    imageUrls.length === 1
                      ? 'grid-cols-1'
                      : 'grid-cols-2'
                  }`}
                >
                  {imageUrls.map((url, i) => (
                    <div
                      key={i}
                      className={`relative overflow-hidden bg-muted/30 ${
                        imageUrls.length === 3 && i === 0 ? 'row-span-2 min-h-48' : 'min-h-40'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`تصویر ${i + 1}`}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Separator className="bg-border/40 my-3" />

              {/* Like + Comment count */}
              <div className="flex items-center justify-between">
                <LikeButton
                  isLiked={post.isLiked}
                  count={post.likeCount}
                  onToggle={handleLike}
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageCircle className="size-4" />
                  <span className="font-medium tabular-nums">
                    {post.commentCount > 0
                      ? post.commentCount.toLocaleString('fa-IR')
                      : 'بدون نظر'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Comments Section ─────────────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="mt-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="size-4 text-emerald-500" />
            <h2 className="text-sm font-extrabold">
              نظرات
              {comments.length > 0 && (
                <Badge
                  variant="secondary"
                  className="mr-2 text-caption"
                >
                  {comments.length.toLocaleString('fa-IR')}
                </Badge>
              )}
            </h2>
          </div>

          {comments.length > 0 ? (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1"
            >
              {comments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-12 text-center"
            >
              <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-muted">
                <MessageCircle className="size-7 text-muted-foreground/30" />
              </div>
              <h3 className="mb-1 text-sm font-semibold">هنوز نظری ثبت نشده</h3>
              <p className="text-xs text-muted-foreground">
                اولین نفری باشید که نظر می‌دهید!
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* ── Sticky Comment Input ────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/80 backdrop-blur-lg safe-area-bottom">
        <div className="mx-auto flex max-w-2xl items-end gap-3 px-4 py-3">
          <div className="flex-1">
            <Textarea
              ref={commentInputRef}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              placeholder="نظر خود را بنویسید..."
              className="min-h-[40px] max-h-[120px] resize-none text-sm leading-6 rounded-xl px-4 py-2.5"
              rows={1}
            />
          </div>
          <Button
            onClick={handleSubmitComment}
            disabled={submittingComment || !commentText.trim()}
            size="icon"
            className="size-10 shrink-0 rounded-xl"
          >
            {submittingComment ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
