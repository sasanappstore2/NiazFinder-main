'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Users,
  UserPlus,
  UserMinus,
  BadgeCheck,
  ArrowLeft,
  Sparkles,
  Briefcase,
  Star,
  ChevronRight,
  ChevronLeft,
  Eye,
  UserCircle,
  Shield,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { toast } from 'sonner';
import type { User } from '@/lib/types';
import { fuzzyPersianIncludes } from '@/lib/persian-normalize';

// ─── Animation variants ───────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};
const fadeIn = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Avatar color generator ───────────────────────────
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
  return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
}

// ─── Role config ──────────────────────────────────────
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
const ROLE_ICONS: Record<string, typeof UserCircle> = {
  CLIENT: UserCircle,
  SPECIALIST: Star,
  ADMIN: Shield,
  SUPER_ADMIN: Shield,
};

const ROLE_FILTERS = [
  { value: 'all', label: 'همه' },
  { value: 'CLIENT', label: 'کاربران' },
  { value: 'SPECIALIST', label: 'متخصص‌ها' },
  { value: 'ADMIN,SUPER_ADMIN', label: 'مدیران' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'followers', label: 'بیشترین فالوور' },
  { value: 'active', label: 'فعال‌ترین' },
];

// ─── Suggested users (loaded from API on mount) ──
let _suggestedCache: User[] | null = null;

