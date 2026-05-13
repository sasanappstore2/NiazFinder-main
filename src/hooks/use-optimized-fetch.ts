'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// رابط تنظیمات درخواست سفارشی
export interface OptimizedFetchOptions<T> {
  /** کلید کش منحصر به فرد */
  cacheKey: string;
  /** تابع فراخوانی API */
  fetcher: () => Promise<T>;
  /** زمان ماندگاری کش (میلی‌ثانیه) - پیش‌فرض: ۵ دقیقه */
  cacheTime?: number;
  /** تابع پردازش داده‌های خروجی */
  select?: (data: T) => unknown;
  /** فعال بودن درخواست - برای conditional fetching */
  enabled?: boolean;
  /** فراخوانی مجدد خودکار (میلی‌ثانیه) - 0 = غیرفعال */
  refetchInterval?: number;
  /** تابع فراخوانی پس از موفقیت */
  onSuccess?: (data: T) => void;
  /** تابع فراخوانی پس از خطا */
  onError?: (error: Error) => void;
}

// رابط نتیجه درخواست بهینه شده
export interface OptimizedFetchResult<T> {
  /** داده‌های واکشی شده */
  data: T | undefined;
  /** وضعیت بارگذاری */
  isLoading: boolean;
  /** آیا در حال فراخوانی مجدد است */
  isRefetching: boolean;
  /** خطای رخ داده */
  error: Error | null;
  /** تابع فراخوانی مجدد دستی */
  refetch: () => Promise<T | undefined>;
  /** تابع پاک کردن کش */
  invalidate: () => void;
  /** تابع به‌روزرسانی خوش‌بینانه */
  optimisticUpdate: (updater: (prev: T | undefined) => T) => void;
  /** آیا داده‌ها قبلاً واکشی شده‌اند */
  isFetched: boolean;
  /** زمان آخرین واکشی */
  lastFetchedAt: number | null;
}

// کش سراسری - ذخیره‌سازی در حافظه
const globalCache = new Map<string, {
  data: unknown;
  timestamp: number;
  cacheTime: number;
}>();

// درخواست‌های فعال - برای جلوگیری از درخواست‌های تکراری همزمان
const activeRequests = new Map<string, Promise<unknown>>();

// زمان پیش‌فرض کش (۵ دقیقه)
const DEFAULT_CACHE_TIME = 5 * 60 * 1000;

/**
 * هوک fetch بهینه شده با کش، حذف تکرار و به‌روزرسانی خوش‌بینانه
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useOptimizedFetch({
 *   cacheKey: 'requests-list',
 *   fetcher: () => apiGet('/requests').then(r => r.data),
 *   cacheTime: 60000,
 * });
 *
 * // با select
 * const { data: titles } = useOptimizedFetch({
 *   cacheKey: 'requests-list',
 *   fetcher: () => apiGet('/requests').then(r => r.data),
 *   select: (data) => data.map(r => r.title),
 * });
 * ```
 */
