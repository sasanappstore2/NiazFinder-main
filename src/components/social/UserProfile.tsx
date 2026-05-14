'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  Star,
  BadgeCheck,
  MessageCircle,
  Phone,
  Share2,
  UserPlus,
  UserMinus,
  Users,
  UserCheck,
  FileText,
  Briefcase,
  CalendarDays,
  Globe,
  Quote,
  CheckCircle2,
  Copy,
  PenLine,
  ExternalLink,
  Heart,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import type { ServiceRequest } from '@/lib/types';

// ─── Animation variants ───────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: 'easeOut' } },
};

// ─── Color helpers ────────────────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

const AVATAR_SOLID = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getAvatarSolid(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_SOLID[hash % AVATAR_SOLID.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? parts[0][0] + parts[1][0]
    : parts[0][0];
}

// ─── Role label map ───────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  CLIENT: 'کاربر',
  SPECIALIST: 'متخصص',
  ADMIN: 'مدیر',
  SUPER_ADMIN: 'مدیر ارشد',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  CLIENT: 'secondary',
  SPECIALIST: 'default',
  ADMIN: 'outline',
  SUPER_ADMIN: 'outline',
};

// ─── Rating stars ─────────────────────────────────────
function RatingStars({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'md' ? 'size-5' : 'size-4';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-muted text-muted'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Helper: format Persian date ──────────────────────
function formatPersianDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateString;
  }
}

// ─── Helper: get auth header ──────────────────────────
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Stat Pill ────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
  iconColor = 'text-emerald-500',
}: {
  icon: typeof Users;
  label: string;
  value: number;
  iconColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-3 backdrop-blur-sm dark:bg-card/60">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div>
        <div className="text-base font-extrabold tabular-nums leading-tight">
          {value.toLocaleString('fa-IR')}
        </div>
        <div className="text-[11px] font-medium text-muted-foreground leading-tight">
          {label}
        </div>
      </div>
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  iconColor = 'text-emerald-500',
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  href?: string;
  iconColor?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 py-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon className={`size-4 ${iconColor}`} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="block text-sm font-medium truncate">{value}</span>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {content}
      </a>
    );
  }

  return content;
}

// ─── Post Mini Card (for Posts tab) ───────────────────
function PostMiniCard({ post, index }: { post: ServiceRequest; index: number }) {
  return (
    <motion.div variants={item}>
      <Card className="border-border/60 bg-card transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h4 className="mb-1 text-sm font-bold truncate">{post.title}</h4>
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {post.description}
              </p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" />
                  {post.city || 'نامشخص'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatPersianDate(post.createdAt)}
                </span>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <Badge
                variant="secondary"
                className={`text-[10px] ${
                  post.priority === 'URGENT'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : post.priority === 'HIGH'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : ''
                }`}
              >
                {post.priority === 'URGENT' ? 'فوری' : post.priority === 'HIGH' ? 'مهم' : 'عادی'}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {post.categoryName}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Cover skeleton */}
      <div className="animate-shimmer-loading rounded-t-2xl bg-muted/40 h-48 sm:h-56" />
      {/* Avatar + info skeleton */}
      <div className="bg-card border border-border/60 rounded-b-2xl px-6 pb-6 -mt-16 pt-0 sm:px-10">
        <div className="flex items-end gap-4 -mt-8 mb-4">
          <div className="animate-shimmer-loading size-28 rounded-2xl bg-muted/40 ring-4 ring-card" />
          <div className="flex-1 space-y-2">
            <div className="animate-shimmer-loading h-6 w-40 rounded-lg bg-muted/40" />
            <div className="animate-shimmer-loading h-4 w-28 rounded-md bg-muted/40" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="animate-shimmer-loading h-4 w-full rounded-md bg-muted/30" />
          <div className="animate-shimmer-loading h-4 w-3/4 rounded-md bg-muted/30" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-shimmer-loading h-20 rounded-xl bg-muted/30" />
        ))}
      </div>
      {/* Buttons skeleton */}
      <div className="mt-6 flex gap-3">
        <div className="animate-shimmer-loading h-10 w-32 rounded-xl bg-muted/30" />
        <div className="animate-shimmer-loading h-10 w-32 rounded-xl bg-muted/30" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
