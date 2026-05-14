'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  DollarSign,
  FileText,
  Flame,
  Clock,
  X,
  ChevronDown,
  Inbox,
  Globe,
  Palette,
  Smartphone,
  Monitor,
  Pen,
  BookOpen,
  Home as HomeIcon,
  Wrench,
  GraduationCap,
  Bot,
  Briefcase,
  Heart,
  Code,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { CITIES, formatBudgetRange, getTimeAgo, getPriorityLabel } from '@/lib/constants';
import type { ServiceRequest, Category } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';

// ─── Category icon mapping ──────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home: HomeIcon, Wrench, GraduationCap, Bot,
  Briefcase, Heart, Code, Layout: Monitor, Server: Monitor, Layers: Smartphone,
  Apple: Smartphone, FileCode: Code, Paintbrush: Palette, PencilRuler: Pen,
  Laptop: Monitor, Hammer: Wrench, School: GraduationCap, BotIcon: Bot,
  MessageCircle: Bot, Shield: Briefcase, Scale: Briefcase,
};

function renderCategoryIcon(iconName?: string | null) {
  const IconComponent = ICON_MAP[iconName || ''] || Globe;
  return <IconComponent className="size-4" />;
}

// ─── Sort options ─────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'newest', label: 'جدیدترین' },
  { value: 'budget_low', label: 'بودجه: کم به زیاد' },
  { value: 'budget_high', label: 'بودجه: زیاد به کم' },
  { value: 'most_proposals', label: 'بیشترین پیشنهاد' },
];

// ─── Avatar color generator ───────────────────────────
const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
];

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

