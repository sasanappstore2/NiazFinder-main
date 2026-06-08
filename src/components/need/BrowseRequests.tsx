'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X, Inbox, List, Map } from 'lucide-react';
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
import type { ServiceRequest, Category } from '@/lib/types';
import { NeedBrowseCard, NeedBrowseCardSkeleton } from '@/components/need/NeedBrowseCard';
import { NEED_LIST_CLASS } from '@/components/need/need-browse-card-tokens';
import {
  buildUrlWithQuery,
  flattenCategories,
  getCategoryRouteValue,
  replaceBrowseUrl,
} from '@/lib/filter-routing';
import { buildRequestListParams } from '@/lib/browse/build-request-query';
import { serializeFilters } from '@/lib/filters/parser';
import { routeBuilder } from '@/config/routes';
import { appendFromParam } from '@/lib/browse-trail';
import type { BrowseFilters } from '@/lib/filters/parser';
import { slugsToPersianNames } from '@/lib/search/city-slugs';
import { useLocationScope } from '@/hooks/use-location-scope';
import {
  scopeCitySlugs,
  scopeIsActive,
  scopeProvinceSlugs,
} from '@/lib/search/location-scope';
import { buildScopedSearchUrl } from '@/lib/search/location-scope';
import { useBrowsePageHeading } from '@/hooks/use-browse-page-heading';
import { NeedBrowseAlertButton } from '@/components/need/NeedBrowseAlertButton';
import { NeedMapSplitView } from '@/components/need/map/NeedMapSplitView';
import { CANONICAL_CITIES, COUNTRY_SLUG } from '@/config/locations';
import type { NeedMapPinsQuery } from '@/hooks/use-need-map-pins';

const REQUEST_FILTER_DEFAULTS = {
  q: '',
  page: 1,
  view: 'list',
};

const REQUEST_PAGE_LIMIT = 9;
const REQUEST_MAP_LIST_LIMIT = 40;

// ─── Main Component ───────────────────────────────────
interface BrowseRequestsProps {
  basePath?: string;
  categorySlug?: string;
  citySlugs?: string[];
  urlFilters?: BrowseFilters;
}