export function UserProfile() {
  const params = useParams();
  const targetId = params.id as string | undefined;
  const { push } = useAppRouter();
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isOwnProfile = !targetId || (currentUser && targetId === currentUser.id);

  // ── Local state ────────────────────────────────────
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [followData, setFollowData] = useState<{ followerCount: number; followingCount: number; isFollowing: boolean }>({
    followerCount: 0,
    followingCount: 0,
    isFollowing: false,
  });
  const [posts, setPosts] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Fetch profile ──────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      if (isOwnProfile && isAuthenticated) {
        // Fetch own profile
        const res = await fetch('/api/users/profile', {
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } else if (targetId) {
        // Fetch public profile
        const res = await fetch(`/api/users/${targetId}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      }
    } catch {
      // Silently fail - will use fallback data
    }
  }, [isOwnProfile, isAuthenticated, targetId]);

  // ── Fetch follow data ──────────────────────────────
  const fetchFollowData = useCallback(async () => {
    const userId = isOwnProfile && isAuthenticated ? currentUser?.id : targetId;
    if (!userId) return;
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowData(data);
      }
    } catch {
      // Silently fail
    }
  }, [isOwnProfile, isAuthenticated, currentUser?.id, targetId]);

  // ── Fetch posts ────────────────────────────────────
  const fetchPosts = useCallback(async () => {
    const userId = isOwnProfile && isAuthenticated ? currentUser?.id : targetId;
    if (!userId) return;
    try {
      const res = await fetch(`/api/posts?userId=${userId}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPosts(data);
        } else if (data.posts) {
          setPosts(data.posts);
        }
      }
    } catch {
      // Silently fail
    }
  }, [isOwnProfile, isAuthenticated, currentUser?.id, targetId]);

  // ── Load all data ──────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchFollowData(), fetchPosts()]);
      setLoading(false);
    };
    loadData();
  }, [fetchProfile, fetchFollowData, fetchPosts]);

  // ── Build profile display object ───────────────────
  const profile = profileData
    ? (() => {
        const user = (isOwnProfile ? profileData.user : profileData.user) as Record<string, unknown>;
        const displayName = (user.displayName || `${user.firstName} ${user.lastName}`) as string;
        const username = (user.username || '') as string;
        const phone = (user.phone || '') as string;
        return {
          id: (user.id || currentUser?.id || targetId || '') as string,
          displayName,
          firstName: (user.firstName || currentUser?.firstName || '') as string,
          lastName: (user.lastName || currentUser?.lastName || '') as string,
          username: username || `user_${(phone || '').slice(-4) || 'unknown'}`,
          bio: (user.bio || currentUser?.bio || 'هنوز بیو اضافه نشده است.') as string,
          avatar: (user.avatar || currentUser?.avatar || undefined) as string | undefined,
          coverImage: (user.coverImage || currentUser?.coverImage || undefined) as string | undefined,
          city: (user.city || currentUser?.city || '') as string,
          province: (user.province || currentUser?.province || '') as string,
          website: (user.website || currentUser?.website || '') as string,
          role: (user.role || currentUser?.role || 'CLIENT') as string,
          isVerified: (user.isVerified || currentUser?.isVerified || false) as boolean,
          online: (user.online || currentUser?.online || false) as boolean,
          createdAt: (user.createdAt || currentUser?.createdAt || new Date().toISOString()) as string,
          avgRating: profileData.avgRating || currentUser?.rating || 0,
          projectCount: profileData.projectCount || currentUser?.projectCount || 0,
          postCount: profileData.postCount || currentUser?.postCount || posts.length,
          skills: (profileData.skills || []) as { name: string; level: number }[],
        };
      })()
    : (() => {
        // Fallback to currentUser
        const u = currentUser;
        if (u) {
          return {
            id: u.id,
            displayName: u.displayName || `${u.firstName} ${u.lastName}`,
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username || `user_${(u.phone || '').slice(-4) || 'unknown'}`,
            bio: u.bio || 'هنوز بیو اضافه نشده است.',
            avatar: u.avatar,
            coverImage: u.coverImage,
            city: u.city || '',
            province: u.province || '',
            website: u.website || '',
            role: u.role,
            isVerified: u.isVerified,
            online: u.online,
            createdAt: u.createdAt,
            avgRating: u.rating,
            projectCount: u.projectCount,
            postCount: u.postCount || posts.length,
            skills: [],
          };
        }
        return null;
      })();

  // ── Follow/Unfollow handler ────────────────────────
  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      useAppStore.getState().setAuthModalOpen(true);
      return;
    }
    if (!profile || isOwnProfile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.id}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowData((prev) => ({
          ...prev,
          isFollowing: data.following,
          followerCount: data.following
            ? prev.followerCount + 1
            : Math.max(0, prev.followerCount - 1),
        }));
        toast.success(data.following ? 'با موفقیت دنبال شد' : 'دنبال کردن لغو شد');
      }
    } catch {
      toast.error('خطا در انجام عملیات');
    } finally {
      setFollowLoading(false);
    }
  };

  // ── Share profile handler ──────────────────────────
  const handleShare = async () => {
    const shareText = `پروفایل ${profile?.displayName || 'کاربر'} در نیاز فایندر`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      } catch {
        // User cancelled, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('لینک پروفایل کپی شد');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('خطا در کپی لینک');
    }
  };

  // ── Loading state ──────────────────────────────────
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-muted/20" dir="rtl">
        <ProfileSkeleton />
      </div>
    );
  }

  const initials = getInitials(profile.displayName);
  const avatarColor = getAvatarColor(profile.displayName);
  const avatarSolid = getAvatarSolid(profile.displayName);
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

        {/* ── Back Button ──────────────────────────── */}
        <motion.div {...fadeIn} className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push('home')}
            className="gap-2 text-sm text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت
          </Button>
        </motion.div>

        {/* ── Cover Image + Avatar Section ──────────── */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.05 }}
          className="mb-6 overflow-hidden rounded-2xl border border-border/60"
        >
          {/* Cover image area */}
          <div className="relative h-48 overflow-hidden bg-gradient-to-bl from-emerald-500 via-emerald-600 to-teal-700 sm:h-56">
            {profile.coverImage ? (
              <img
                src={profile.coverImage}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <>
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute bottom-0 left-1/3 size-60 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -right-8 bottom-4 size-32 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute right-1/4 top-4 size-20 rounded-full bg-white/5" />
                {/* Subtle mesh pattern */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_50%)]" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.06),transparent_40%)]" />
              </>
            )}

            {/* Cover edit button for own profile */}
            {isOwnProfile && (
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-3 left-3 gap-1.5 rounded-lg bg-black/30 text-white border-0 backdrop-blur-sm hover:bg-black/40"
                onClick={() => toast.info('ویرایش کاور به زودی اضافه می‌شود')}
              >
                <PenLine className="size-3.5" />
                ویرایش کاور
              </Button>
            )}
          </div>

          {/* Profile info card overlapping cover */}
          <div className="relative bg-card px-6 pb-6 pt-0 dark:bg-card sm:px-10">
            {/* Avatar positioned on the gradient */}
            <div className="-mt-16 mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-4">
                {/* Avatar with gradient border */}
                <div className="relative">
                  <div className={`size-28 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-white shadow-lg ring-4 ring-card ${avatarSolid}`}>
                    {initials}
                  </div>
                  {/* Online/offline indicator badge */}
                  <span
                    className={`absolute -bottom-1 -left-1 size-5 rounded-full border-[3px] border-card shadow-sm ${
                      profile.online
                        ? 'bg-emerald-500'
                        : 'bg-gray-400 dark:bg-gray-500'
                    }`}
                  />
                  {/* Verified badge */}
                  {profile.isVerified && (
                    <span className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-emerald-200 dark:ring-emerald-800">
                      <BadgeCheck className="size-4 text-emerald-500" />
                    </span>
                  )}
                </div>

                {/* Name + username */}
                <div className="mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-extrabold sm:text-2xl">
                      {profile.displayName}
                    </h1>
                    <Badge
                      variant={ROLE_VARIANTS[profile.role] || 'secondary'}
                      className="rounded-lg text-[10px] font-medium"
                    >
                      {ROLE_LABELS[profile.role] || profile.role}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    @{profile.username}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 sm:mb-1">
                {isOwnProfile ? (
                  <Button
                    className="gap-2 rounded-xl px-5"
                    onClick={() => push('edit-profile')}
                  >
                    <PenLine className="size-4" />
                    ویرایش پروفایل
                  </Button>
                ) : (
                  <>
                    {/* Follow/Unfollow button */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={followData.isFollowing ? 'following' : 'follow'}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          variant={followData.isFollowing ? 'outline' : 'default'}
                          className={`gap-2 rounded-xl px-5 ${
                            followData.isFollowing
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                              : ''
                          }`}
                          onClick={handleToggleFollow}
                          disabled={followLoading}
                        >
                          {followLoading ? (
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : followData.isFollowing ? (
                            <UserMinus className="size-4" />
                          ) : (
                            <UserPlus className="size-4" />
                          )}
                          {followData.isFollowing ? 'دنبال‌شده' : 'دنبال کردن'}
                        </Button>
                      </motion.div>
                    </AnimatePresence>

                    {/* Message button */}
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl px-5"
                      onClick={() => push('messages', { userId: profile.id })}
                    >
                      <MessageCircle className="size-4" />
                      پیام
                    </Button>

                    {/* Call button */}
                    <Button
                      variant="outline"
                      className="gap-2 rounded-xl px-5"
                      onClick={() => push('messages', { userId: profile.id, action: 'call' })}
                    >
                      <Phone className="size-4" />
                      تماس
                    </Button>
                  </>
                )}

                {/* Share button */}
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl"
                  onClick={handleShare}
                >
                  {copied ? (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  ) : (
                    <Share2 className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mb-4 text-sm leading-7 text-muted-foreground">
                {profile.bio}
              </p>
            )}

            {/* Quick info row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {profile.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {profile.province ? `${profile.city}، ${profile.province}` : profile.city}
                </span>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Globe className="size-3.5" />
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                عضویت: {formatPersianDate(profile.createdAt)}
              </span>
              {profile.online ? (
                <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  آنلاین
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-gray-400 dark:bg-gray-500" />
                  آفلاین
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Stats Bar ─────────────────────────────── */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          <StatPill
            icon={Users}
            label="دنبال‌کنندگان"
            value={followData.followerCount}
            iconColor="text-emerald-500"
          />
          <StatPill
            icon={UserCheck}
            label="دنبال‌شوندگان"
            value={followData.followingCount}
            iconColor="text-teal-500"
          />
          <StatPill
            icon={FileText}
            label="پست‌ها"
            value={profile.postCount || posts.length}
            iconColor="text-amber-500"
          />
          <StatPill
            icon={Briefcase}
            label="پروژه‌ها"
            value={profile.projectCount}
            iconColor="text-violet-500"
          />
          <div className="col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3 rounded-xl bg-white/60 px-4 py-3 backdrop-blur-sm dark:bg-card/60">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <Star className="size-4 text-amber-500" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <RatingStars rating={profile.avgRating} />
                  <span className="text-base font-extrabold tabular-nums leading-tight">
                    {profile.avgRating > 0 ? profile.avgRating.toLocaleString('fa-IR') : '—'}
                  </span>
                </div>
                <div className="text-[11px] font-medium text-muted-foreground leading-tight">
                  امتیاز
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Profile Tabs ──────────────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }}>
          <Tabs defaultValue="posts" className="w-full">
            <Card className="border-border/60 bg-card">
              <CardHeader className="pb-0">
                <TabsList className="w-full">
                  <TabsTrigger value="posts" className="flex-1 gap-1.5">
                    <FileText className="size-3.5" />
                    پست‌ها
                    <Badge variant="secondary" className="rounded-md px-1.5 text-[10px]">
                      {(profile.postCount || posts.length).toLocaleString('fa-IR')}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="about" className="flex-1 gap-1.5">
                    <UserPlus className="size-3.5" />
                    درباره
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="flex-1 gap-1.5">
                    <Briefcase className="size-3.5" />
                    پروژه‌ها
                    <Badge variant="secondary" className="rounded-md px-1.5 text-[10px]">
                      {profile.projectCount.toLocaleString('fa-IR')}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-4">

                {/* ─── Posts Tab ────────────────────── */}
                <TabsContent value="posts">
                  {posts.length > 0 ? (
                    <motion.div
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-1"
                    >
                      {posts.map((post, i) => (
                        <PostMiniCard key={post.id} post={post} index={i} />
                      ))}
                    </motion.div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                        <FileText className="size-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="mb-2 text-sm font-semibold">پستی ثبت نشده</h3>
                      <p className="text-xs text-muted-foreground">
                        {isOwnProfile
                          ? 'شما هنوز پستی ثبت نکرده‌اید. اولین نیاز خود را ثبت کنید!'
                          : 'این کاربر هنوز پستی ثبت نکرده است.'}
                      </p>
                      {isOwnProfile && (
                        <Button
                          className="mt-4 gap-2 rounded-xl"
                          onClick={() => push('post-need')}
                        >
                          <PenLine className="size-4" />
                          ثبت نیاز جدید
                        </Button>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ─── About Tab ────────────────────── */}
                <TabsContent value="about">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    className="space-y-6"
                  >
                    {/* Extended bio */}
                    <div>
                      <h3 className="mb-3 text-sm font-bold">درباره من</h3>
                      <div className="relative rounded-xl bg-muted/40 p-4">
                        <Quote className="absolute top-3 right-3 size-4 text-muted-foreground/20" />
                        <p className="pr-5 text-sm leading-8 text-muted-foreground">
                          {profile.bio || 'هنوز بیو اضافه نشده است.'}
                        </p>
                      </div>
                    </div>

                    <Separator className="bg-border/60" />

                    {/* Detailed info */}
                    <div>
                      <h3 className="mb-3 text-sm font-bold">اطلاعات</h3>
                      <div className="divide-y divide-border/60">
                        <InfoRow
                          icon={CalendarDays}
                          label="تاریخ عضویت"
                          value={formatPersianDate(profile.createdAt)}
                          iconColor="text-emerald-500"
                        />
                        <InfoRow
                          icon={MapPin}
                          label="موقعیت"
                          value={profile.city && profile.province ? `${profile.city}، ${profile.province}` : profile.city || 'نامشخص'}
                          iconColor="text-amber-500"
                        />
                        {profile.website && (
                          <InfoRow
                            icon={Globe}
                            label="وب‌سایت"
                            value={profile.website.replace(/^https?:\/\//, '')}
                            href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                            iconColor="text-teal-500"
                          />
                        )}
                        <InfoRow
                          icon={UserPlus}
                          label="نقش"
                          value={ROLE_LABELS[profile.role] || profile.role}
                          iconColor="text-violet-500"
                        />
                        <InfoRow
                          icon={Briefcase}
                          label="تعداد پروژه‌ها"
                          value={`${profile.projectCount.toLocaleString('fa-IR')} پروژه`}
                          iconColor="text-rose-500"
                        />
                        <InfoRow
                          icon={Star}
                          label="امتیاز"
                          value={`${profile.avgRating > 0 ? profile.avgRating.toLocaleString('fa-IR') : 'بدون'} از ۵`}
                          iconColor="text-amber-500"
                        />
                      </div>
                    </div>

                    {/* Skills (if specialist) */}
                    {profile.skills && profile.skills.length > 0 && (
                      <>
                        <Separator className="bg-border/60" />
                        <div>
                          <h3 className="mb-3 text-sm font-bold">مهارت‌ها</h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.skills.map((skill) => (
                              <Badge
                                key={skill.name}
                                variant="secondary"
                                className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 gap-1.5"
                              >
                                {skill.name}
                                <span className="text-[10px] opacity-60">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`inline-block size-1 rounded-full ${i < skill.level ? 'bg-current' : 'bg-current/20'}`} />
                                  ))}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Verified badge card */}
                    {profile.isVerified && (
                      <motion.div {...scaleIn} transition={{ delay: 0.2 }}>
                        <Card className="border-emerald-200 bg-gradient-to-b from-emerald-50 to-white dark:border-emerald-800 dark:from-emerald-950/40 dark:to-card">
                          <CardContent className="p-5 text-center">
                            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/30">
                              <BadgeCheck className="size-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <h3 className="mb-1 text-sm font-bold">احراز هویت شده</h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              هویت این کاربر توسط تیم نیاز فایندر تأیید شده است.
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </motion.div>
                </TabsContent>

                {/* ─── Projects Tab ─────────────────── */}
                <TabsContent value="projects">
                  {profile.projectCount > 0 ? (
                    <motion.div
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="space-y-4"
                    >
                      {Array.from({ length: Math.min(profile.projectCount, 6) }).map((_, i) => (
                        <motion.div key={i} variants={item}>
                          <Card className="border-border/60 bg-card transition-all duration-200 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-4">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                                  <Briefcase className="size-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-sm font-bold truncate">پروژه {Number(i + 1).toLocaleString('fa-IR')}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    تکمیل شده
                                  </p>
                                </div>
                                <Badge variant="secondary" className="rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px]">
                                  <CheckCircle2 className="size-3 ml-1" />
                                  تکمیل
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="py-16 text-center">
                      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
                        <Briefcase className="size-8 text-muted-foreground/40" />
                      </div>
                      <h3 className="mb-2 text-sm font-semibold">پروژه‌ای ثبت نشده</h3>
                      <p className="text-xs text-muted-foreground">
                        {isOwnProfile
                          ? 'شما هنوز پروژه‌ای انجام نداده‌اید.'
                          : 'این کاربر هنوز پروژه‌ای انجام نداده است.'}
                      </p>
                    </div>
                  )}
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default UserProfile;
