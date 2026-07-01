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
  'post-need': '/',
  'browse-requests': '/n/iran',
  'browse-specialists': '/b/iran',
  dashboard: '/workspace',
  workspace: '/workspace',
  messages: '/chat',
  notifications: '/notifications',
  bookmarks: '/bookmarks',
  admin: '/admin',
  profile: '/profile',
  pricing: '/pricing',
  'submit-review': '/submit-review',
  referral: '/referral',
  'notification-settings': '/notification-settings',
  help: '/help',
};
