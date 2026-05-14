/**
 * Route definitions for the application.
 * Maps old SPA view names to new Next.js App Router URLs.
 */

// Route map for backward compatibility
export const ROUTE_MAP = {
  home: '/',
  'social-feed': '/social-feed',
  discover: '/discover',
  'browse-requests': '/browse-requests',
  'browse-specialists': '/browse-specialists',
  'post-need': '/post-need',
  messages: '/messages',
  notifications: '/notifications',
  dashboard: '/dashboard',
  profile: '/dashboard',
  admin: '/admin',
  'admin-users': '/admin/users',
  'user-profile': '/profile/[id]',
  'edit-profile': '/edit-profile',
  'create-post': '/create-post',
  'post-detail': '/post/[id]',
  'request-detail': '/request/[id]',
  'specialist-profile': '/specialist/[id]',
  'submit-proposal': '/request/[id]',
  'submit-review': '/submit-review',
  'compare-specialists': '/compare-specialists',
  pricing: '/pricing',
  referral: '/referral',
  'notification-settings': '/notification-settings',
  search: '/search',
} as const;

export type RouteKey = keyof typeof ROUTE_MAP;

/**
 * Build a URL from a route key and optional params
 */
export function buildUrl(route: RouteKey, params?: Record<string, string>): string {
  let url = ROUTE_MAP[route];
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`[${key}]`, encodeURIComponent(value));
    }
  }
  return url;
}
