'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Search, X, Inbox } from 'lucide-react';
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
import { buildScopedSearchUrl } from '@/lib/search/location-scope';
import { useBrowsePageHeading } from '@/hooks/use-browse-page-heading';
import { NeedBrowseAlertButton } from '@/components/need/NeedBrowseAlertButton';

const REQUEST_FILTER_DEFAULTS = {
  q: '',
  page: 1,
};

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
  const pathname = usePathname();
  const categories = useAppStore((s) => s.categories);
  const fetchCategories = useAppStore((s) => s.fetchCategories);

  const [query, setQuery] = useState(urlFilters?.q ?? '');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUrlReady, setIsUrlReady] = useState(true);

  // Data state
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_LIMIT = 9;
  const currentPathname = basePath;
  const locationScope = useLocationScope();
  const { h1: pageH1, displayH1 } = useBrowsePageHeading('need');
  const urlCityNames = useMemo(() => slugsToPersianNames(citySlugs), [citySlugs]);
  const provinceSlugs = urlFilters?.provinces ?? [];
  const hasLocationScope = urlCityNames.length > 0 || provinceSlugs.length > 0;
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
    if (!isUrlReady) return;
    replaceBrowseUrl(
      currentPathname,
      { q: query, page: currentPage },
      REQUEST_FILTER_DEFAULTS,
      { ...preservedFilters, q: query || null }
    );
  }, [currentPage, currentPathname, isUrlReady, preservedFilters, query]);

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
          page,
          limit: PAGE_LIMIT,
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
    [query, categorySlug, hasLocationScope, urlCityNames, provinceSlugs, citySlugs, urlFilters]
  );

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
    <div className="w-full min-h-[50vh] bg-muted/20" dir="rtl">
      <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight sm:text-3xl bg-linear-to-l from-foreground to-foreground/80 bg-clip-text"
                title={displayH1 !== pageH1 ? pageH1 : undefined}
              >
                {displayH1}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {hasLoadedInitial
                  ? `${totalCount.toLocaleString('fa-IR')} نیاز یافت شد`
                  : 'در حال جستجو...'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
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

        {/* Results */}
        {!hasLoadedInitial && isLoading ? (
          <div className={NEED_LIST_CLASS} aria-label="در حال بارگذاری نیازها" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <NeedBrowseCardSkeleton key={i} />
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
            <Button variant="outline" className="mt-4" onClick={clearSearch} title="پاک کردن جستجو">
              پاک کردن جستجو
            </Button>
          </div>
        ) : (
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
        )}
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
