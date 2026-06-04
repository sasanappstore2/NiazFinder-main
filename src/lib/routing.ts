/**
 * @deprecated Migration shim — use `@/config/routes` (`routeBuilder`) instead.
 *
 * Kept temporarily so legacy callers (`buildUrl`, `ROUTE_MAP`) keep compiling.
 * Internally everything now resolves to canonical `/browse`, `/n/{id}`, `/b/{id}`.
 */
export {
  routeBuilder,
  LEGACY_VIEW_PATHS,
  legacyViewToPath,
  ROUTES,
  buildRoute,
  type RouteKey,
} from '@/config/routes';

import { routeBuilder } from '@/config/routes';

/** @deprecated */
export const ROUTE_MAP = {
  home: '/',
  'social-feed': '/social-feed',
  discover: '/discover',
  'browse-requests': '/browse?type=need',
  'browse-specialists': '/browse?type=business',
  'post-need': '/post',
  messages: '/chat',
  notifications: '/notifications',
  dashboard: '/dashboard',
  profile: '/dashboard',
  admin: '/admin',
  'admin-users': '/admin/users',
  'user-profile': '/profile/[id]',
  'edit-profile': '/edit-profile',
  'create-post': '/create-post',
  'post-detail': '/post/[id]',
  'request-detail': '/n/[id]',
  'specialist-profile': '/b/[id]',
  'submit-proposal': '/n/[id]/propose',
  'submit-review': '/submit-review',
  pricing: '/pricing',
  referral: '/referral',
  'notification-settings': '/notification-settings',
  search: '/search',
} as const;

export type LegacyRouteKey = keyof typeof ROUTE_MAP;

/** @deprecated Use routeBuilder */
export function buildUrl(route: LegacyRouteKey, params?: Record<string, string>): string {
  if (route === 'request-detail' && params?.id) return routeBuilder.need(params.id);
  if (route === 'specialist-profile' && params?.id) return routeBuilder.business(params.id);
  if (route === 'browse-requests') {
    return routeBuilder.browseAll({ type: 'need', q: params?.search });
  }
  if (route === 'browse-specialists') {
    return routeBuilder.browseAll({ type: 'business', q: params?.search });
  }
  let url: string = String(ROUTE_MAP[route] ?? '/');
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`[${key}]`, encodeURIComponent(String(value)));
    }
  }
  return url;
}