export function useOptimizedFetch<T = unknown>(
  options: OptimizedFetchOptions<T>
): OptimizedFetchResult<T> {
  const {
    cacheKey,
    fetcher,
    cacheTime = DEFAULT_CACHE_TIME,
    select,
    enabled = true,
    refetchInterval = 0,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(() => {
    // بررسی کش موجود هنگام مقداردهی اولیه
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
      return cached.data as T;
    }
    return undefined;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefetching, setIsRefetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isFetched, setIsFetched] = useState<boolean>(() => globalCache.has(cacheKey));
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(() => {
    const cached = globalCache.get(cacheKey);
    return cached ? cached.timestamp : null;
  });

  // رفرنس برای جلوگیری از memory leaks
  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // پاک کردن ref هنگام unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // تابع واکشی اصلی
  const fetchData = useCallback(async (isRefetch = false): Promise<T | undefined> => {
    // بررسی کش
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.cacheTime && !isRefetch) {
      setData(cached.data as T);
      setIsFetched(true);
      return cached.data as T;
    }

    // بررسی درخواست فعال (dedup)
    const activeRequest = activeRequests.get(cacheKey);
    if (activeRequest && !isRefetch) {
      return activeRequest as Promise<T>;
    }

    // شروع درخواست
    const requestPromise = fetcher()
      .then((result) => {
        // بروزرسانی کش
        globalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          cacheTime,
        });

        // بروزرسانی state
        if (mountedRef.current) {
          setData(result);
          setError(null);
          setIsFetched(true);
          setLastFetchedAt(Date.now());
          setIsLoading(false);
          setIsRefetching(false);
        }

        onSuccess?.(result);
        return result;
      })
      .catch((err: Error) => {
        if (mountedRef.current) {
          setError(err);
          setIsLoading(false);
          setIsRefetching(false);
        }

        onError?.(err);
        throw err;
      })
      .finally(() => {
        // حذف از درخواست‌های فعال
        activeRequests.delete(cacheKey);
      });

    // ثبت درخواست فعال
    activeRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }, [cacheKey, fetcher, cacheTime, onSuccess, onError]);

  // واکشی داده‌ها
  useEffect(() => {
    if (!enabled) return;

    // بررسی کش
    const cached = globalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
      setData(cached.data as T);
      setIsFetched(true);
      return;
    }

    setIsLoading(true);
    fetchData().catch(() => {
      // خطا در fetchData مدیریت می‌شود
    });
  }, [cacheKey, enabled, fetchData]);

  // refetch خودکار
  useEffect(() => {
    if (!enabled || refetchInterval <= 0) return;

    intervalRef.current = setInterval(() => {
      setIsRefetching(true);
      fetchData(true).catch(() => {
        // خطا مدیریت می‌شود
      });
    }, refetchInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, refetchInterval, fetchData]);

  // فراخوانی مجدد دستی
  const refetch = useCallback(async (): Promise<T | undefined> => {
    setIsRefetching(true);
    try {
      return await fetchData(true);
    } catch {
      return undefined;
    } finally {
      if (mountedRef.current) {
        setIsRefetching(false);
      }
    }
  }, [fetchData]);

  // پاک کردن کش
  const invalidate = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  // به‌روزرسانی خوش‌بینانه
  const optimisticUpdate = useCallback(
    (updater: (prev: T | undefined) => T) => {
      setData((prev) => {
        const newData = updater(prev);
        // بروزرسانی کش نیز
        globalCache.set(cacheKey, {
          data: newData,
          timestamp: Date.now(),
          cacheTime,
        });
        return newData;
      });
    },
    [cacheKey, cacheTime]
  );

  // محاسبه داده نهایی
  const finalData = select && data ? (select(data) as unknown as T) : data;

  return {
    data: finalData,
    isLoading,
    isRefetching,
    error,
    refetch,
    invalidate,
    optimisticUpdate,
    isFetched,
    lastFetchedAt,
  };
}

/**
 * پاک کردن تمام کش‌ها یا کش‌های خاص
 */
export function invalidateCache(...keys: string[]): void {
  if (keys.length === 0) {
    globalCache.clear();
  } else {
    keys.forEach((key) => globalCache.delete(key));
  }
}

/**
 * پیش‌بارگذاری داده‌ها در کش
 */
export function prefetch<T>(cacheKey: string, fetcher: () => Promise<T>, cacheTime = DEFAULT_CACHE_TIME): void {
  // اگر قبلاً کش شده، هیچ کاری نکن
  const cached = globalCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < cached.cacheTime) {
    return;
  }

  // بررسی درخواست فعال
  if (activeRequests.has(cacheKey)) {
    return;
  }

  const requestPromise = fetcher()
    .then((data) => {
      globalCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        cacheTime,
      });
      return data;
    })
    .catch(() => {
      // خطا در پیش‌بارگذاری نادیده گرفته می‌شود
    })
    .finally(() => {
      activeRequests.delete(cacheKey);
    });

  activeRequests.set(cacheKey, requestPromise);
}