// ─── Priority badge helper ────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string; icon: typeof Flame }> = {
    URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
    HIGH: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: Flame },
    NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
    LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  };
  const c = config[priority] || config.NORMAL;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`rounded-lg text-[11px] font-medium ${c.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

// ─── Request Card Skeleton ─────────────────────────────
function RequestCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/80">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-5/6 rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="size-7 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Request Card ─────────────────────────────────────
function RequestCard({ request, onClick, dataHref }: { request: ServiceRequest; onClick: () => void; dataHref?: string }) {
  const fullName = `${request.user.firstName} ${request.user.lastName}`;
  const initials = `${request.user.firstName.charAt(0)}${request.user.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(fullName);

  return (
    <Card
      onClick={onClick}
      role="article"
      data-href={dataHref}
      className="group cursor-pointer border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40"
    >
      <CardContent className="p-5 pb-6">
        {/* Top: Category + Priority + Bookmark */}
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
              {renderCategoryIcon(request.categoryIcon)}
            </span>
            <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
              {request.categoryName}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookmarkButton id={request.id} type="request" size="sm" />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-sm font-bold leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors">
          {request.title}
        </h2>

        {/* Description */}
        <p className="mb-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {request.description}
        </p>

        {/* Meta */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
            <span className="truncate font-medium">{formatBudgetRange(request.budgetMin, request.budgetMax)}</span>
          </div>
          {request.city && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span>{request.city}</span>
            </div>
          )}
        </div>

        {/* Bottom: Proposals + Time + User */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="size-3.5" aria-hidden="true" />
            <span>{request.proposalCount.toLocaleString('fa-IR')} پیشنهاد</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-muted-foreground/70">{getTimeAgo(request.createdAt)}</span>
            <div className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-white dark:ring-card ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────
export function BrowseRequests() {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const categories = useAppStore((s) => s.categories);
  const fetchCategories = useAppStore((s) => s.fetchCategories);

  // Filters state
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  // Data state
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_LIMIT = 9;

  const activeFilterCount = [
    query,
    categoryFilter !== 'all' ? categoryFilter : '',
    cityFilter !== 'all' ? cityFilter : '',
  ].filter(Boolean).length;

  // Fetch categories on mount
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  // Fetch requests from API
  const fetchRequests = useCallback(
    async (page: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(PAGE_LIMIT));
        params.set('status', 'OPEN');
        if (query.trim()) params.set('search', query.trim());
        if (categoryFilter !== 'all') params.set('categoryId', categoryFilter);
        if (cityFilter !== 'all') params.set('city', cityFilter);
        if (sortBy) params.set('sort', sortBy);

        const res = await fetch(`/api/requests?${params.toString()}`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();

        const mappedRequests: ServiceRequest[] = (json.data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description,
          budgetMin: r.budgetMin ?? undefined,
          budgetMax: r.budgetMax ?? undefined,
          budgetType: r.budgetType,
          deliveryTime: r.deliveryTime ?? undefined,
          deliveryUnit: r.deliveryUnit,
          city: r.city ?? undefined,
          province: r.province ?? undefined,
          categoryId: r.categoryId,
          categoryName: r.categoryName,
          categoryIcon: r.categoryIcon ?? undefined,
          priority: r.priority,
          status: r.status,
          tags: r.tags ?? [],
          viewCount: r.viewCount,
          proposalCount: r.proposalCount,
          user: {
            id: r.user.id,
            firstName: r.user.firstName,
            lastName: r.user.lastName,
            avatar: r.user.avatar ?? undefined,
            city: r.user.city ?? undefined,
            createdAt: String(r.user.createdAt),
          },
          createdAt: String(r.createdAt),
          updatedAt: String(r.updatedAt),
        }));

        if (append) {
          setRequests((prev) => [...prev, ...mappedRequests]);
        } else {
          setRequests(mappedRequests);
        }

        if (json.pagination) {
          setTotalCount(json.pagination.total);
          setTotalPages(json.pagination.totalPages);
          setCurrentPage(json.pagination.page);
        }
        setHasLoadedInitial(true);
      } catch (err) {
        console.error('Error fetching requests:', err);
      } finally {
        setIsLoading(false);
        setLoadingMore(false);
      }
    },
    [query, categoryFilter, cityFilter, sortBy]
  );

  // Re-fetch when filters change (excluding search query debounce)
  useEffect(() => {
    fetchRequests(1);
  }, [categoryFilter, cityFilter, sortBy, fetchRequests]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [query, fetchRequests]);

  // Load more handler
  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      fetchRequests(currentPage + 1, true);
    }
  };

  const clearFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setCityFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                نیازهای ثبت شده
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {hasLoadedInitial
                  ? `${totalCount.toLocaleString('fa-IR')} نیاز یافت شد`
                  : 'در حال جستجو...'}
              </p>
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="gap-2 self-start sm:self-auto"
              aria-label="نمایش فیلترها"
              title="نمایش و مخفی کردن فیلترهای جستجوی نیازها"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              فیلترها
              {activeFilterCount > 0 && (
                <Badge className="mr-1 size-5 rounded-full p-0 text-[10px] flex items-center justify-center">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Search bar — always visible */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="جستجو در عنوان، توضیحات یا تگ‌ها..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="جستجو در نیازها"
              className="h-12 w-full rounded-xl border-border/50 bg-card/80 backdrop-blur-sm pr-10 text-sm shadow-md shadow-black/[0.03] focus-visible:shadow-lg focus-visible:shadow-emerald-500/[0.06] focus-visible:border-emerald-300/50 dark:focus-visible:border-emerald-700/50 transition-shadow"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="پاک کردن جستجو"
                title="پاک کردن عبارت جستجو"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Expandable filter row */}
        {showFilters && (
          <div className="mb-6">
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/[0.03]">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Category */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="filter-category">
                      دسته‌بندی
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-full rounded-lg" id="filter-category">
                        <SelectValue placeholder="همه دسته‌بندی‌ها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* City */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="filter-city">
                      شهر
                    </label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger className="w-full rounded-lg" id="filter-city">
                        <SelectValue placeholder="همه شهرها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه شهرها</SelectItem>
                        {CITIES.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="filter-sort">
                      مرتب‌سازی
                    </label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full rounded-lg" id="filter-sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {activeFilterCount > 0 && (
                  <div className="mt-4 flex justify-start">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive" title="حذف همه فیلترهای فعال">
                      <X className="size-3" aria-hidden="true" />
                      حذف همه فیلترها
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active filter chips when filters panel is closed */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2" role="list" aria-label="فیلترهای فعال">
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                {categories.find((c) => c.id === categoryFilter)?.name}
                <button onClick={() => setCategoryFilter('all')} aria-label="حذف فیلتر دسته‌بندی" title="حذف فیلتر دسته‌بندی"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {cityFilter}
                <button onClick={() => setCityFilter('all')} aria-label="حذف فیلتر شهر" title="حذف فیلتر شهر"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground" title="حذف همه فیلترهای فعال">
              حذف همه
            </Button>
          </div>
        )}

        {/* Results */}
        {!hasLoadedInitial && isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="در حال بارگذاری نیازها" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/60">
              <Inbox className="size-8 text-muted-foreground/40" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">نتیجه‌ای یافت نشد</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground/70">
              لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters} title="حذف فیلترها و نمایش همه نتایج">
              حذف فیلترها
            </Button>
          </div>
        ) : (
          <>
            <div
              className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              itemscope
              itemtype="https://schema.org/ItemList"
            >
              <meta itemprop="numberOfItems" content={String(totalCount)} />
              <meta itemprop="name" content="نیازهای ثبت شده در نیاز فایندر" />
              {requests.map((request) => (
                <div key={request.id} itemprop="itemListElement">
                  <RequestCard
                    request={request}
                    onClick={() => navigateTo('request-detail', { id: request.id })}
                    dataHref={`/requests/${request.id}`}
                  />
                </div>
              ))}
            </div>

            {/* Loading more skeleton */}
            {loadingMore && (
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <RequestCardSkeleton key={`more-${i}`} />
                ))}
              </div>
            )}

            {/* Load more */}
            {currentPage < totalPages && !loadingMore && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleLoadMore}
                  className="rounded-xl px-8 gap-2"
                  data-href="/browse-requests"
                  title="نمایش نیازهای بیشتر"
                >
                  نمایش بیشتر
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <noscript>
        <div className="sr-only" itemscope itemtype="https://schema.org/ItemList">
          <h1>نیازهای ثبت شده در نیاز فایندر</h1>
          <p>فهرست نیازهای خدمات ثبت شده توسط کاربران. شامل نیازهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
    </div>
  );
}
