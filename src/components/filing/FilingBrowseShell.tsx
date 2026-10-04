'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toPersianDigits } from '@/lib/format/digits';
import {
  DEFAULT_FILING_BROWSE_FILTERS,
  filingFinancialFiltersClearForDeal,
  filingBrowseActiveFilterCount,
  type FilingBrowseFilters,
} from '@/lib/filing/apply-filing-filters';
import {
  filtersFromSearchParams,
  searchParamsFromFilters,
} from '@/lib/filing/browse/browse-url';
import {
  filingBrowseTitle,
  type FilingCategoryValue,
  type FilingKindValue,
} from '@/lib/filing/filing-categories';
import {
  filingBrowseDefaultCityId,
  filingBrowseDefaultCityName,
} from '@/config/filing-browse';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import { Button } from '@/components/ui/button';
import { FilingBrowseFilterPanel } from './FilingBrowseFilterPanel';
import { FilingListCard } from './FilingListCard';
import { FilingBrowseResultsSkeleton } from './FilingListCardSkeleton';

const PAGE_SIZE = 48;
const FILTER_SKELETON_COUNT = 8;
const CITY_SLUG = 'mashhad';

type BrowseResponse = {
  items: WorkspaceFileItem[];
  total: number;
  page: number;
  limit: number;
};

function applyFilterPatch(
  prev: FilingBrowseFilters,
  next: Partial<FilingBrowseFilters>
): FilingBrowseFilters {
  const merged = { ...prev, ...next };
  if ('dealType' in next && next.dealType != null && next.dealType !== prev.dealType) {
    return { ...merged, ...filingFinancialFiltersClearForDeal(next.dealType) };
  }
  return merged;
}

export function FilingBrowseShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const skipUrlToStateSync = useRef(false);
  const [filters, setFilters] = useState<FilingBrowseFilters>(() =>
    filtersFromSearchParams(searchParams)
  );
  const [, startTransition] = useTransition();
  const deferredFilters = useDeferredValue(filters);
  const deferredQ = useDeferredValue(deferredFilters.q);

  const queryFilters = useMemo(
    () => ({ ...deferredFilters, q: deferredQ }),
    [deferredFilters, deferredQ]
  );

  const cityId = filingBrowseDefaultCityId();
  const cityName = filingBrowseDefaultCityName();
  const { neighborhoods, isLoading: neighborhoodsLoading } = useCityNeighborhoods(cityId);

  useEffect(() => {
    if (skipUrlToStateSync.current) {
      skipUrlToStateSync.current = false;
      return;
    }
    setFilters(filtersFromSearchParams(searchParams));
  }, [searchParams]);

  const syncUrl = useCallback(
    (next: FilingBrowseFilters, page = 1) => {
      const sp = searchParamsFromFilters(next, page);
      sp.set('city', CITY_SLUG);
      const qs = sp.toString();
      const href = qs ? `/f?${qs}` : '/f';
      skipUrlToStateSync.current = true;
      router.replace(href, { scroll: false });
    },
    [router]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['filings-browse', CITY_SLUG, queryFilters],
    queryFn: async ({ pageParam }) => {
      const sp = searchParamsFromFilters(queryFilters, pageParam);
      sp.set('city', CITY_SLUG);
      sp.set('limit', String(PAGE_SIZE));
      const res = await fetch(`/api/filings/browse?${sp.toString()}`);
      if (!res.ok) {
        throw new Error('browse_failed');
      }
      return (await res.json()) as BrowseResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const next = lastPage.page + 1;
      return next * lastPage.limit < lastPage.total ? next : undefined;
    },
    placeholderData: (prev) => prev,
  });

  const visibleItems = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages]
  );
  const total = data?.pages[0]?.total ?? 0;
  const activeCount = filingBrowseActiveFilterCount(filters);
  const isOtherFiltersPending = filters !== deferredFilters || filters.q !== deferredQ;
  const showNeighborhoodSkeleton =
    neighborhoodsLoading && filters.neighborhoods.length > 0;
  const showResultsSkeleton = isLoading || (isFetching && !visibleItems.length);

  const patch = (next: Partial<FilingBrowseFilters>) => {
    const resolved = applyFilterPatch(filters, next);
    startTransition(() => setFilters(resolved));
    syncUrl(resolved, 1);
  };

  const reset = () => {
    const cleared = { ...DEFAULT_FILING_BROWSE_FILTERS };
    startTransition(() => setFilters(cleared));
    syncUrl(cleared, 1);
  };

  const title = filingBrowseTitle(
    (filters.dealType as FilingCategoryValue | 'all') ?? 'all',
    (filters.propertyKind as FilingKindValue | 'all') ?? 'all'
  );

  return (
    <div className="filing-browse-page">
      <header className="filing-browse-header">
        <div className="filing-browse-header__text">
          <h1 className="filing-browse-header__title">{title}</h1>
          <p className="filing-browse-header__count">
            {showNeighborhoodSkeleton ? (
              <>در حال بارگذاری فایل‌های محله انتخاب‌شده…</>
            ) : isOtherFiltersPending || showResultsSkeleton ? (
              <>در حال اعمال فیلترها…</>
            ) : isError ? (
              <>خطا در بارگذاری فایل‌ها</>
            ) : (
              <>
                <strong>{toPersianDigits(total)}</strong> فایل در {cityName}
              </>
            )}
          </p>
        </div>
      </header>

      <FilingBrowseFilterPanel
        filters={filters}
        neighborhoods={neighborhoods}
        neighborhoodsLoading={neighborhoodsLoading}
        onPatch={patch}
        onReset={reset}
        activeCount={activeCount}
      />

      {isError ? (
        <div className="filing-browse-empty">
          <p>بارگذاری فایل‌ها ناموفق بود.</p>
          <Button type="button" variant="outline" onClick={() => refetch()}>
            تلاش دوباره
          </Button>
        </div>
      ) : showNeighborhoodSkeleton || showResultsSkeleton ? (
        <FilingBrowseResultsSkeleton count={FILTER_SKELETON_COUNT} />
      ) : visibleItems.length === 0 ? (
        <div className="filing-browse-empty">فایلی با این فیلترها پیدا نشد.</div>
      ) : (
        <div className="filing-browse-results">
          <div className="filing-browse-grid">
            {visibleItems.map((item) => (
              <FilingListCard key={item.id} item={item} />
            ))}
          </div>
          {hasNextPage ? (
            <div className="filing-browse-more">
              <Button
                type="button"
                variant="outline"
                disabled={isFetching}
                onClick={() => fetchNextPage()}
              >
                {isFetching
                  ? 'در حال بارگذاری…'
                  : `نمایش بیشتر (${toPersianDigits(total - visibleItems.length)} باقی‌مانده)`}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
