'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import Link from 'next/link';
import { mapApiSpecialistToProfile } from '@/services/business';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  MapPin,
  BadgeCheck,
  ArrowLeft,
  Briefcase,
  TrendingUp,
  MessageSquare,
  X,
  SlidersHorizontal,
  GitCompareArrows,
  LayoutGrid,
  List,
  Copy,
} from 'lucide-react';
import { StarRating } from '@/components/shared/StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import type { SpecialistProfile } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { SpecialistAvailabilityBadge } from '@/components/business/SpecialistAvailabilityBadge';
import { routeBuilder } from '@/config/routes';
import { useManagedLocations } from '@/lib/use-managed-locations';
import {
  buildUrlWithQuery,
  readPositivePage,
  readQueryValue,
  replaceBrowseUrl,
} from '@/lib/filter-routing';
import type { BrowseFilters } from '@/lib/filters/parser';
import { slugsToPersianNames } from '@/lib/search/city-slugs';

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

// ─── Sort options ─────────────────────────────────────
const SORT_OPTIONS = [
  { value: 'rating', label: 'بالاترین امتیاز' },
  { value: 'projects', label: 'بیشترین پروژه' },
  { value: 'newest', label: 'جدیدترین عضو' },
];

const SPECIALIST_FILTER_DEFAULTS = {
  q: '',
  skill: '',
  province: 'all',
  city: 'all',
  sort: 'rating',
  view: 'grid',
  page: 1,
};

const SPECIALISTS_PAGE_LIMIT = 6;

function readSpecialistFilters(search: string) {
  const params = new URLSearchParams(search);
  const view = readQueryValue(params, ['view'], 'grid');

  return {
    query: readQueryValue(params, ['q', 'search']),
    skill: readQueryValue(params, ['skill']),
    province: readQueryValue(params, ['province'], 'all') || 'all',
    city: readQueryValue(params, ['city'], 'all') || 'all',
    sort: readQueryValue(params, ['sort'], 'rating') || 'rating',
    view: view === 'list' ? 'list' as const : 'grid' as const,
    page: readPositivePage(params, 1),
  };
}