export function BrowseRequests({
  basePath = '/n/iran',
  categorySlug,
  citySlugs = [],
  urlFilters,
}: BrowseRequestsProps = {}) {
  const { navigateTo } = useNavigate();
  const router = useRouter();
  const pathname = usePathname();
  const categories = useAppStore((s) => s.categories);
  const fetchCategories = useAppStore((s) => s.fetchCategories);

  const [query, setQuery] = useState(urlFilters?.q ?? '');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isUrlReady, setIsUrlReady] = useState(true);

  // Data state
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const currentPathname = basePath;
  const locationScope = useLocationScope();
  const { h1: pageH1, displayH1 } = useBrowsePageHeading('need');
  const urlCityNames = useMemo(() => slugsToPersianNames(citySlugs), [citySlugs]);
  const provinceSlugs = urlFilters?.provinces ?? [];
  const hasLocationScope = urlCityNames.length > 0 || provinceSlugs.length > 0;

  /** Map uses URL scope first, then header/cookie location when path is country-wide. */
  const effectiveMapCitySlugs = useMemo(() => {
    if (citySlugs.length > 0) return citySlugs;
    if (scopeIsActive(locationScope)) return scopeCitySlugs(locationScope);
    return [];
  }, [citySlugs, locationScope]);

  const effectiveMapProvinceSlugs = useMemo(() => {
    if (provinceSlugs.length > 0) return provinceSlugs;
    if (scopeIsActive(locationScope)) return scopeProvinceSlugs(locationScope);
    return [];
  }, [provinceSlugs, locationScope]);

  const hasMapLocationScope =
    effectiveMapCitySlugs.length > 0 || effectiveMapProvinceSlugs.length > 0;
  const preservedFilters = useMemo(
    () => ({
      type: urlFilters?.type,
      cities: urlFilters?.cities ?? [],
      provinces: urlFilters?.provinces ?? [],
      neighborhoods: urlFilters?.neighborhoods ?? [],
      q: urlFilters?.q ?? undefined,
      sort: urlFilters?.sort,
      verified: urlFilters?.verified ?? undefined,
      hasPhoto: urlFilters?.hasPhoto ?? undefined,
      urgent: urlFilters?.urgent ?? undefined,
      recent: urlFilters?.recent ?? undefined,
      priceMin: urlFilters?.priceMin ?? undefined,
      priceMax: urlFilters?.priceMax ?? undefined,
      status: urlFilters?.status ?? undefined,
      attributes: urlFilters?.attributes ?? {},
    }),
    [urlFilters]
  );
  const flatCategories = useMemo(() => flattenCategories(categories), [categories]);

  const alertLabel = pageH1;

  // Fetch categories on mount
  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  useEffect(() => {
    setQuery(urlFilters?.q ?? '');
  }, [urlFilters?.q]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const view = new URLSearchParams(window.location.search).get('view');
    if (view === 'map') {
      setViewMode('map');
    } else if (view === 'list' || view === 'grid') {
      setViewMode('list');
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
      REQUEST_FILTER_DEFAULTS,
      { ...preservedFilters, q: query || null }
    );
  }, [currentPage, currentPathname, isUrlReady, preservedFilters, query, viewMode]);

  // Fetch requests from API
  const fetchRequests = useCallback(
    async (page: number, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = buildRequestListParams(urlFilters, {
          page: viewMode === 'map' ? 1 : page,
          limit: viewMode === 'map' ? REQUEST_MAP_LIST_LIMIT : REQUEST_PAGE_LIMIT,
          search: query.trim() || undefined,
          category: categorySlug,
          cities: hasLocationScope && urlCityNames.length > 0 ? urlCityNames : undefined,
          provinces: hasLocationScope && provinceSlugs.length > 0 ? provinceSlugs : undefined,
          neighborhoodCity:
            citySlugs.length === 1 ? citySlugs[0] : undefined,
          requestStatus: 'OPEN',
        });

        const res = await fetch(`/api/requests?${params.toString()}`);
        if (!res.ok) throw new Error('API error');
        const json = await res.json();

        const mappedRequests: ServiceRequest[] = (json.data || []).map((r: any) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          description: r.description,
          address: r.address ?? undefined,
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
    [query, categorySlug, hasLocationScope, urlCityNames, provinceSlugs, citySlugs, urlFilters, viewMode]
  );

  const mapPinsQuery = useMemo((): NeedMapPinsQuery => {
    const q: NeedMapPinsQuery = {
      category: categorySlug,
      search: query.trim() || undefined,
      cities:
        hasMapLocationScope && effectiveMapCitySlugs.length > 0
          ? effectiveMapCitySlugs.join(',')
          : undefined,
      provinces:
        hasMapLocationScope && effectiveMapProvinceSlugs.length > 0
          ? effectiveMapProvinceSlugs.join(',')
          : undefined,
      neighborhoods:
        urlFilters?.neighborhoods && urlFilters.neighborhoods.length > 0
          ? urlFilters.neighborhoods.join(',')
          : undefined,
      neighborhoodCity: effectiveMapCitySlugs.length === 1 ? effectiveMapCitySlugs[0] : undefined,
      budgetMin: urlFilters?.priceMin != null ? String(urlFilters.priceMin) : undefined,
      budgetMax: urlFilters?.priceMax != null ? String(urlFilters.priceMax) : undefined,
      priority: urlFilters?.urgent ? 'URGENT' : undefined,
      hasPhoto: urlFilters?.hasPhoto ?? undefined,
      recent: urlFilters?.recent ?? undefined,
    };
    return q;
  }, [
    categorySlug,
    query,
    hasMapLocationScope,
    effectiveMapCitySlugs,
    effectiveMapProvinceSlugs,
    urlFilters?.neighborhoods,
    urlFilters?.priceMin,
    urlFilters?.priceMax,
    urlFilters?.urgent,
    urlFilters?.hasPhoto,
    urlFilters?.recent,
  ]);

  const exitMapView = () => {
    setViewMode('list');
    setCurrentPage(1);
  };

  const hasCityScope = effectiveMapCitySlugs.length > 0;
  const cityScopeLabel = useMemo(() => {
    if (effectiveMapCitySlugs.length === 1) {
      return (
        CANONICAL_CITIES.find((c) => c.slug === effectiveMapCitySlugs[0])?.title ??
        effectiveMapCitySlugs[0]
      );
    }
    if (effectiveMapCitySlugs.length > 1) {
      return `${effectiveMapCitySlugs.length.toLocaleString('fa-IR')} شهر`;
    }
    return undefined;
  }, [effectiveMapCitySlugs]);

  const clearCityScope = useCallback(() => {
    router.replace(
      routeBuilder.search({
        market: 'need',
        location: COUNTRY_SLUG,
        category: categorySlug,
      })
    );
  }, [categorySlug, router]);

  useEffect(() => {
    if (!isUrlReady) return;

    const timer = setTimeout(() => {
      fetchRequests(currentPage);
    }, 350);

    return () => clearTimeout(timer);
  }, [currentPage, fetchRequests, isUrlReady, urlFilters]);

  const setPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), Math.max(totalPages, 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearSearch = () => {
    setQuery('');
    setCurrentPage(1);
  };

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
              <h1
                className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-linear-to-l from-foreground to-foreground/80 bg-clip-text"
                title={displayH1 !== pageH1 ? pageH1 : undefined}
              >
                {displayH1}
              </h1>
              {viewMode !== 'map' ? (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {hasLoadedInitial
                    ? `${totalCount.toLocaleString('fa-IR')} نیاز یافت شد`
                    : 'در حال جستجو...'}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <div
                className="flex overflow-hidden rounded-lg border border-border/40 shadow-sm"
                role="radiogroup"
                aria-label="نحوه نمایش"
              >
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
              <NeedBrowseAlertButton
                browsePath={currentPathname}
                categorySlug={categorySlug}
                citySlugs={citySlugs}
                filters={{ ...preservedFilters, q: query || null }}
                searchQuery={query.trim() || undefined}
                label={alertLabel}
              />
            </div>
          </div>
        </div>

        {/* Search bar */}
        {viewMode !== 'map' ? (
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
                title="پاک کردن عبارت جستجو"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        ) : null}

        {viewMode === 'map' ? (
          <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 max-lg:static max-lg:w-full max-lg:max-w-none max-lg:translate-x-0">
            <NeedMapSplitView
              requests={requests}
              citySlugs={effectiveMapCitySlugs}
              provinceSlugs={effectiveMapProvinceSlugs}
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
        {viewMode !== 'map' && !hasLoadedInitial && isLoading ? (
          <div className={NEED_LIST_CLASS} aria-label="در حال بارگذاری نیازها" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <NeedBrowseCardSkeleton key={i} />
            ))}
          </div>
        ) : viewMode !== 'map' && requests.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted/60">
              <Inbox className="size-8 text-muted-foreground/40" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">نتیجه‌ای یافت نشد</h2>
            <p className="mx-auto max-w-sm text-sm text-muted-foreground/70">
              لطفاً فیلترهای خود را تغییر دهید یا عبارت جستجو را اصلاح کنید.
            </p>
            <Button variant="outline" className="mt-4" onClick={clearSearch} title="پاک کردن جستجو">
              پاک کردن جستجو
            </Button>
          </div>
        ) : viewMode !== 'map' ? (
          <>
            <div
              className={NEED_LIST_CLASS}
              itemScope
              itemType="https://schema.org/ItemList"
            >
              <meta itemProp="numberOfItems" content={String(totalCount)} />
              <meta itemProp="name" content={pageH1} />
              {requests.map((request) => {
                const requestCategory = flatCategories.find((category) => category.id === request.categoryId);
                const categoryHref = requestCategory
                  ? buildUrlWithQuery(currentPathname, { category: getCategoryRouteValue(requestCategory) })
                  : buildUrlWithQuery(currentPathname, { category: request.categoryId });
                const cityHref = request.city
                  ? buildScopedSearchUrl(locationScope, {
                      category: categorySlug,
                      listingCity: request.city,
                      listingProvince: request.province ?? undefined,
                    }) ?? undefined
                  : undefined;

                return (
                  <div key={request.id} itemProp="itemListElement">
                    <NeedBrowseCard
                      request={request}
                      onClick={() => navigateTo('request-detail', { id: request.id })}
                      dataHref={appendFromParam(
                        routeBuilder.listing(request.id, request.title),
                        pathname
                      )}
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
        ) : null}
      </div>
      <noscript>
        <div className="sr-only" itemScope itemType="https://schema.org/ItemList">
          <h1>{pageH1}</h1>
          <p>فهرست نیازهای خدمات ثبت شده توسط کاربران. شامل نیازهای طراحی وب، برنامه‌نویسی، تعمیرات، تولید محتوا، طراحی گرافیک و خدمات خانگی.</p>
        </div>
      </noscript>
    </div>
  );
}
