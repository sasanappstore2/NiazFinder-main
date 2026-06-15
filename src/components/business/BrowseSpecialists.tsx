'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import Link from 'next/link';
import { mapBusinessProfileToBrowseCard } from '@/services/business';
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  BadgeCheck,
  ArrowLeft,
  Briefcase,
  TrendingUp,
  MessageSquare,
  X,
  LayoutGrid,
  List,
  Map,
  Copy,
} from 'lucide-react';
import { BusinessMapSplitView } from '@/components/business/map/BusinessMapSplitView';
import { StarRating } from '@/components/shared/StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import type { SpecialistProfile } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { SpecialistAvailabilityBadge } from '@/components/business/SpecialistAvailabilityBadge';
import { routeBuilder } from '@/config/routes';
import { CANONICAL_CITIES, COUNTRY_SLUG } from '@/config/locations';

function specialistProfileHref(
  specialist: SpecialistProfile,
  fromPathname: string
): string {
  if (specialist.profileSlug) {
    return routeBuilder.businessProfile(specialist.profileSlug, { from: fromPathname });
  }
  return routeBuilder.pro(specialist.id);
}
import { useStartChat } from '@/hooks/use-start-chat';
import { useBusinessContact } from '@/hooks/use-business-contact';
import { replaceBrowseUrl } from '@/lib/filter-routing';
import { serializeFilters, type BrowseFilters } from '@/lib/filters/parser';
import { mapSortToBusinessApi } from '@/lib/browse/sort-map';
import { useBrowsePageHeading } from '@/hooks/use-browse-page-heading';
import { formatCountFa } from '@/lib/format/digits';
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
const SPECIALISTS_MAP_LIST_LIMIT = 40;

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
function SpecialistCard({
  specialist,
  fromPathname,
  onMessage,
}: {
  specialist: SpecialistProfile;
  fromPathname: string;
  onMessage: (specialist: SpecialistProfile) => void;
}) {
  const profileHref = specialistProfileHref(specialist, fromPathname);
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={profileHref}>
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
            onClick={(e) => {
              e.preventDefault();
              onMessage(specialist);
            }}
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
function SpecialistListCard({
  specialist,
  fromPathname,
  onMessage,
}: {
  specialist: SpecialistProfile;
  fromPathname: string;
  onMessage: (specialist: SpecialistProfile) => void;
}) {
  const profileHref = specialistProfileHref(specialist, fromPathname);
  const initials = `${specialist.firstName.charAt(0)}${specialist.lastName.charAt(0)}`;
  const colorClass = getAvatarColor(specialist.displayName ?? '');

  return (
    <Card className="group border-border/50 bg-card overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/[0.07] hover:border-emerald-300/60 dark:hover:border-emerald-700/60 ring-0 hover:ring-1 hover:ring-emerald-200/40 dark:hover:ring-emerald-800/40" data-href={profileHref}>
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMessage(specialist);
              }}
              size="icon"
              variant="outline"
              className="h-9 w-9 shrink-0 rounded-lg"
              aria-label={`ارسال پیام به ${specialist.displayName}`}
            >
              <MessageSquare className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────
interface BrowseSpecialistsProps {
  basePath?: string;
  categorySlug?: string;
  citySlugs?: string[];
  urlFilters?: BrowseFilters;
  serverRenderedHeading?: boolean;
}

export function BrowseSpecialists({
  basePath = '/b/iran',
  categorySlug,
  citySlugs = [],
  urlFilters,
  serverRenderedHeading = false,
}: BrowseSpecialistsProps = {}) {
  const { navigateTo } = useNavigate();
  const pathname = usePathname();
  const router = useRouter();
  const { openChat } = useStartChat();
  const { openBusinessContact, picker } = useBusinessContact();

  const handleSpecialistMessage = useCallback(
    (specialist: SpecialistProfile) => {
      if (specialist.profileSlug) {
        void openBusinessContact({ businessSlug: specialist.profileSlug });
      } else {
        void openChat(specialist.id);
      }
    },
    [openBusinessContact, openChat]
  );

  const [query, setQuery] = useState(urlFilters?.q ?? '');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [isUrlReady, setIsUrlReady] = useState(true);
  const [specialists, setSpecialists] = useState<SpecialistProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const currentPathname = basePath.split('?')[0];
  const { h1: pageH1, displayH1 } = useBrowsePageHeading('business');
  const provinceSlugs = urlFilters?.provinces ?? [];
  const hasLocationScope = citySlugs.length > 0 || provinceSlugs.length > 0;
  const singleCitySlug = citySlugs.length === 1 ? citySlugs[0] : null;
  const preservedFilters = useMemo(
    () => ({
      type: 'business' as const,
      cities: urlFilters?.cities ?? [],
      provinces: urlFilters?.provinces ?? [],
      neighborhoods: urlFilters?.neighborhoods ?? [],
      q: urlFilters?.q ?? undefined,
      sort: urlFilters?.sort,
      verified: urlFilters?.verified ?? undefined,
    }),
    [urlFilters]
  );
  const currentShareUrl = useMemo(() => {
    const params = serializeFilters({ ...preservedFilters, q: query || null, type: 'business' });
    const qs = params.toString();
    return qs ? `${currentPathname}?${qs}` : currentPathname;
  }, [currentPathname, preservedFilters, query]);

  useEffect(() => {
    setQuery(urlFilters?.q ?? '');
  }, [urlFilters?.q]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'map' || view === 'list' || view === 'grid') {
      setViewMode(view);
    }
    const pageParam = parseInt(params.get('page') || '1', 10);
    if (Number.isFinite(pageParam) && pageParam >= 1) {
      setCurrentPage(pageParam);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('browse-map-immersive', viewMode === 'map');
    return () => document.documentElement.classList.remove('browse-map-immersive');
  }, [viewMode]);

  useEffect(() => {
    if (!isUrlReady) return;
    replaceBrowseUrl(
      currentPathname,
      { q: query, page: currentPage, view: viewMode },
      SPECIALIST_FILTER_DEFAULTS,
      { ...preservedFilters, q: query || null, type: 'business' }
    );
  }, [currentPage, currentPathname, isUrlReady, preservedFilters, query, viewMode]);

  const fetchAbortRef = useRef<AbortController | null>(null);

  const fetchSpecialists = useCallback(async () => {
    fetchAbortRef.current?.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(viewMode === 'map' ? 1 : currentPage));
      params.set(
        'limit',
        String(viewMode === 'map' ? SPECIALISTS_MAP_LIST_LIMIT : SPECIALISTS_PAGE_LIMIT)
      );
      if (query.trim()) params.set('search', query.trim());
      if (categorySlug) params.set('category', categorySlug);
      if (urlFilters?.verified) params.set('verified', 'true');
      params.set('sort', mapSortToBusinessApi(urlFilters?.sort ?? 'rating'));
      if (hasLocationScope && citySlugs.length > 0) {
        params.set('cities', citySlugs.join(','));
      }
      if (hasLocationScope && provinceSlugs.length > 0) {
        params.set('provinces', provinceSlugs.join(','));
      }
      if (singleCitySlug && urlFilters?.neighborhoods?.length) {
        params.set('neighborhoods', urlFilters.neighborhoods.join(','));
        params.set('neighborhoodCity', singleCitySlug);
      }

      const res = await fetch(`/api/business/browse?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      if (controller.signal.aborted) return;

      const rows: SpecialistProfile[] = (json.data ?? []).map(mapBusinessProfileToBrowseCard);
      setTotalCount(json.pagination?.total ?? rows.length);
      setTotalPages(json.pagination?.totalPages ?? 1);
      setSpecialists(rows);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('Error fetching specialists:', err);
      setSpecialists([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [
    categorySlug,
    currentPage,
    hasLocationScope,
    citySlugs,
    provinceSlugs,
    query,
    singleCitySlug,
    urlFilters,
    viewMode,
  ]);

  const mapPinsQuery = useMemo(
    () => ({
      category: categorySlug,
      search: query.trim() || undefined,
      verified: urlFilters?.verified ?? undefined,
      cities: hasLocationScope && citySlugs.length > 0 ? citySlugs.join(',') : undefined,
      provinces: hasLocationScope && provinceSlugs.length > 0 ? provinceSlugs.join(',') : undefined,
    }),
    [categorySlug, query, urlFilters?.verified, hasLocationScope, citySlugs, provinceSlugs]
  );

  const filterResetKey = useMemo(
    () =>
      JSON.stringify({
        categorySlug,
        citySlugs,
        provinceSlugs,
        neighborhoods: urlFilters?.neighborhoods,
        verified: urlFilters?.verified,
        sort: urlFilters?.sort,
      }),
    [categorySlug, citySlugs, provinceSlugs, urlFilters?.neighborhoods, urlFilters?.verified, urlFilters?.sort]
  );
  const prevFilterResetKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevFilterResetKeyRef.current === null) {
      prevFilterResetKeyRef.current = filterResetKey;
      return;
    }
    if (prevFilterResetKeyRef.current !== filterResetKey) {
      prevFilterResetKeyRef.current = filterResetKey;
      setCurrentPage(1);
    }
  }, [filterResetKey]);

  useEffect(() => {
    if (!isUrlReady) return;
    const timer = setTimeout(() => {
      fetchSpecialists();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSpecialists, isUrlReady, urlFilters]);

  useEffect(() => () => fetchAbortRef.current?.abort(), []);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const visibleSpecialists = specialists;

  const setPage = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const copyCurrentLink = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}${currentShareUrl}`);
  };

  const exitMapView = () => {
    setViewMode('grid');
    setCurrentPage(1);
  };

  const hasCityScope = citySlugs.length > 0;
  const cityScopeLabel = useMemo(() => {
    if (citySlugs.length === 1) {
      return CANONICAL_CITIES.find((c) => c.slug === citySlugs[0])?.title ?? citySlugs[0];
    }
    if (citySlugs.length > 1) {
      return `${formatCountFa(citySlugs.length)} شهر`;
    }
    return undefined;
  }, [citySlugs]);

  const clearCityScope = useCallback(() => {
    router.replace(
      routeBuilder.search({
        market: 'business',
        location: COUNTRY_SLUG,
        category: categorySlug,
      })
    );
  }, [categorySlug, router]);

  return (
    <div
      className={viewMode === 'map' ? 'w-full bg-background' : 'w-full min-h-[50vh] bg-muted/20'}
      dir="rtl"
    >
      <div
        className={
          viewMode === 'map'
            ? 'px-4 py-3 sm:px-6 max-lg:px-0 max-lg:py-0'
            : 'px-4 py-6 sm:px-6 sm:py-8 lg:px-8'
        }
      >
        {/* Header */}
        <div className={viewMode === 'map' ? 'mb-3 max-lg:hidden' : 'mb-8'}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {!serverRenderedHeading ? (
                <h1
                  className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-linear-to-l from-foreground to-foreground/80 bg-clip-text"
                  title={displayH1 !== pageH1 ? pageH1 : undefined}
                >
                  {displayH1}
                </h1>
              ) : null}
              {viewMode !== 'map' ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {formatCountFa(totalCount)} کسب‌وکار یافت شد
                </p>
              ) : null}
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
                <button
                  onClick={() => {
                    setViewMode('map');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center p-2 transition-colors ${viewMode === 'map' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                  aria-label="نمای نقشه"
                  role="radio"
                  aria-checked={viewMode === 'map'}
                  title="نمایش روی نقشه"
                >
                  <Map className="size-4" aria-hidden="true" />
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
            </div>
          </div>
        </div>

        {/* Search bar */}
        {viewMode !== 'map' ? (
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
                className="h-12 w-full rounded-xl border-border/50 bg-card/80 backdrop-blur-xs pr-10 text-sm shadow-md shadow-black/3 focus-visible:shadow-lg focus-visible:shadow-emerald-500/6 focus-visible:border-emerald-300/50 dark:focus-visible:border-emerald-700/50 transition-shadow"
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
        ) : null}

        {/* Map + list split (Divar-style) */}
        {viewMode === 'map' ? (
          <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 max-lg:static max-lg:w-full max-lg:max-w-none max-lg:translate-x-0">
            <BusinessMapSplitView
              specialists={visibleSpecialists}
              citySlugs={citySlugs}
              provinceSlugs={provinceSlugs}
              neighborhoodSlugs={urlFilters?.neighborhoods ?? []}
              mapQuery={mapPinsQuery}
              fromPathname={pathname}
              onCloseMap={exitMapView}
              hasCityScope={hasCityScope}
              cityScopeLabel={cityScopeLabel}
              onClearCityScope={clearCityScope}
            />
          </div>
        ) : null}

        {/* Results */}
        {viewMode !== 'map' && isLoading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {Array.from({ length: SPECIALISTS_PAGE_LIMIT }).map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : viewMode !== 'map' && visibleSpecialists.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted" aria-hidden="true">
              <Search className="size-8 text-muted-foreground/50" />
            </div>
            <h2 className="mb-2 text-lg font-semibold">
              {categorySlug ? 'هنوز کسب‌وکاری در این دسته نیست' : 'کسب‌وکاری یافت نشد'}
            </h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground">
              {categorySlug
                ? 'می‌توانید فیلتر دسته را بردارید یا شهر دیگری انتخاب کنید.'
                : 'لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.'}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setQuery('');
                setCurrentPage(1);
              }}
              title="پاک کردن جستجو"
            >
              پاک کردن جستجو
            </Button>
          </div>
        ) : viewMode !== 'map' ? (
          <>
            <div
              key={`${query}-${viewMode}-${urlFilters?.sort ?? ''}`}
              className={viewMode === 'grid'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-4'
              }
              itemScope
              itemType="https://schema.org/ItemList"
            >
              <meta itemProp="numberOfItems" content={String(totalCount)} />
              <meta itemProp="name" content={pageH1} />
              {visibleSpecialists.map((specialist) => (
                <div key={specialist.id} itemProp="itemListElement">
                  {viewMode === 'grid' ? (
                    <SpecialistCard
                      specialist={specialist}
                      fromPathname={pathname}
                      onMessage={handleSpecialistMessage}
                    />
                  ) : (
                    <SpecialistListCard
                      specialist={specialist}
                      fromPathname={pathname}
                      onMessage={handleSpecialistMessage}
                    />
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
                  صفحه {formatCountFa(safeCurrentPage)} از {formatCountFa(totalPages)}
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
        ) : null}
      </div>

      <noscript>
        <div className="sr-only" itemScope itemType="https://schema.org/ItemList">
          <h1>{pageH1}</h1>
          <p>فهرست کسب‌وکارهای خدمات ثبت شده در پلتفرم. شامل کسب‌وکارهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
      {picker}
    </div>
  );
}
