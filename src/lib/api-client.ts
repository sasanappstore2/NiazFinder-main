/**
 * API Client
 *
 * Canonical app path:
 * - App code should call Next.js API routes (`/api/...`) via `apiFetch`.
 *
 * Legacy bridge:
 * - The `apiGet/apiPost/...` helpers route to backend port 4000 through Caddy
 *   and are kept for compatibility only.
 */

// ---------------------------------------------------------------------------
// Base URL helpers
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

/** Build a full URL that Caddy can proxy to the NestJS backend on port 4000. */
function getApiUrl(path: string): string {
  return `${API_BASE}/api${path}?XTransformPort=4000`;
}

// ---------------------------------------------------------------------------
// Token storage (mirrors the key used in store.ts for consistency)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'needfinder_auth_token';

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Core HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Generic API error class — carries the HTTP status and parsed server message.
 */
export class ApiClientError extends Error {
  status: number;
  code?: string;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, code?: string, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

/**
 * Build headers for a request.
 * If a token is supplied it takes precedence; otherwise we fall back to the
 * stored token (convenient for callers that don't want to pass it explicitly).
 */
function buildHeaders(token?: string, extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...extra,
  };
  const resolvedToken = token ?? getStoredToken();
  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }
  return headers;
}

/**
 * Process a non‑OK response — attempt to parse the NestJS error body and
 * throw an `ApiClientError`. On 401 responses the stored token is cleared.
 */
async function handleErrorResponse(response: Response): Promise<never> {
  const status = response.status;

  // Try to parse a structured error body from NestJS
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    // Non‑JSON body — continue with defaults
  }

  const message =
    body?.message ??
    body?.error ??
    (typeof body === 'string' ? body : null) ??
    `Request failed with status ${status}`;

  // On 401 — clear any stored token so the app can redirect to login
  if (status === 401) {
    clearStoredToken();
  }

  throw new ApiClientError(
    Array.isArray(message) ? message[0] : message,
    status,
    body?.code,
    body?.errors,
  );
}

// ---------------------------------------------------------------------------
// Lightweight fetch for Next.js API routes (used by hooks)
// ---------------------------------------------------------------------------

