'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  DollarSign,
  FileText,
  Flame,
  Clock,
  X,
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
  Copy,
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
import { formatBudgetRange, getTimeAgo, getPriorityLabel } from '@/lib/constants';
import type { ServiceRequest, Category } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { useManagedLocations } from '@/lib/use-managed-locations';
import {
  buildUrlWithQuery,
  findCategoryByRouteValue,
  flattenCategories,
  getCategoryRouteValue,
  readPositivePage,
  readQueryValue,
  replaceBrowserUrl,
} from '@/lib/filter-routing';

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

const REQUEST_FILTER_DEFAULTS = {
  q: '',
  category: 'all',
  province: 'all',
  city: 'all',
  sort: 'newest',
  page: 1,
};

function readRequestFilters(search: string) {
  const params = new URLSearchParams(search);
  return {
    query: readQueryValue(params, ['q', 'search']),
    category: readQueryValue(params, ['category', 'categoryId'], 'all') || 'all',
    province: readQueryValue(params, ['province'], 'all') || 'all',
    city: readQueryValue(params, ['city'], 'all') || 'all',
    sort: readQueryValue(params, ['sort'], 'newest') || 'newest',
    page: readPositivePage(params, 1),
  };
}

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
function RequestCard({
  request,
  onClick,
  dataHref,
  categoryHref,
  cityHref,
}: {
  request: ServiceRequest;
  onClick: () => void;
  dataHref?: string;
  categoryHref?: string;
  cityHref?: string;
}) {
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
            {categoryHref ? (
              <Link
                href={categoryHref}
                onClick={(event) => event.stopPropagation()}
                className="max-w-[140px] truncate text-xs font-semibold text-muted-foreground hover:text-emerald-600"
              >
                {request.categoryName}
              </Link>
            ) : (
              <span className="text-xs font-semibold text-muted-foreground truncate max-w-[140px]">
                {request.categoryName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <BookmarkButton itemId={request.id} itemType="request" size="sm" />
            <PriorityBadge priority={request.priority} />
          </div>
        </div>

        {/* Title */}
        <Link
          href={dataHref || `/request/${request.id}`}
          onClick={(event) => event.stopPropagation()}
          className="mb-2 block text-sm font-bold leading-snug line-clamp-2 transition-colors group-hover:text-emerald-600"
        >
          {request.title}
        </Link>

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
              {cityHref ? (
                <Link
                  href={cityHref}
                  onClick={(event) => event.stopPropagation()}
                  className="hover:text-emerald-600"
                >
                  {request.city}
                </Link>
              ) : (
                <span>{request.city}</span>
              )}
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
export function BrowseRequests({ basePath = '/browse-requests' }: { basePath?: string } = {}) {
  const navigateTo = useAppStore((s) => s.navigateTo);
  const categories = useAppStore((s) => s.categories);
  const fetchCategories = useAppStore((s) => s.fetchCategories);
  const { provinces, cities } = useManagedLocations();

  // Filters state
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [isUrlReady, setIsUrlReady] = useState(false);

  // Data state
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_LIMIT = 9;
  const currentPathname = basePath;
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);
  const selectedCategory = useMemo(
    () => findCategoryByRouteValue(flatCategories, categoryFilter),
    [categoryFilter, flatCategories]
  );
  const selectedProvince = useMemo(
    () => provinces.find((province) => province.name === provinceFilter || province.id === provinceFilter),
    [provinceFilter, provinces]
  );
  const filteredCities = useMemo(
    () => (selectedProvince ? selectedProvince.cities : cities),
    [cities, selectedProvince]
  );
  const cityLinkItems = useMemo(
    () => provinces.flatMap((province) => province.cities.map((city) => ({ city, province }))),
    [provinces]
  );
  const currentShareUrl = buildUrlWithQuery(
    currentPathname,
    {
      q: query,
      category: categoryFilter,
      province: provinceFilter,
      city: cityFilter,
      sort: sortBy,
      page: currentPage,
    },
    REQUEST_FILTER_DEFAULTS
  );

  const activeFilterCount = [
    query,
    categoryFilter !== 'all' ? categoryFilter : '',
    provinceFilter !== 'all' ? provinceFilter : '',
    cityFilter !== 'all' ? cityFilter : '',
  ].filter(Boolean).length;

  // Fetch categories on mount
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  const applyFiltersFromUrl = useCallback((search: string) => {
    const nextFilters = readRequestFilters(search);
    setQuery(nextFilters.query);
    setCategoryFilter(nextFilters.category);
    setProvinceFilter(nextFilters.province);
    setCityFilter(nextFilters.city);
    setSortBy(nextFilters.sort);
    setCurrentPage(nextFilters.page);
    setShowFilters(Boolean(nextFilters.query || nextFilters.category !== 'all' || nextFilters.province !== 'all' || nextFilters.city !== 'all'));
    setIsUrlReady(true);
  }, []);

  useEffect(() => {
    queueMicrotask(() => applyFiltersFromUrl(window.location.search));

    const handlePopState = () => {
      applyFiltersFromUrl(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyFiltersFromUrl]);

  useEffect(() => {
    if (!isUrlReady) return;

    replaceBrowserUrl(
      currentPathname,
      {
        q: query,
        category: categoryFilter,
        province: provinceFilter,
        city: cityFilter,
        sort: sortBy,
        page: currentPage,
      },
      REQUEST_FILTER_DEFAULTS
    );
  }, [categoryFilter, cityFilter, currentPage, currentPathname, isUrlReady, provinceFilter, query, sortBy]);

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
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (provinceFilter !== 'all') params.set('province', provinceFilter);
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
    [query, categoryFilter, provinceFilter, cityFilter, sortBy]
  );

  // Re-fetch when URL-backed filters change
  useEffect(() => {
    if (!isUrlReady) return;

    const timer = setTimeout(() => {
      fetchRequests(currentPage);
    }, 350);

    return () => clearTimeout(timer);
  }, [currentPage, fetchRequests, isUrlReady]);

  const setPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), Math.max(totalPages, 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setQuery('');
    setCategoryFilter('all');
    setProvinceFilter('all');
    setCityFilter('all');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const copyCurrentLink = async () => {
    const absoluteUrl = `${window.location.origin}${currentShareUrl}`;
    await navigator.clipboard?.writeText(absoluteUrl);
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
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <Button
                onClick={copyCurrentLink}
                variant="outline"
                className="gap-2"
                aria-label="کپی لینک همین فیلترها"
                title="کپی لینک قابل اشتراک همین فیلترها"
              >
                <Copy className="size-4" aria-hidden="true" />
                کپی لینک
              </Button>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="gap-2"
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
        </div>

        {/* Search bar — always visible */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="جستجو در عنوان، توضیحات یا تگ‌ها..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="جستجو در نیازها"
              className="h-12 w-full rounded-xl border-border/50 bg-card/80 backdrop-blur-sm pr-10 text-sm shadow-md shadow-black/[0.03] focus-visible:shadow-lg focus-visible:shadow-emerald-500/[0.06] focus-visible:border-emerald-300/50 dark:focus-visible:border-emerald-700/50 transition-shadow"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setCurrentPage(1);
                }}
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
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Category */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="filter-category">
                      دسته‌بندی
                    </label>
                    <Select
                      value={categoryFilter}
                      onValueChange={(value) => {
                        setCategoryFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg" id="filter-category">
                        <SelectValue placeholder="همه دسته‌بندی‌ها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه دسته‌بندی‌ها</SelectItem>
                        {flatCategories.map((cat) => (
                          <SelectItem key={cat.id} value={getCategoryRouteValue(cat)}>
                            {cat.level ? `— ${cat.name}` : cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Province */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="filter-province">
                      استان
                    </label>
                    <Select
                      value={provinceFilter}
                      onValueChange={(value) => {
                        setProvinceFilter(value);
                        setCityFilter('all');
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg" id="filter-province">
                        <SelectValue placeholder="همه استان‌ها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه استان‌ها</SelectItem>
                        {provinces.map((province) => (
                          <SelectItem key={province.id} value={province.name}>
                            {province.name}
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
                    <Select
                      value={cityFilter}
                      onValueChange={(value) => {
                        setCityFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg" id="filter-city">
                        <SelectValue placeholder="همه شهرها" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">همه شهرها</SelectItem>
                        {filteredCities.map((city) => (
                          <SelectItem key={city.id} value={city.name}>
                            {city.name}
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
                    <Select
                      value={sortBy}
                      onValueChange={(value) => {
                        setSortBy(value);
                        setCurrentPage(1);
                      }}
                    >
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

                <div className="mt-5 grid gap-4 border-t border-border/50 pt-5 lg:grid-cols-3">
                  <div>
                    <h3 className="mb-2 text-xs font-black text-muted-foreground">لینک دسته‌بندی‌ها</h3>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                      {flatCategories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={buildUrlWithQuery(currentPathname, { category: getCategoryRouteValue(cat) })}
                          className="rounded-full border bg-background px-2 py-1 text-[11px] hover:border-emerald-400 hover:text-emerald-600"
                        >
                          {cat.level ? `زیر‌دسته: ${cat.name}` : cat.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-black text-muted-foreground">لینک استان‌ها</h3>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                      {provinces.map((province) => (
                        <Link
                          key={province.id}
                          href={buildUrlWithQuery(currentPathname, { province: province.name })}
                          className="rounded-full border bg-background px-2 py-1 text-[11px] hover:border-emerald-400 hover:text-emerald-600"
                        >
                          {`استان ${province.name}`}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-black text-muted-foreground">لینک شهرها</h3>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                      {cityLinkItems.map(({ city, province }) => (
                        <Link
                          key={`${province.id}-${city.id}`}
                          href={buildUrlWithQuery(currentPathname, { province: province.name, city: city.name })}
                          className="rounded-full border bg-background px-2 py-1 text-[11px] hover:border-emerald-400 hover:text-emerald-600"
                        >
                          {`${city.name}، ${province.name}`}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Active filter chips when filters panel is closed */}
        {!showFilters && activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2" role="list" aria-label="فیلترهای فعال">
            {query && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                {query}
                <button onClick={() => { setQuery(''); setCurrentPage(1); }} aria-label="حذف فیلتر جستجو" title="حذف فیلتر جستجو"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {categoryFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                {selectedCategory?.name || categoryFilter}
                <button onClick={() => { setCategoryFilter('all'); setCurrentPage(1); }} aria-label="حذف فیلتر دسته‌بندی" title="حذف فیلتر دسته‌بندی"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {provinceFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {selectedProvince?.name || provinceFilter}
                <button onClick={() => { setProvinceFilter('all'); setCityFilter('all'); setCurrentPage(1); }} aria-label="حذف فیلتر استان" title="حذف فیلتر استان"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {cityFilter}
                <button onClick={() => { setCityFilter('all'); setCurrentPage(1); }} aria-label="حذف فیلتر شهر" title="حذف فیلتر شهر"><X className="size-3" aria-hidden="true" /></button>
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
              itemScope
              itemType="https://schema.org/ItemList"
            >
              <meta itemProp="numberOfItems" content={String(totalCount)} />
              <meta itemProp="name" content="نیازهای ثبت شده در نیاز فایندر" />
              {requests.map((request) => {
                const requestCategory = flatCategories.find((category) => category.id === request.categoryId);
                const categoryHref = requestCategory
                  ? buildUrlWithQuery(currentPathname, { category: getCategoryRouteValue(requestCategory) })
                  : buildUrlWithQuery(currentPathname, { category: request.categoryId });
                const cityHref = request.city
                  ? buildUrlWithQuery(currentPathname, { province: request.province, city: request.city })
                  : undefined;

                return (
                  <div key={request.id} itemProp="itemListElement">
                    <RequestCard
                      request={request}
                      onClick={() => navigateTo('request-detail', { id: request.id })}
                      dataHref={`/request/${request.id}`}
                      categoryHref={categoryHref}
                      cityHref={cityHref}
                    />
                  </div>
                );
              })}
            </div>

            {/* Standard pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="صفحه‌بندی نیازها">
                <Button
                  variant="outline"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage <= 1 || isLoading || loadingMore}
                  className="rounded-xl"
                  title="صفحه قبلی"
                >
                  صفحه قبلی
                </Button>
                <Badge variant="secondary" className="rounded-xl px-4 py-2">
                  صفحه {currentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= totalPages || isLoading || loadingMore}
                  className="rounded-xl"
                  title="صفحه بعدی"
                >
                  صفحه بعدی
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      <noscript>
        <div className="sr-only" itemScope itemType="https://schema.org/ItemList">
          <h1>نیازهای ثبت شده در نیاز فایندر</h1>
          <p>فهرست نیازهای خدمات ثبت شده توسط کاربران. شامل نیازهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
    </div>
  );
}
