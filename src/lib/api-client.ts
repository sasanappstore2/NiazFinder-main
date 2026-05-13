/**
 * API Client - کلاینت یکپارچه برای درخواست‌های API
 * شامل مدیریت توکن، خطایاب، اعلان‌ها و کش
 */

import type { User } from '@/lib/types';

// ============ ثابت‌های API ============
export const API_BASE = '/api';
export const API_TIMEOUT = 30000; // ۳۰ ثانیه

// کلید ذخیره‌سازی توکن
const TOKEN_KEY = 'nf_auth_token';

// ============ انواع درخواست و پاسخ ============

// پارامترهای درخواست سفارشی
export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** بدنه درخواست - به صورت خودکار به JSON تبدیل می‌شود */
  body?: unknown;
  /** پارامترهای کوئری استرینگ */
  params?: Record<string, string | number | boolean | undefined>;
  /** نمایش خطا با toast */
  showError?: boolean;
  /** پیام سفارشی خطا */
  errorMessage?: string;
  /** لغو درخواست در صورت خروج از صفحه */
  abortOnUnmount?: boolean;
  /** تایم‌اوت سفارشی (میلی‌ثانیه) */
  timeout?: number;
}

// پاسخ استاندارد API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// خطای API
export interface ApiError {
  success: false;
  message: string;
  code?: string;
  status: number;
  errors?: Record<string, string[]>;
}

// ============ توابع کمکی ============

/**
 * ساخت URL کامل با پارامترهای کوئری
 */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * دریافت توکن احراز هویت از localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * تنظیم توکن احراز هویت در localStorage
 */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

/**
 * حذف توکن احراز هویت از localStorage
 */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * مدیریت خطای API - نمایش اعلان و لاگ
 */
function handleApiError(error: unknown, customMessage?: string): ApiError {
  if (error instanceof Response) {
    // خطای HTTP
    const apiError: ApiError = {
      success: false,
      message: customMessage || `خطای سرور (${error.status})`,
      status: error.status,
    };

    if (error.status === 401) {
      apiError.message = customMessage || 'لطفاً دوباره وارد شوید';
      // پاک‌سازی توکن نامعتبر
      clearAuthToken();
    } else if (error.status === 403) {
      apiError.message = customMessage || 'شما دسترسی به این بخش را ندارید';
    } else if (error.status === 404) {
      apiError.message = customMessage || 'مورد مورد نظر یافت نشد';
    } else if (error.status === 429) {
      apiError.message = customMessage || 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی صبر کنید.';
    } else if (error.status >= 500) {
      apiError.message = customMessage || 'خطای سرور رخ داده است. لطفاً دوباره تلاش کنید.';
    }

    return apiError;
  }

  if (error instanceof Error) {
    // خطای شبکه یا سایر خطاها
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'درخواست لغو شد',
        status: 0,
      };
    }
    if (error.name === 'TimeoutError') {
      return {
        success: false,
        message: 'زمان درخواست به پایان رسید. لطفاً دوباره تلاش کنید.',
        status: 0,
      };
    }
    return {
      success: false,
      message: customMessage || error.message || 'خطای ناشناخته رخ داده است',
      status: 0,
    };
  }

  return {
    success: false,
    message: customMessage || 'خطای ناشناخته رخ داده است',
    status: 0,
  };
}

// ============ تابع اصلی درخواست ============

/**
 * ارسال درخواست API با مدیریت خودکار توکن، خطا و تایم‌اوت
 *
 * @param path - مسیر API (مثلاً '/requests')
 * @param options - تنظیمات درخواست
 * @returns پاسخ API با نوع مشخص
 *
 * @example
 * ```ts
 * // GET
 * const { data } = await apiClient.get<ServiceRequest[]>('/requests', {
 *   params: { page: 1, limit: 10 },
 * });
 *
 * // POST
 * const { data } = await apiClient.post<ServiceRequest>('/requests', {
 *   body: { title: 'طراحی سایت', description: '...' },
 * });
 * ```
 */
export async function apiClient<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    body,
    params,
    showError = false,
    errorMessage,
    timeout = API_TIMEOUT,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  // ساخت URL با پارامترهای کوئری
  const url = buildUrl(path, params);

  // آماده‌سازی هدرها
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // تزریق توکن احراز هویت
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // ساخت AbortController برای تایم‌اوت
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });

    // بررسی وضعیت پاسخ
    if (!response.ok) {
      const apiError = handleApiError(response, errorMessage);
      if (showError) {
        showToast(apiError.message);
      }
      throw apiError;
    }

    // تجزیه پاسخ JSON
    const data = await response.json();

    return {
      success: true,
      data: data as T,
      ...(data.message && { message: data.message }),
      ...(data.pagination && { pagination: data.pagination }),
    };
  } catch (error) {
    // اگر خطا قبلاً throw شده، آن را مجدداً پرتاب کن
    if (error && typeof error === 'object' && 'success' in error) {
      throw error;
    }

    const apiError = handleApiError(error, errorMessage);
    if (showError) {
      showToast(apiError.message);
    }
    throw apiError;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ متدهای میان‌بر ============

/**
 * درخواست GET
 */
export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<ApiRequestOptions, 'body' | 'params'>
): Promise<ApiResponse<T>> {
  return apiClient<T>(path, { ...options, params, method: 'GET' });
}

/**
 * درخواست POST
 */
export async function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'body'>
): Promise<ApiResponse<T>> {
  return apiClient<T>(path, { ...options, body, method: 'POST' });
}