export async function apiFetch<T = unknown>(
  url: string,
  options?: RequestInit | { method?: string; body?: unknown; params?: Record<string, unknown> }
): Promise<T> {
  const normalized = (options ?? {}) as RequestInit & {
    params?: Record<string, unknown>;
  };
  let fullUrl = url;
  if (normalized.params) {
    const qs = new URLSearchParams(
      Object.entries(normalized.params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    fullUrl = `${url}${qs ? `?${qs}` : ''}`;
  }

  const suppliedHeaders =
    normalized.headers instanceof Headers
      ? Object.fromEntries(normalized.headers.entries())
      : Array.isArray(normalized.headers)
        ? Object.fromEntries(normalized.headers)
        : ((normalized.headers ?? {}) as Record<string, string>);

  let body: BodyInit | undefined;
  if (typeof normalized.body === 'string' || normalized.body instanceof FormData) {
    body = normalized.body as BodyInit;
  } else if (normalized.body != null) {
    body = JSON.stringify(normalized.body);
  }

  const res = await fetch(fullUrl, {
    ...normalized,
    method: normalized.method || 'GET',
    headers: buildHeaders(undefined, suppliedHeaders),
    body,
  });

  if (!res.ok) await handleErrorResponse(res);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Generic request functions
// ---------------------------------------------------------------------------

/**
 * Send an authenticated / unauthenticated GET request.
 *
 * @param path   API path **without** the `/api` prefix, e.g. `/auth/me`
 * @param token  Optional Bearer token (falls back to stored token)
 */
export async function apiGet<T = any>(path: string, token?: string): Promise<T> {
  const url = getApiUrl(path);
  const headers = buildHeaders(token);

  const response = await fetch(url, { method: 'GET', headers });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  return response.json() as Promise<T>;
}

/**
 * Send a POST request.
 *
 * @param path   API path **without** the `/api` prefix
 * @param body   Request body (will be JSON‑serialized)
 * @param token  Optional Bearer token
 */
export async function apiPost<T = any>(path: string, body?: any, token?: string): Promise<T> {
  const url = getApiUrl(path);
  const headers = buildHeaders(token);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  // Some endpoints (e.g. 204 No Content) may not return a body
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

/**
 * Send a PUT request.
 */
export async function apiPut<T = any>(path: string, body?: any, token?: string): Promise<T> {
  const url = getApiUrl(path);
  const headers = buildHeaders(token);

  const response = await fetch(url, {
    method: 'PUT',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

/**
 * Send a PATCH request.
 */
export async function apiPatch<T = any>(path: string, body?: any, token?: string): Promise<T> {
  const url = getApiUrl(path);
  const headers = buildHeaders(token);

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

/**
 * Send a DELETE request.
 */
export async function apiDelete<T = any>(path: string, token?: string): Promise<T> {
  const url = getApiUrl(path);
  const headers = buildHeaders(token);

  const response = await fetch(url, { method: 'DELETE', headers });

  if (!response.ok) {
    await handleErrorResponse(response);
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

// ---------------------------------------------------------------------------
// Domain‑specific API objects
// ---------------------------------------------------------------------------

// ---- Auth ----

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: any;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiPost<AuthTokens>('/auth/login', { email, password }),

  register: (data: { firstName: string; lastName: string; email: string; password: string; [key: string]: any }) =>
    apiPost<AuthTokens>('/auth/register', data),

  refresh: (refreshToken: string) =>
    apiPost<{ accessToken: string }>('/auth/refresh', { refreshToken }),

  me: (token: string) =>
    apiGet<any>('/auth/me', token),
};

// ---- Requests ----

interface RequestsListParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  city?: string;
  status?: string;
  search?: string;
  sort?: string;
}

export const requestsApi = {
  list: (params?: RequestsListParams) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/requests${query}`);
  },

  getById: (id: string) =>
    apiGet<any>(`/requests/${id}`),

  create: (data: Record<string, any>, token: string) =>
    apiPost<any>('/requests', data, token),

  update: (id: string, data: Record<string, any>, token: string) =>
    apiPut<any>(`/requests/${id}`, data, token),

  delete: (id: string, token: string) =>
    apiDelete<any>(`/requests/${id}`, token),
};

// ---- Proposals ----

export const proposalsApi = {
  list: (requestId: string, params?: Record<string, string>) => {
    const query = params ? `&${new URLSearchParams(params).toString()}` : '';
    return apiGet<any>(`/proposals?requestId=${requestId}${query}`);
  },

  create: (data: { requestId: string; price: number; deliveryTime?: number; deliveryUnit?: string; message: string }, token: string) =>
    apiPost<any>('/proposals', data, token),

  updateStatus: (id: string, status: string, token: string) =>
    apiPatch<any>(`/proposals/${id}`, { status }, token),
};

// ---- Specialists ----

interface SpecialistsListParams {
  page?: number;
  limit?: number;
  sort?: string;
  categoryId?: string;
  city?: string;
  search?: string;
  minRating?: number;
}

export const specialistsApi = {
  list: (params?: SpecialistsListParams) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/specialists${query}`);
  },

  getById: (id: string) =>
    apiGet<any>(`/specialists/${id}`),

  reviews: (id: string, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiGet<any>(`/specialists/${id}/reviews${query}`);
  },
};

// ---- Categories ----

export const categoriesApi = {
  list: () =>
    apiGet<any>('/categories'),

  popular: () =>
    apiGet<any>('/categories/popular'),
};

// ---- Chat ----

export const chatApi = {
  conversations: (token: string) =>
    apiGet<any>('/chat/conversations', token),

  createConversation: (data: { requestId: string; specialistId?: string }, token: string) =>
    apiPost<any>('/chat/conversations', data, token),

  messages: (conversationId: string, token: string, params?: { page?: number; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/chat/conversations/${conversationId}/messages${query}`, token);
  },

  sendMessage: (conversationId: string, data: { content: string; type?: string }, token: string) =>
    apiPost<any>(`/chat/conversations/${conversationId}/messages`, data, token),

  markRead: (conversationId: string, token: string) =>
    apiPut<any>(`/chat/conversations/${conversationId}/read`, {}, token),
};

// ---- Notifications ----

export const notificationsApi = {
  list: (token: string, params?: { page?: number; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/notifications${query}`, token);
  },

  unreadCount: (token: string) =>
    apiGet<{ count: number }>('/notifications/unread-count', token),

  markRead: (id: string, token: string) =>
    apiPut<any>(`/notifications/${id}/read`, {}, token),

  markAllRead: (token: string) =>
    apiPut<any>('/notifications/read-all', {}, token),

  preferences: (token: string) =>
    apiGet<any>('/notifications/preferences', token),

  updatePreferences: (data: Record<string, any>, token: string) =>
    apiPut<any>('/notifications/preferences', data, token),
};

// ---- Wallet ----

export const walletApi = {
  balance: (token: string) =>
    apiGet<any>('/wallet', token),

  transactions: (token: string, params?: { page?: number; limit?: number; type?: string }) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/wallet/transactions${query}`, token);
  },

  deposit: (data: { amount: number; gateway?: string }, token: string) =>
    apiPost<any>('/wallet/deposit', data, token),

  withdraw: (data: { amount: string; destination: string }, token: string) =>
    apiPost<any>('/wallet/withdraw', data, token),
};

// ---- Dashboard ----

export const dashboardApi = {
  stats: (token: string) =>
    apiGet<any>('/dashboard', token),
};

// ---- Bookmarks ----

export const bookmarksApi = {
  list: (token: string) =>
    apiGet<any>('/bookmarks', token),

  toggle: (data: { type: string; targetId: string }, token: string) =>
    apiPost<any>('/bookmarks/toggle', data, token),

  check: (type: string, targetId: string, token: string) =>
    apiGet<{ isBookmarked: boolean }>(`/bookmarks/check/${type}/${targetId}`, token),
};

// ---- Search ----

export const searchApi = {
  search: (params: { q: string; page?: number; limit?: number; type?: string; categoryId?: string; city?: string }) =>
    apiGet<any>(`/search?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}`),

  suggestions: (query: string) =>
    apiGet<any>(`/search/suggestions?q=${encodeURIComponent(query)}`),

  popular: () =>
    apiGet<any>('/search/popular'),
};

// ---- Reviews ----

export const reviewsApi = {
  create: (data: { targetUserId: string; proposalId: string; rating: number; comment: string }, token: string) =>
    apiPost<any>('/reviews', data, token),

  list: (specialistId: string, params?: { page?: number; limit?: number }) => {
    const query = params ? `?${new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]),
    ).toString()}` : '';
    return apiGet<any>(`/reviews/${specialistId}${query}`);
  },
};

// ---- Profile ----

export const profileApi = {
  get: (token: string) =>
    apiGet<any>('/profile', token),

  update: (data: Record<string, any>, token: string) =>
    apiPut<any>('/profile', data, token),

  uploadAvatar: (formData: FormData, token: string) => {
    const url = getApiUrl('/profile/avatar');
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (res) => {
      if (!res.ok) await handleErrorResponse(res);
      return res.json();
    });
  },
};