// ─── Map API user to local User type ──────────────────
function mapApiUser(u: Record<string, unknown>): User {
  return {
    id: u.id as string,
    email: (u.email as string) || '',
    phone: (u.phone as string | null) ?? undefined,
    username: (u.username as string | null) ?? undefined,
    firstName: (u.firstName as string) || '',
    lastName: (u.lastName as string) || '',
    displayName: (u.displayName as string | null) ?? `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    bio: (u.bio as string | null) ?? undefined,
    city: (u.city as string | null) ?? undefined,
    province: (u.province as string | null) ?? undefined,
    role: (u.role as 'CLIENT' | 'SPECIALIST' | 'ADMIN' | 'SUPER_ADMIN') || 'CLIENT',
    isVerified: (u.isVerified as boolean) || false,
    isActive: (u.isActive as boolean) ?? true,
    online: (u.online as boolean) || false,
    rating: (u.rating as number) || 0,
    projectCount: (u.projectCount as number) || 0,
    completionRate: (u.completionRate as number) || 0,
    responseRate: (u.responseRate as number) || 0,
    followerCount: (u.followerCount as number) || 0,
    followingCount: (u.followingCount as number) || 0,
    postCount: (u.postCount as number) || 0,
    createdAt: u.createdAt ? new Date(u.createdAt as string).toISOString() : new Date().toISOString(),
  };
}

// ─── Auth header helper ───────────────────────────────
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Featured Carousel Card ───────────────────────────
function FeaturedCard({ user, onFollow, onView }: {
  user: User;
  onFollow: (id: string) => void;
  onView: (id: string) => void;
}) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { followedIds } = useFollowState();
  const isFollowed = followedIds.has(user.id);
  const initials = getInitials(user.displayName);
  const avatarSolid = getAvatarSolid(user.displayName);
  const RoleIcon = ROLE_ICONS[user.role] || UserCircle;

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="min-w-[220px] max-w-[220px] snap-center shrink-0"
    >
      <Card className="border-border/40 overflow-hidden bg-gradient-to-b from-card to-card/80 backdrop-blur-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-200/60 dark:hover:border-emerald-800/60">
        <CardContent className="p-5">
          {/* Avatar + Name */}
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="relative mb-3">
              <div className={`size-16 rounded-full flex items-center justify-center text-lg font-extrabold text-white shadow-md ring-3 ring-card ${avatarSolid}`}>
                {initials}
              </div>
              {user.online && (
                <span className="absolute bottom-0 right-0 size-4 rounded-full border-[3px] border-card bg-emerald-500 shadow-sm">
                  <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-40" />
                </span>
              )}
              {user.isVerified && (
                <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800">
                  <BadgeCheck className="size-3 text-emerald-500" />
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold truncate w-full">{user.displayName}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 justify-center">
              <RoleIcon className="size-3" />
              {ROLE_LABELS[user.role]}
            </p>
            {user.bio && (
              <p className="mt-2 text-caption leading-relaxed text-muted-foreground line-clamp-2">
                {user.bio}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="mb-4 flex justify-center gap-4 text-center">
            <div>
              <span className="block text-sm font-bold tabular-nums">
                {(user.followerCount || 0).toLocaleString('fa-IR')}
              </span>
              <span className="text-caption text-muted-foreground">فالوور</span>
            </div>
            <div className="h-8 w-px bg-border/60" />
            <div>
              <span className="block text-sm font-bold tabular-nums">
                {user.projectCount.toLocaleString('fa-IR')}
              </span>
              <span className="text-caption text-muted-foreground">پروژه</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => onFollow(user.id)}
              disabled={!isAuthenticated}
              className={`flex-1 h-8 text-xs rounded-lg gap-1 ${
                isFollowed
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30'
                  : ''
              }`}
              variant={isFollowed ? 'outline' : 'default'}
            >
              {isFollowed ? <UserMinus className="size-3" /> : <UserPlus className="size-3" />}
              {isFollowed ? 'دنبال‌شده' : 'دنبال کردن'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-lg p-0"
              onClick={() => onView(user.id)}
            >
              <Eye className="size-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── User Card (Grid) ─────────────────────────────────
function UserCard({ user, onFollow, onView }: {
  user: User;
  onFollow: (id: string) => void;
  onView: (id: string) => void;
}) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { followedIds, followLoading } = useFollowState();
  const isFollowed = followedIds.has(user.id);
  const initials = getInitials(user.displayName);
  const avatarSolid = getAvatarSolid(user.displayName);
  const RoleIcon = ROLE_ICONS[user.role] || UserCircle;

  return (
    <Card className="group border-border/60 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer"
      onClick={() => onView(user.id)}
    >
      <CardContent className="p-5">
        {/* Top: Avatar + Name + Role */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative shrink-0">
            <div className={`size-12 rounded-full flex items-center justify-center text-sm font-bold text-white ring-2 ring-primary/20 ${avatarSolid}`}>
              {initials}
            </div>
            {user.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500 shadow-sm" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold">{user.displayName}</h3>
              {user.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              @{user.username || 'user'}
            </p>
          </div>

          {/* Role badge */}
          <Badge
            variant={ROLE_VARIANTS[user.role] || 'secondary'}
            className="shrink-0 rounded-lg text-caption font-medium gap-1"
          >
            <RoleIcon className="size-3" />
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <Users className="size-3.5 text-emerald-500" />
            <div>
              <span className="block text-caption text-muted-foreground">فالوور</span>
              <p className="text-xs font-bold tabular-nums">
                {(user.followerCount || 0).toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="size-3.5 text-emerald-500" />
            <div>
              <span className="block text-caption text-muted-foreground">پروژه</span>
              <p className="text-xs font-bold tabular-nums">
                {user.projectCount.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFollow(user.id);
            }}
            disabled={!isAuthenticated || followLoading === user.id}
            variant={isFollowed ? 'outline' : 'default'}
            className={`flex-1 h-9 text-xs rounded-xl gap-1.5 ${
              isFollowed
                ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/30'
                : ''
            }`}
          >
            {followLoading === user.id ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isFollowed ? (
              <UserMinus className="size-3.5" />
            ) : (
              <UserPlus className="size-3.5" />
            )}
            {isFollowed ? 'دنبال‌شده' : 'دنبال کردن'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-9 flex-1 text-xs rounded-xl gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              onView(user.id);
            }}
          >
            مشاهده پروفایل
            <ArrowLeft className="size-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Follow state context (shared) ────────────────────
function useFollowState() {
  // This is a simple local state hook pattern
  // Since we need shared state across components, we use module-level state
  return FollowState.use();
}

// Simple module-level state for follow status
const FollowState = (() => {
  let state: { followedIds: Set<string>; followLoading: string | null; listeners: Set<() => void> } = {
    followedIds: new Set<string>(),
    followLoading: null,
    listeners: new Set(),
  };

  function subscribe(listener: () => void) {
    state.listeners.add(listener);
    return () => state.listeners.delete(listener);
  }

  function notify() {
    state.listeners.forEach((l) => l());
  }

  return {
    use() {
      const [, forceRender] = useState(0);
      useEffect(() => subscribe(() => forceRender((n) => n + 1)), []);
      return {
        followedIds: state.followedIds,
        followLoading: state.followLoading,
        setFollowedIds: (ids: Set<string>) => { state.followedIds = ids; notify(); },
        setFollowLoading: (id: string | null) => { state.followLoading = id; notify(); },
      };
    },
    getFollowedIds: () => state.followedIds,
    setFollowedIds: (ids: Set<string>) => { state.followedIds = ids; notify(); },
    setFollowLoading: (id: string | null) => { state.followLoading = id; notify(); },
  };
})();

// ─── Empty State ──────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-20 text-center"
    >
      <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-2xl bg-muted">
        <Users className="size-10 text-muted-foreground/40" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">کاربری یافت نشد</h3>
      <p className="mx-auto max-w-sm text-sm text-muted-foreground">
        لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
      </p>
      <Button variant="outline" className="mt-4 rounded-xl" onClick={onClear}>
        حذف فیلترها
      </Button>
    </motion.div>
  );
}

// ─── Pagination ───────────────────────────────────────
function Pagination({ page, totalPages, onPageChange }: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i);
  }

  return (
    <motion.div
      {...fadeIn}
      className="mt-8 flex items-center justify-center gap-1"
    >
      <Button
        variant="outline"
        size="sm"
        className="h-9 w-9 rounded-lg p-0"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronRight className="size-4" />
      </Button>

      {pages[0] > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg p-0 text-xs"
            onClick={() => onPageChange(1)}
          >
            ۱
          </Button>
          {pages[0] > 2 && <span className="px-1 text-muted-foreground">...</span>}
        </>
      )}

      {pages.map((p) => (
        <Button
          key={p}
          variant={p === page ? 'default' : 'outline'}
          size="sm"
          className={`h-9 w-9 rounded-lg p-0 text-xs ${p === page ? '' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p.toLocaleString('fa-IR')}
        </Button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <span className="px-1 text-muted-foreground">...</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-lg p-0 text-xs"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages.toLocaleString('fa-IR')}
          </Button>
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="h-9 w-9 rounded-lg p-0"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────
export function UserDiscovery() {
  const { push } = useAppRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  // Search & filter state
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const limit = 12;

  // API state
  const [loading, setLoading] = useState(true);
  const [apiUsers, setApiUsers] = useState<User[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [suggestedUsers, setSuggestedUsers] = useState<User[]>([]);

  // Carousel ref for auto-scroll
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Fetch from API ─────────────────────────────
  const fetchFromApi = useCallback(async (params: {
    search?: string;
    role?: string;
    sort?: string;
    page?: number;
  }) => {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('limit', String(limit));
      searchParams.set('page', String(params.page || 1));
      if (params.search) searchParams.set('search', params.search);
      if (params.role && params.role !== 'all') searchParams.set('role', params.role);
      if (params.sort) searchParams.set('sort', params.sort);

      const res = await fetch(`/api/users?${searchParams.toString()}`, {
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const mapped: User[] = (json.data || json.users || []).map(mapApiUser);

      setApiUsers(mapped);
      setTotalResults(json.pagination?.total || mapped.length);
      return true;
    } catch {
      setApiUsers([]);
      setTotalResults(0);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial mount fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchFromApi({ sort: 'newest', page: 1 });
      // Also fetch suggested users (verified, with followers)
      try {
        const sugRes = await fetch('/api/users?limit=6&sort=followers', {
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(5000),
        });
        if (sugRes.ok) {
          const sugJson = await sugRes.json();
          const sugData = (sugJson.data || []).map(mapApiUser);
          const sugFiltered = sugData.filter((u: User) => u.isVerified && (u.followerCount || 0) > 0);
          if (!cancelled) setSuggestedUsers(sugFiltered.slice(0, 6));
        }
      } catch { /* ignore */ }
      if (!cancelled) setPage(1);
    })();
    return () => { cancelled = true; };
  }, [fetchFromApi]);

  // Refetch when filters change
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchFromApi({
        search: query || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        sort: sortBy,
        page,
      });
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, roleFilter, sortBy, page, fetchFromApi]);

  // Reset page when filters change (except page itself)
  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, sortBy]);

  // ─── Auto-scroll carousel ───────────────────────
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    let scrollDir = 1;

    autoScrollRef.current = setInterval(() => {
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= maxScroll - 2) scrollDir = -1;
      if (el.scrollLeft <= 2) scrollDir = 1;
      el.scrollBy({ left: 240 * scrollDir, behavior: 'smooth' });
    }, 3500);

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
    };
  }, []);

  // Display users come directly from API (search + fuzzy matching happens server-side)
  const displayUsers = apiUsers;
  const totalPages = Math.max(1, Math.ceil(totalResults / limit));

  const clearFilters = () => {
    setQuery('');
    setRoleFilter('all');
    setSortBy('newest');
    setPage(1);
  };

  const activeFilterCount = [query, roleFilter !== 'all' ? roleFilter : ''].filter(Boolean).length;

  // ─── Follow handler ─────────────────────────────
  const handleToggleFollow = useCallback(async (userId: string) => {
    if (!isAuthenticated) {
      useAppStore.getState().setAuthModalOpen(true);
      return;
    }

    FollowState.setFollowLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const newSet = new Set(FollowState.getFollowedIds());
        if (data.following) {
          newSet.add(userId);
          toast.success('با موفقیت دنبال شد');
        } else {
          newSet.delete(userId);
          toast.info('دنبال کردن لغو شد');
        }
        FollowState.setFollowedIds(newSet);
      } else {
        // Optimistic toggle as fallback
        const newSet = new Set(FollowState.getFollowedIds());
        if (newSet.has(userId)) {
          newSet.delete(userId);
        } else {
          newSet.add(userId);
        }
        FollowState.setFollowedIds(newSet);
        toast.success(newSet.has(userId) ? 'دنبال شد' : 'دنبال‌شده لغو شد');
      }
    } catch {
      // Optimistic toggle
      const newSet = new Set(FollowState.getFollowedIds());
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      FollowState.setFollowedIds(newSet);
      toast.success(newSet.has(userId) ? 'دنبال شد' : 'دنبال‌شده لغو شد');
    } finally {
      FollowState.setFollowLoading(null);
    }
  }, [isAuthenticated]);

  const handleViewProfile = useCallback((userId: string) => {
    push('user-profile', { id: userId });
  }, [push]);

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ─── Header ────────────────────────────── */}
        <motion.div {...fadeIn} className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  کشف کاربران
                </h1>
                <Sparkles className="size-6 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? 'در حال بارگذاری...'
                  : `${totalResults.toLocaleString('fa-IR')} کاربر یافت شد`}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Search + Filters ──────────────────── */}
        <motion.div
          {...fadeIn}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="جستجو با نام، آیدی (@username)، شماره تلفن..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 w-full rounded-xl border-border/60 bg-card pr-10 pl-10 text-sm shadow-sm transition-shadow focus-visible:shadow-emerald-500/10 focus-visible:shadow-lg"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Role filter */}
            <div className="flex items-center gap-1.5 overflow-hidden rounded-xl border border-border/60 bg-card p-1">
              {ROLE_FILTERS.map((rf) => (
                <button
                  key={rf.value}
                  onClick={() => setRoleFilter(rf.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    roleFilter === rf.value
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="h-9 w-auto min-w-[150px] rounded-lg text-xs">
                <Clock className="size-3.5 ml-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs text-muted-foreground gap-1"
              >
                <X className="size-3" />
                حذف فیلترها
                <Badge variant="secondary" className="mr-1 size-5 rounded-full p-0 text-caption flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              </Button>
            )}
          </div>
        </motion.div>

        {/* ─── Featured Users Carousel ────────────── */}
        {!query && roleFilter === 'all' && suggestedUsers.length > 0 && (
          <motion.div
            {...fadeIn}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              <h2 className="text-base font-bold">پیشنهاد شده برای شما</h2>
              <Badge variant="secondary" className="rounded-lg text-caption">
                {suggestedUsers.length.toLocaleString('fa-IR')} نفر
              </Badge>
            </div>

            <div
              ref={carouselRef}
              className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 no-scrollbar"
              onMouseEnter={() => { if (autoScrollRef.current) clearInterval(autoScrollRef.current); }}
              onMouseLeave={() => {
                const el = carouselRef.current;
                if (!el) return;
                let dir = 1;
                autoScrollRef.current = setInterval(() => {
                  const max = el.scrollWidth - el.clientWidth;
                  if (el.scrollLeft >= max - 2) dir = -1;
                  if (el.scrollLeft <= 2) dir = 1;
                  el.scrollBy({ left: 240 * dir, behavior: 'smooth' });
                }, 3500);
              }}
            >
              {suggestedUsers.map((user) => (
                <FeaturedCard
                  key={user.id}
                  user={user}
                  onFollow={handleToggleFollow}
                  onView={handleViewProfile}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ─── Users Grid ────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/60 bg-card overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="animate-shimmer-loading size-12 rounded-full bg-muted/40 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="animate-shimmer-loading h-4 w-28 rounded-lg bg-muted/40" />
                      <div className="animate-shimmer-loading h-3 w-20 rounded-md bg-muted/30" />
                    </div>
                    <div className="animate-shimmer-loading h-5 w-14 rounded-lg bg-muted/30" />
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="animate-shimmer-loading h-3 w-full rounded-md bg-muted/30" />
                    <div className="animate-shimmer-loading h-3 w-3/4 rounded-md bg-muted/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4 rounded-xl bg-muted/30 p-3">
                    <div className="animate-shimmer-loading h-10 rounded-lg bg-muted/40" />
                    <div className="animate-shimmer-loading h-10 rounded-lg bg-muted/40" />
                  </div>
                  <div className="flex gap-2">
                    <div className="animate-shimmer-loading h-9 flex-1 rounded-xl bg-muted/30" />
                    <div className="animate-shimmer-loading h-9 flex-1 rounded-xl bg-muted/30" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : displayUsers.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              key={`${query}-${roleFilter}-${sortBy}-${page}`}
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {displayUsers.map((user) => (
                <motion.div key={user.id} variants={item}>
                  <UserCard
                    user={user}
                    onFollow={handleToggleFollow}
                    onView={handleViewProfile}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