/**
 * درخواست PUT
 */
export async function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'body'>
): Promise<ApiResponse<T>> {
  return apiClient<T>(path, { ...options, body, method: 'PUT' });
}

/**
 * درخواست PATCH
 */
export async function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  options?: Omit<ApiRequestOptions, 'body'>
): Promise<ApiResponse<T>> {
  return apiClient<T>(path, { ...options, body, method: 'PATCH' });
}

/**
 * درخواست DELETE
 */
export async function apiDelete<T = unknown>(
  path: string,
  options?: Omit<ApiRequestOptions, 'body'>
): Promise<ApiResponse<T>> {
  return apiClient<T>(path, { ...options, method: 'DELETE' });
}

// ============ ثابت‌های اندپوینت ============

export const API_ENDPOINTS = {
  // احراز هویت
  auth: {
    login: '/auth',
    register: '/auth/register',
    logout: '/auth/logout',
    me: '/auth/me',
    refreshToken: '/auth/refresh',
  },
  // درخواست‌ها
  requests: {
    list: '/requests',
    detail: (slug: string) => `/requests/${slug}`,
    create: '/requests',
    update: (slug: string) => `/requests/${slug}`,
    delete: (slug: string) => `/requests/${slug}`,
  },
  // پیشنهادها
  proposals: {
    list: (slug: string) => `/requests/${slug}/proposals`,
    create: (slug: string) => `/requests/${slug}/proposals`,
    update: (id: string) => `/proposals/${id}`,
    accept: (id: string) => `/proposals/${id}/accept`,
    reject: (id: string) => `/proposals/${id}/reject`,
  },
  // متخصص‌ها
  specialists: {
    list: '/specialists',
    detail: (id: string) => `/specialists/${id}`,
    reviews: (id: string) => `/specialists/${id}/reviews`,
    createReview: (id: string) => `/specialists/${id}/reviews`,
  },
  // دسته‌بندی‌ها
  categories: {
    list: '/categories',
    tree: '/categories/tree',
  },
  // چت
  chat: {
    conversations: '/chat/conversations',
    messages: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    send: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
    markRead: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
  },
  // اعلان‌ها
  notifications: {
    list: '/notifications',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    preferences: '/notifications/preferences',
    updatePreferences: '/notifications/preferences',
  },
  // کاربر
  user: {
    profile: '/user/profile',
    updateProfile: '/user/profile',
    settings: '/user/settings',
    wallet: '/user/wallet',
    transactions: '/user/transactions',
    referral: '/user/referral',
  },
} as const;

// ============ کلیدهای کش TanStack Query ============

/**
 * ساخت کلید کش منحصر به فرد برای TanStack Query
 * فرمت: ['entity', 'action', ...params]
 *
 * @example
 * queryKey('requests', 'list', { page: 1 })
 * // => ['requests', 'list', 'page=1']
 */
export function buildQueryKey(
  entity: string,
  action: string,
  params?: Record<string, unknown>
): string[] {
  const key: string[] = [entity, action];

  if (params) {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    if (paramStr) {
      key.push(paramStr);
    }
  }

  return key;
}

// کلیدهای کش رایج
export const QUERY_KEYS = {
  requests: {
    all: () => buildQueryKey('requests', 'list'),
    list: (params?: Record<string, unknown>) => buildQueryKey('requests', 'list', params),
    detail: (slug: string) => buildQueryKey('requests', 'detail', { slug }),
    proposals: (slug: string) => buildQueryKey('proposals', 'list', { slug }),
  },
  specialists: {
    all: () => buildQueryKey('specialists', 'list'),
    list: (params?: Record<string, unknown>) => buildQueryKey('specialists', 'list', params),
    detail: (id: string) => buildQueryKey('specialists', 'detail', { id }),
    reviews: (id: string) => buildQueryKey('reviews', 'list', { specialistId: id }),
  },
  categories: {
    all: () => buildQueryKey('categories', 'list'),
    tree: () => buildQueryKey('categories', 'tree'),
  },
  chat: {
    conversations: () => buildQueryKey('chat', 'conversations'),
    messages: (id: string) => buildQueryKey('chat', 'messages', { conversationId: id }),
  },
  notifications: {
    all: () => buildQueryKey('notifications', 'list'),
    preferences: () => buildQueryKey('notifications', 'preferences'),
  },
  user: {
    profile: () => buildQueryKey('user', 'profile'),
    wallet: () => buildQueryKey('user', 'wallet'),
    transactions: () => buildQueryKey('user', 'transactions'),
    referral: () => buildQueryKey('user', 'referral'),
  },
} as const;

// ============ Toast اعلان ============

// نشانگر فعال بودن toast
let toastAvailable = false;

/**
 * ثبت این که toast سیستم موجود است
 * این تابع توسط کامپوننت Toaster فراخوانی می‌شود
 */
export function markToastAvailable(): void {
  toastAvailable = true;
}

/**
 * نمایش اعلان toast
 * از sonner استفاده می‌کند در صورت وجود، در غیر این صورت از alert
 */
function showToast(message: string): void {
  if (toastAvailable && typeof window !== 'undefined') {
    // فراخوانی داینامیک sonner toast
    try {
      import('sonner').then(({ toast }) => {
        toast.error(message);
      }).catch(() => {
        // fallback
      });
    } catch {
      // در صورت خطا در import، ساکت می‌مانیم
    }
  }
}
