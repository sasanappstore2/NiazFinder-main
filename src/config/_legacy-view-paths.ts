/**
 * @internal
 * Legacy AppView-key → canonical path. Migration shim only.
 * New code MUST use `routeBuilder` instead.
 *
 * Detail keys (request-detail, specialist-profile, submit-proposal) need the
 * id parameter and are NOT covered here — they MUST be routed via
 * `legacyViewToPath()` in `routes.ts` or directly via `routeBuilder`.
 */
export const LEGACY_VIEW_PATHS: Record<string, string> = {
  home: '/',
  login: '/login',
  register: '/register',
  'post-need': '/post',
  'browse-requests': '/s/iran?type=need',
  'browse-specialists': '/s/iran?type=business',
  dashboard: '/dashboard',
  messages: '/chat',
  notifications: '/notifications',
  admin: '/admin',
  profile: '/dashboard',
  pricing: '/pricing',
  'compare-specialists': '/compare',
  'submit-review': '/submit-review',
  referral: '/referral',
  'notification-settings': '/notification-settings',
  help: '/help',
};
