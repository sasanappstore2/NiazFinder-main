'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Users,
  FileText,
  Briefcase,
  X,
  MapPin,
  Star,
  BadgeCheck,
  Clock,
  Loader2,
  SearchX,
  ArrowLeft,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useDebounce } from '@/hooks/use-debounce';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserResult {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  role: string;
  isVerified: boolean;
  online: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  _score?: number;
}

interface RequestResult {
  id: string;
  title: string;
  slug: string;
  description: string;
  budgetMin: number | null;
  budgetMax: number | null;
  budgetType: string;
  priority: string;
  status: string;
  proposalCount: number;
  viewCount: number;
  categoryName: string;
  categoryIcon: string | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    city: string | null;
  };
  createdAt: string;
}

interface SpecialistResult {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  city: string | null;
  province: string | null;
  role: string;
  isVerified: boolean;
  isActive: boolean;
  online: boolean;
  rating: number;
  projectCount: number;
  completionRate: number;
  skills: { id: string; name: string; level: number }[];
  createdAt: string;
}

// ─── Helper: Generate gradient colors for avatar initials ─────────────────────

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-lime-500',
  'bg-fuchsia-500',
  'bg-sky-500',
  'bg-orange-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.trim();
  const last = lastName?.trim();
  if (first && last) return first[0] + last[0];
  if (first) return first.slice(0, 2);
  return '؟';
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'توافقی';
  if (min != null && max != null) return `${min.toLocaleString('fa-IR')} - ${max.toLocaleString('fa-IR')} تومان`;
  if (min != null) return `از ${min.toLocaleString('fa-IR')} تومان`;
  return `تا ${max!.toLocaleString('fa-IR')} تومان`;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'همین الان';
  if (diffMins < 60) return `${diffMins} دقیقه پیش`;
  if (diffHours < 24) return `${diffHours} ساعت پیش`;
  if (diffDays < 30) return `${diffDays} روز پیش`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ماه پیش`;
  return `${Math.floor(diffDays / 365)} سال پیش`;
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'URGENT': return { label: 'فوری', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' };
    case 'HIGH': return { label: 'بالا', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' };
    case 'LOW': return { label: 'کم', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700' };
    default: return null;
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'SPECIALIST': return { label: 'متخصص', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
    case 'ADMIN': return { label: 'مدیر', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
    case 'SUPER_ADMIN': return { label: 'سوپر ادمین', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
    default: return null;
  }
}

// ─── Result Card Components ───────────────────────────────────────────────────

function UserResultCard({ user, onNavigate }: { user: UserResult; onNavigate: (path: string) => void }) {
  const name = user.displayName || `${user.firstName} ${user.lastName}`;
  const initials = getInitials(user.firstName, user.lastName);
  const color = getAvatarColor(name);
  const roleBadge = getRoleBadge(user.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:shadow-md"
        onClick={() => onNavigate(`/profile/${user.id}`)}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar || undefined} alt={name} />
              <AvatarFallback className={`${color} text-white font-bold text-sm`}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {user.online && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              {user.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
              {roleBadge && (
                <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${roleBadge.className}`}>
                  {roleBadge.label}
                </Badge>
              )}
            </div>
            {user.username && (
              <p className="text-xs text-muted-foreground mb-1 truncate">@{user.username}</p>
            )}
            {user.bio && (
              <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
              {user.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.city}
                </span>
              )}
              <span>{user.followerCount} دنبال‌کننده</span>
            </div>
          </div>

          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RequestResultCard({ request, onNavigate }: { request: RequestResult; onNavigate: (path: string) => void }) {
  const priorityBadge = getPriorityBadge(request.priority);
  const userInitials = getInitials(request.user.firstName, request.user.lastName);
  const userColor = getAvatarColor(`${request.user.firstName} ${request.user.lastName}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:shadow-md"
        onClick={() => onNavigate(`/request/${request.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-9 w-9 mt-0.5 flex-shrink-0">
              <AvatarImage src={request.user.avatar || undefined} alt={request.user.firstName} />
              <AvatarFallback className={`${userColor} text-white text-xs`}>{userInitials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                  {request.title}
                </h3>
                {priorityBadge && (
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 flex-shrink-0 ${priorityBadge.className}`}>
                    {priorityBadge.label}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {request.categoryName}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{request.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground">{formatBudget(request.budgetMin, request.budgetMax)}</span>
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {request.proposalCount} پیشنهاد
                </span>
                {request.user.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {request.user.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {timeAgo(request.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SpecialistResultCard({ specialist, onNavigate }: { specialist: SpecialistResult; onNavigate: (path: string) => void }) {
  const name = specialist.displayName || `${specialist.firstName} ${specialist.lastName}`;
  const initials = getInitials(specialist.firstName, specialist.lastName);
  const color = getAvatarColor(name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className="group cursor-pointer border border-border/50 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 hover:shadow-md"
        onClick={() => onNavigate(`/specialist/${specialist.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="relative flex-shrink-0">
              <Avatar className="h-12 w-12">
                <AvatarImage src={specialist.avatar || undefined} alt={name} />
                <AvatarFallback className={`${color} text-white font-bold text-sm`}>{initials}</AvatarFallback>
              </Avatar>
              {specialist.online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                  {name}
                </h3>
                {specialist.isVerified && <BadgeCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
              </div>

              {specialist.bio && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{specialist.bio}</p>
              )}

              {specialist.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {specialist.skills.slice(0, 3).map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                      {skill.name}
                    </Badge>
                  ))}
                  {specialist.skills.length > 3 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                      +{specialist.skills.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                {specialist.rating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                    {specialist.rating.toFixed(1)}
                  </span>
                )}
                <span>{specialist.projectCount} پروژه</span>
                {specialist.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {specialist.city}
                  </span>
                )}
              </div>
            </div>

            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowLeft className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function UserSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-10" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpecialistSkeleton() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-3 w-56" />
            <div className="flex gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-18 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state component ────────────────────────────────────────────────────

function EmptyState({ type, query }: { type: 'initial' | 'no-results' | 'error'; query?: string }) {
  if (type === 'initial') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-semibold mb-2">جستجو در نیاز فایندر</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          کاربران، نیازها و متخصص‌ها را جستجو کنید.
          <br />
          عبارت مورد نظر خود را در بالا وارد کنید.
        </p>
      </motion.div>
    );
  }

  if (type === 'no-results') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">نتیجه‌ای یافت نشد</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          متأسفانه نتیجه‌ای برای &laquo;{query}&raquo; پیدا نشد.
          <br />
          لطفاً عبارت دیگری را جستجو کنید یا املای آن را بررسی نمایید.
        </p>
      </motion.div>
    );
  }

  // error
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <SearchX className="h-8 w-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">خطا در جستجو</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        در دریافت نتایج جستجو مشکلی پیش آمد.
        <br />
        لطفاً دوباره تلاش کنید.
      </p>
    </motion.div>
  );
}

// ─── Main Search Page Component ───────────────────────────────────────────────

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'specialists'>('users');
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [requestResults, setRequestResults] = useState<RequestResult[]>([]);
  const [specialistResults, setSpecialistResults] = useState<SpecialistResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 400);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);

  const handleNavigate = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  // ─── Fetch results when debounced query changes ──────────────────────
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setUserResults([]);
      setRequestResults([]);
      setSpecialistResults([]);
      setHasSearched(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        const params = new URLSearchParams({ q: debouncedQuery.trim(), limit: '20' });

        // Fetch users (public endpoint, no auth needed)
        const usersPromise = fetch(`/api/users?${params.toString()}`)
          .then((r) => {
            if (!r.ok) throw new Error('خطا در جستجوی کاربران');
            return r.json();
          })
          .then((data) => data.data || [])
          .catch(() => []);

        // Fetch requests (public endpoint)
        const requestsPromise = fetch(`/api/requests?search=${encodeURIComponent(debouncedQuery.trim())}&limit=20`)
          .then((r) => {
            if (!r.ok) throw new Error('خطا در جستجوی نیازها');
            return r.json();
          })
          .then((data) => data.data || [])
          .catch(() => []);

        // Fetch specialists (public endpoint)
        const specialistsPromise = fetch(`/api/specialists?search=${encodeURIComponent(debouncedQuery.trim())}&limit=20`)
          .then((r) => {
            if (!r.ok) throw new Error('خطا در جستجوی متخصص‌ها');
            return r.json();
          })
          .then((data) => data.data || [])
          .catch(() => []);

        const [users, requests, specialists] = await Promise.all([
          usersPromise,
          requestsPromise,
          specialistsPromise,
        ]);

        if (!cancelled) {
          setUserResults(users);
          setRequestResults(requests);
          setSpecialistResults(specialists);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'خطای ناشناخته');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  // ─── Update URL search params when query changes ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (query.trim()) {
      params.set('q', query.trim());
    } else {
      params.delete('q');
    }
    const newUrl = params.toString() ? `/search?${params.toString()}` : '/search';
    router.replace(newUrl, { scroll: false });
  }, [query, router, searchParams]);

  // ─── Get results for active tab ──────────────────────────────────────
  const currentResults = activeTab === 'users' ? userResults : activeTab === 'requests' ? requestResults : specialistResults;
  const totalResults = userResults.length + requestResults.length + specialistResults.length;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-12" dir="rtl">
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="جستجوی کاربران، نیازها، متخصص‌ها..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-10 pl-10 h-12 text-base rounded-xl border-border/60 focus-visible:border-emerald-400 focus-visible:ring-emerald-400/20 bg-background/80 backdrop-blur-sm"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {loading && (
            <Loader2 className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 animate-spin" />
          )}
        </div>
      </div>

      {/* Stats bar when there are results */}
      {hasSearched && !loading && debouncedQuery.trim() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-4 text-sm text-muted-foreground"
        >
          <span>
            نتایج جستجو برای <strong className="text-foreground">&laquo;{debouncedQuery.trim()}&raquo;</strong>
          </span>
          <Separator orientation="vertical" className="h-4" />
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {userResults.length} کاربر
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            {requestResults.length} نیاز
          </span>
          <span className="flex items-center gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {specialistResults.length} متخصص
          </span>
        </motion.div>
      )}

      {/* Initial empty state */}
      {!hasSearched && !debouncedQuery.trim() && (
        <EmptyState type="initial" />
      )}

      {/* Tabs & Results */}
      {hasSearched && debouncedQuery.trim() && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'users' | 'requests' | 'specialists')}
          className="w-full"
        >
          <TabsList className="w-full grid grid-cols-3 mb-4 h-10 bg-muted/50">
            <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              <span>کاربران</span>
              {userResults.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] mr-1">
                  {userResults.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1.5 text-xs sm:text-sm">
              <FileText className="h-4 w-4" />
              <span>نیازها</span>
              {requestResults.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] mr-1">
                  {requestResults.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="specialists" className="gap-1.5 text-xs sm:text-sm">
              <Briefcase className="h-4 w-4" />
              <span>متخصص‌ها</span>
              {specialistResults.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] mr-1">
                  {specialistResults.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <UserSkeleton key={i} />)}
              </div>
            ) : error && currentResults.length === 0 ? (
              <EmptyState type="error" />
            ) : currentResults.length === 0 ? (
              <EmptyState type="no-results" query={debouncedQuery.trim()} />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {userResults.map((user) => (
                    <UserResultCard key={user.id} user={user} onNavigate={handleNavigate} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="requests">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <RequestSkeleton key={i} />)}
              </div>
            ) : error && currentResults.length === 0 ? (
              <EmptyState type="error" />
            ) : currentResults.length === 0 ? (
              <EmptyState type="no-results" query={debouncedQuery.trim()} />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {requestResults.map((req) => (
                    <RequestResultCard key={req.id} request={req} onNavigate={handleNavigate} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="specialists">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <SpecialistSkeleton key={i} />)}
              </div>
            ) : error && currentResults.length === 0 ? (
              <EmptyState type="error" />
            ) : currentResults.length === 0 ? (
              <EmptyState type="no-results" query={debouncedQuery.trim()} />
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {specialistResults.map((spec) => (
                    <SpecialistResultCard key={spec.id} specialist={spec} onNavigate={handleNavigate} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* No results across all tabs */}
      {hasSearched && !loading && !error && totalResults === 0 && debouncedQuery.trim() && (
        <EmptyState type="no-results" query={debouncedQuery.trim()} />
      )}
    </div>
  );
}

// ─── Page with Suspense boundary (required for useSearchParams) ───────────────

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-12" dir="rtl">
          <div className="mb-6">
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-40" />
                    <div className="flex gap-3">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