// ─── Skill level dots ─────────────────────────────────
function SkillLevelDots({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`سطح مهارت: ${level} از ۵`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`size-1.5 rounded-full ${
            i < level ? 'bg-emerald-500' : 'bg-muted-foreground/20'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Specialist Card (Grid Mode) ──────────────────────────
function SpecialistCard({ specialist }: { specialist: SpecialistProfile }) {
  const { toggleCompareSpecialist, compareSpecialistIds} = useAppStore();
  const { navigateTo } = useNavigate();
  const profileHref = routeBuilder.pro(specialist.id);
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');
  const isCompared = compareSpecialistIds.includes(specialist.id);

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={routeBuilder.pro(specialist.id)}>
      <CardContent className="p-6">
        {/* Top: Avatar + Name + Actions */}
        <div className="mb-4 flex items-start gap-3">
          <div className="relative">
            <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-primary/20 ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-label="آنلاین" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold">{specialist.displayName}</h2>
              {specialist.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label="احراز هویت شده" />
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {specialist.city}
            </div>
            <div className="mt-1">
              <SpecialistAvailabilityBadge
                isOnline={specialist.online}
                responseTime={specialist.responseTime}
                size="sm"
              />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <BookmarkButton itemId={specialist.id} itemType="specialist" size="sm" />
            <button
              onClick={(e) => { e.stopPropagation(); toggleCompareSpecialist(specialist.id); }}
              className={`rounded-lg p-1.5 transition-colors ${isCompared ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-label={`${isCompared ? 'حذف از مقایسه' : 'افزودن به مقایسه'} ${specialist.displayName}`}
            >
              <GitCompareArrows className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Rating + Projects */}
        <div className="mb-4 flex items-center justify-between">
          <StarRating rating={specialist.rating} size="sm" showValue />
          <span className="text-xs text-muted-foreground">
            {specialist.projectCount.toLocaleString('fa-IR')} پروژه
          </span>
        </div>

        {/* Skills */}
        <div className="mb-4">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {specialist.skills.slice(0, 3).map((skill) => (
              <Badge
                key={skill.name}
                variant="secondary"
                className="rounded-lg bg-primary/5 text-caption font-medium text-foreground hover:bg-primary/10"
              >
                {skill.name}
                <SkillLevelDots level={skill.level} />
              </Badge>
            ))}
            {specialist.skills.length > 3 && (
              <Badge variant="outline" className="rounded-lg text-caption">
                +{specialist.skills.length - 3}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-3.5 ring-1 ring-border/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" aria-hidden="true" />
            <div>
              <span className="text-xs text-muted-foreground">تکمیل</span>
              <p className="text-xs font-bold">{specialist.completionRate.toLocaleString('fa-IR')}٪</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-emerald-500" aria-hidden="true" />
            <div>
              <span className="text-xs text-muted-foreground">پاسخ‌دهی</span>
              <p className="text-xs font-bold">{specialist.responseRate.toLocaleString('fa-IR')}٪</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            asChild
            variant="outline"
            className="h-10 flex-1 rounded-xl text-sm font-medium"
          >
            <Link
              href={profileHref}
              aria-label={`مشاهده پروفایل ${specialist.displayName}`}
            >
              مشاهده پروفایل
              <ArrowLeft className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            onClick={() => navigateTo('messages')}
            size="icon"
            variant="outline"
            className="h-10 w-10 shrink-0 rounded-xl"
            aria-label={`ارسال پیام به ${specialist.displayName}`}
          >
            <MessageSquare className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Specialist Card (List Mode) ──────────────────────────
function SpecialistListCard({ specialist }: { specialist: SpecialistProfile }) {
  const { toggleCompareSpecialist, compareSpecialistIds} = useAppStore();
  const { navigateTo } = useNavigate();
  const profileHref = routeBuilder.pro(specialist.id);
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');
  const isCompared = compareSpecialistIds.includes(specialist.id);

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={routeBuilder.pro(specialist.id)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Avatar on right */}
          <div className="relative shrink-0">
            <div className={`size-14 rounded-full flex items-center justify-center text-base font-bold ring-2 ring-primary/20 ${colorClass}`} aria-hidden="true">
              {initials}
            </div>
            {specialist.online && (
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-card bg-emerald-500" aria-label="آنلاین" />
            )}
          </div>

          {/* Name + Bio + Skills - center */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold">{specialist.displayName}</h2>
              {specialist.isVerified && (
                <BadgeCheck className="size-4 shrink-0 fill-emerald-500 text-white" aria-label="احراز هویت شده" />
              )}
            </div>
            {specialist.bio && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {specialist.bio}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specialist.skills.slice(0, 4).map((skill) => (
                <Badge
                  key={skill.name}
                  variant="secondary"
                  className="rounded-md bg-primary/5 text-caption font-medium text-foreground hover:bg-primary/10"
                >
                  {skill.name}
                </Badge>
              ))}
              {specialist.skills.length > 4 && (
                <Badge variant="outline" className="rounded-md text-caption">
                  +{specialist.skills.length - 4}
                </Badge>
              )}
            </div>
          </div>

          {/* Stats column - hidden on small screens */}
          <div className="hidden shrink-0 flex-col items-center gap-2 lg:flex">
            <div className="text-center">
              <StarRating rating={specialist.rating} size="xs" showValue />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3" aria-hidden="true" />
                {specialist.projectCount.toLocaleString('fa-IR')}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="size-3 text-emerald-500" aria-hidden="true" />
                {specialist.completionRate.toLocaleString('fa-IR')}٪
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden="true" />
              {specialist.city}
            </div>
          </div>

          {/* CTA buttons on left */}
          <div className="flex shrink-0 items-center gap-2">
            <BookmarkButton itemId={specialist.id} itemType="specialist" size="sm" />
            <Button asChild variant="outline" className="h-9 rounded-lg px-3 text-xs font-medium">
              <Link
                href={profileHref}
                aria-label={`مشاهده پروفایل ${specialist.displayName}`}
              >
                پروفایل
                <ArrowLeft className="size-3" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              onClick={() => navigateTo('messages')}
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label={`ارسال پیام به ${specialist.displayName}`}
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleCompareSpecialist(specialist.id); }}
              className={`rounded-lg p-1.5 transition-colors ${isCompared ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
              aria-label={`${isCompared ? 'حذف از مقایسه' : 'افزودن به مقایسه'} ${specialist.displayName}`}
            >
              <GitCompareArrows className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Floating Compare Bar ─────────────────────────────
function CompareBar() {
  const { compareSpecialistIds, clearCompareList } = useAppStore();
  const { navigateTo } = useNavigate();
  const count = compareSpecialistIds.length;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 -translate-x-1/2" role="status" aria-label={`${count} کسب‌وکار برای مقایسه انتخاب شده`}>
      <div className="flex items-center gap-3 rounded-2xl border border-border/40 bg-card/95 px-5 py-3 shadow-2xl backdrop-blur-xl ring-1 ring-black/5">
        <GitCompareArrows className="size-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium">
          {count.toLocaleString('fa-IR')} کسب‌وکار انتخاب شده
        </span>
        {count >= 2 && (
          <Button
            size="sm"
            onClick={() => navigateTo('compare-specialists')}
            className="rounded-lg"
            data-href="/compare"
            aria-label="مقایسه کسب‌وکارها"
          >
            مقایسه کنید
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={clearCompareList} className="text-xs text-muted-foreground" aria-label="پاک کردن لیست مقایسه" title="پاک کردن لیست مقایسه کسب‌وکارها">
          پاک کردن
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────
interface BrowseSpecialistsProps {
  basePath?: string;
  categorySlug?: string;
  citySlugs?: string[];
  urlFilters?: BrowseFilters;
}

export function BrowseSpecialists({
  basePath = '/browse?type=business',
  citySlugs = [],
  urlFilters,
}: BrowseSpecialistsProps = {}) {
  const { navigateTo } = useNavigate();
  const { provinces, cities } = useManagedLocations();

  // Filters state
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUrlReady, setIsUrlReady] = useState(false);
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const currentPathname = basePath.split('?')[0];
  const urlCityNames = useMemo(() => slugsToPersianNames(citySlugs), [citySlugs]);
  const hasUrlCityFilter = urlCityNames.length > 0;
  const preservedFilters = useMemo(
    () => ({
      type: urlFilters?.type ?? 'business',
      cities: urlFilters?.cities ?? [],
      q: urlFilters?.q ?? undefined,
      sort: urlFilters?.sort,
      verified: urlFilters?.verified ?? undefined,
      hasPhoto: urlFilters?.hasPhoto ?? undefined,
      urgent: urlFilters?.urgent ?? undefined,
      recent: urlFilters?.recent ?? undefined,
      priceMin: urlFilters?.priceMin ?? undefined,
      priceMax: urlFilters?.priceMax ?? undefined,
      status: urlFilters?.status ?? undefined,
    }),
    [urlFilters]
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
      skill: skillFilter,
      province: provinceFilter,
      city: cityFilter,
      sort: sortBy,
      view: viewMode,
      page: currentPage,
    },
    SPECIALIST_FILTER_DEFAULTS
  );

  const activeFilterCount = [
    query,
    skillFilter,
    provinceFilter !== 'all' ? provinceFilter : '',
    cityFilter !== 'all' ? cityFilter : '',
  ].filter(Boolean).length;

  const applyFiltersFromUrl = useCallback((search: string) => {
    const nextFilters = readSpecialistFilters(search);
    setQuery(nextFilters.query);
    setSkillFilter(nextFilters.skill);
    setProvinceFilter(nextFilters.province);
    setCityFilter(nextFilters.city);
    setSortBy(nextFilters.sort);
    setViewMode(nextFilters.view);
    setCurrentPage(nextFilters.page);
    setShowFilters(Boolean(nextFilters.query || nextFilters.skill || nextFilters.province !== 'all' || nextFilters.city !== 'all'));
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

    replaceBrowseUrl(
      currentPathname,
      {
        q: query,
        skill: skillFilter,
        province: hasUrlCityFilter ? undefined : provinceFilter,
        city: hasUrlCityFilter ? undefined : cityFilter,
        sort: sortBy,
        view: viewMode,
        page: currentPage,
      },
      SPECIALIST_FILTER_DEFAULTS,
      preservedFilters
    );
  }, [
    cityFilter,
    currentPage,
    currentPathname,
    hasUrlCityFilter,
    isUrlReady,
    preservedFilters,
    provinceFilter,
    query,
    skillFilter,
    sortBy,
    viewMode,
  ]);

  const fetchSpecialists = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(hasUrlCityFilter ? 1 : currentPage));
      params.set('limit', String(hasUrlCityFilter ? 50 : SPECIALISTS_PAGE_LIMIT));
      if (query.trim()) params.set('search', query.trim());
      if (skillFilter.trim()) params.set('skill', skillFilter.trim());
      if (!hasUrlCityFilter && provinceFilter !== 'all') params.set('province', provinceFilter);
      if (!hasUrlCityFilter && cityFilter !== 'all') params.set('city', cityFilter);
      const apiSort =
        sortBy === 'projects' ? 'most_projects' : sortBy === 'newest' ? 'newest' : 'rating';
      params.set('sort', apiSort);

      const res = await fetch(`/api/specialists?${params.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      let rows: SpecialistProfile[] = (json.data ?? []).map(mapApiSpecialistToProfile);

      if (hasUrlCityFilter) {
        const names = new Set(urlCityNames);
        rows = rows.filter((s) => s.city != null && names.has(s.city));
        setTotalCount(rows.length);
        setTotalPages(Math.max(1, Math.ceil(rows.length / SPECIALISTS_PAGE_LIMIT)));
        const start = (currentPage - 1) * SPECIALISTS_PAGE_LIMIT;
        rows = rows.slice(start, start + SPECIALISTS_PAGE_LIMIT);
      } else {
        setTotalCount(json.pagination?.total ?? rows.length);
        setTotalPages(json.pagination?.totalPages ?? 1);
      }

      setSpecialists(rows);
    } catch (err) {
      console.error('Error fetching specialists:', err);
      setSpecialists([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [
    cityFilter,
    currentPage,
    hasUrlCityFilter,
    provinceFilter,
    query,
    skillFilter,
    sortBy,
    urlCityNames,
  ]);

  useEffect(() => {
    if (!isUrlReady) return;
    const timer = setTimeout(() => {
      fetchSpecialists();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSpecialists, isUrlReady]);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleSpecialists = specialists;

  const setPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setQuery('');
    setSkillFilter('');
    setProvinceFilter('all');
    setCityFilter('all');
    setSortBy('rating');
    setViewMode('grid');
    setCurrentPage(1);
  };

  const copyCurrentLink = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}${currentShareUrl}`);
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-gradient-to-l from-foreground to-foreground/80 bg-clip-text">
                کسب‌وکارها
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {totalCount.toLocaleString('fa-IR')} کسب‌وکار یافت شد
              </p>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-lg border border-border/40 shadow-sm" role="radiogroup" aria-label="نحوه نمایش">
                <button
                  onClick={() => {
                    setViewMode('grid');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center p-2 transition-colors ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  aria-label="نمای شبکه‌ای"
                  role="radio"
                  aria-checked={viewMode === 'grid'}
                  title="نمایش به صورت شبکه‌ای"
                >
                  <LayoutGrid className="size-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center p-2 transition-colors ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  aria-label="نمای لیستی"
                  role="radio"
                  aria-checked={viewMode === 'list'}
                  title="نمایش به صورت لیستی"
                >
                  <List className="size-4" aria-hidden="true" />
                </button>
              </div>
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
              {/* Filter button */}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="gap-2"
                aria-label="نمایش فیلترها"
                title="نمایش و مخفی کردن فیلترهای جستجوی کسب‌وکارها"
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                فیلترها
                {activeFilterCount > 0 && (
                  <Badge className="mr-1 size-5 rounded-full p-0 text-caption flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="جستجوی نام، تخصص یا مهارت..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="جستجوی کسب‌وکارها"
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Skill filter */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="skill-filter">
                      مهارت
                    </label>
                    <div className="relative">
                      <Input
                        id="skill-filter"
                        placeholder="مثلاً React، طراحی..."
                        value={skillFilter}
                        onChange={(e) => {
                          setSkillFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="h-9 w-full rounded-lg text-sm"
                        aria-label="فیلتر مهارت"
                      />
                      {skillFilter && (
                        <button
                          onClick={() => {
                            setSkillFilter('');
                            setCurrentPage(1);
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label="پاک کردن فیلتر مهارت"
                          title="پاک کردن فیلتر مهارت"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Province */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="province-filter">
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
                      <SelectTrigger className="w-full rounded-lg" id="province-filter">
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
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="city-filter">
                      شهر
                    </label>
                    <Select
                      value={cityFilter}
                      onValueChange={(value) => {
                        setCityFilter(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg" id="city-filter">
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
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="sort-filter">
                      مرتب‌سازی
                    </label>
                    <Select
                      value={sortBy}
                      onValueChange={(value) => {
                        setSortBy(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-full rounded-lg" id="sort-filter">
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
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-muted-foreground" aria-label="حذف همه فیلترها">
                      <X className="size-3" aria-hidden="true" />
                      حذف همه فیلترها
                    </Button>
                  </div>
                )}

                <div className="mt-5 grid gap-4 border-t border-border/50 pt-5 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xs font-black text-muted-foreground">لینک استان‌ها</h3>
                    <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-2">
                      {provinces.map((province) => (
                        <Link
                          key={province.id}
                          href={buildUrlWithQuery(currentPathname, { province: province.name })}
                          className="rounded-full border bg-background px-2 py-1 text-caption hover:border-emerald-400 hover:text-emerald-600"
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
                          className="rounded-full border bg-background px-2 py-1 text-caption hover:border-emerald-400 hover:text-emerald-600"
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
                <button onClick={() => { setQuery(''); setCurrentPage(1); }} aria-label="حذف فیلتر جستجو"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {skillFilter && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                {skillFilter}
                <button onClick={() => { setSkillFilter(''); setCurrentPage(1); }} aria-label="حذف فیلتر مهارت"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {provinceFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {selectedProvince?.name || provinceFilter}
                <button onClick={() => { setProvinceFilter('all'); setCityFilter('all'); setCurrentPage(1); }} aria-label="حذف فیلتر استان"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            {cityFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1.5 rounded-lg pl-1.5" role="listitem">
                <MapPin className="size-3" aria-hidden="true" />
                {cityFilter}
                <button onClick={() => { setCityFilter('all'); setCurrentPage(1); }} aria-label="حذف فیلتر شهر"><X className="size-3" aria-hidden="true" /></button>
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs text-muted-foreground" title="حذف همه فیلترهای فعال">
              حذف همه
            </Button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {Array.from({ length: SPECIALISTS_PAGE_LIMIT }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : visibleSpecialists.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted" aria-hidden="true">
              <Search className="size-8 text-muted-foreground/50" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">کسب‌وکاری یافت نشد</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearFilters} title="حذف فیلترها و نمایش همه کسب‌وکارها">
              حذف فیلترها
            </Button>
          </div>
        ) : (
          <>
            <div
              key={`${query}-${skillFilter}-${cityFilter}-${sortBy}-${viewMode}`}
              className={viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex flex-col gap-4'
              }
              itemScope
              itemType="https://schema.org/ItemList"
            >
              <meta itemProp="numberOfItems" content={String(totalCount)} />
              <meta itemProp="name" content="فهرست کسب‌وکارها در نیاز فایندر" />
              {visibleSpecialists.map((specialist) => (
                <div key={specialist.id} itemProp="itemListElement">
                  {viewMode === 'grid' ? (
                    <SpecialistCard specialist={specialist} />
                  ) : (
                    <SpecialistListCard specialist={specialist} />
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="صفحه‌بندی کسب‌وکارها">
                <Button
                  variant="outline"
                  onClick={() => setPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-xl"
                  title="صفحه قبلی"
                >
                  صفحه قبلی
                </Button>
                <Badge variant="secondary" className="rounded-xl px-4 py-2">
                  صفحه {safeCurrentPage.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage >= totalPages}
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

      {/* Floating Compare Bar */}
      <CompareBar />

      <noscript>
        <div className="sr-only" itemScope itemType="https://schema.org/ItemList">
          <h1>فهرست کسب‌وکارها در نیاز فایندر</h1>
          <p>فهرست کسب‌وکارهای خدمات ثبت شده در پلتفرم. شامل کسب‌وکارهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
    </div>
  );
}
